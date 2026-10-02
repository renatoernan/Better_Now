-- 044_event_payouts.sql
-- Controle de repasses dos eventos.
--
-- Regra de negócio:
--   Bruto pago pelo cliente = valor dos ingressos + taxa de conveniência + juros de parcelamento
--   Taxa de conveniência    = % da forma de pagamento sobre o valor dos ingressos
--   Repasse devido          = valor dos ingressos − taxa assumida pelo organizador
--   Lucro líquido           = conveniência total + juros − taxa do Mercado Pago
--     (conveniência total = a cobrada do cliente + a assumida pelo organizador;
--      na Pré-Venda do Halloween 2026 a Better Now assumiu os 3%)
--     (os juros são pagos pelo cliente e cobrem o custo de parcelamento do MP;
--      Pix por chave própria não tem taxa de gateway)
--   Conferência             = bruto − taxa do MP = líquido recebido = repasse + lucro
--
-- Até aqui convenience_fee guardava três coisas diferentes conforme quem
-- escrevia por último: a conveniência do checkout, a taxa real do MP (webhook)
-- ou uma taxa estimada do MP (tela de pedidos). As grandezas agora têm colunas
-- próprias, e o valor antigo fica preservado em convenience_fee_legacy.

-- ---------------------------------------------------------------------------
-- 1. Colunas financeiras do pedido
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_event_orders
  ADD COLUMN IF NOT EXISTS tickets_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS installment_interest NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installments INTEGER,
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_financing_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_net_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_fee_details JSONB,
  ADD COLUMN IF NOT EXISTS gateway_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS money_release_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS money_release_status TEXT,
  ADD COLUMN IF NOT EXISTS fee_source TEXT,
  ADD COLUMN IF NOT EXISTS convenience_fee_legacy NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS organizer_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organizer_fee_percentage NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.app_event_orders.tickets_amount IS
  'Valor dos ingressos (preço × quantidade − cupom). É o repasse devido ao organizador.';
COMMENT ON COLUMN public.app_event_orders.installment_interest IS
  'Juros de parcelamento pagos pelo cliente. Não entram na conveniência nem no repasse.';
COMMENT ON COLUMN public.app_event_orders.gateway_fee IS
  'Taxa total cobrada pelo Mercado Pago do vendedor (fee_details), inclusive financiamento.';
COMMENT ON COLUMN public.app_event_orders.fee_source IS
  'Origem dos valores financeiros: checkout (gravado na compra) ou reconstruida (backfill da 044).';
COMMENT ON COLUMN public.app_event_orders.organizer_fee IS
  'Parte da conveniência paga pelo organizador (descontada do repasse), quando o cliente não pagou taxa por fora.';
COMMENT ON COLUMN public.app_event_orders.convenience_fee_legacy IS
  'Valor que estava em convenience_fee antes da 044, preservado para auditoria.';

-- ---------------------------------------------------------------------------
-- 2. Reconstrução do histórico
--    Valor dos ingressos sai do lote do pedido (preço × quantidade − cupom), e a
--    conveniência da taxa configurada para a forma de pagamento — a mesma busca
--    que o checkout faz. O que sobrar no bruto são juros de parcelamento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_jsonb(p TEXT)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN p::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  r RECORD;
  cfg JSONB;
  batch JSONB;
  methods JSONB;
  rate NUMERIC;
  unit_price NUMERIC;
  tickets NUMERIC;
  conv NUMERIC;
  interest NUMERIC;
BEGIN
  FOR r IN
    SELECT o.*, e.observations
      FROM public.app_event_orders o
      JOIN public.app_events e ON e.id = o.event_id
     WHERE o.tickets_amount IS NULL
       AND COALESCE(o.amount_total, 0) > 0
       AND o.status IN ('paid', 'approved', 'refunded')
  LOOP
    cfg := public.safe_jsonb(r.observations);
    batch := cfg -> 'price_batches' -> COALESCE(r.batch_index, 0);

    methods := CASE
      WHEN (batch ->> 'use_custom_payment_methods')::boolean IS TRUE
           AND jsonb_typeof(batch -> 'payment_methods') = 'array'
           AND jsonb_array_length(batch -> 'payment_methods') > 0
        THEN batch -> 'payment_methods'
      ELSE cfg -> 'payment_methods'
    END;

    -- Mesma correspondência do checkout: 'pix' casa com pix_stripe ou pix_chave,
    -- valendo o primeiro da lista
    SELECT COALESCE((m.value ->> 'fee_percentage')::numeric, 0)
      INTO rate
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(methods) = 'array' THEN methods ELSE '[]'::jsonb END)
           WITH ORDINALITY AS m(value, idx)
     WHERE m.value ->> 'method' = r.payment_method
        OR (r.payment_method = 'pix' AND m.value ->> 'method' IN ('pix_stripe', 'pix_chave'))
     ORDER BY m.idx
     LIMIT 1;
    rate := GREATEST(COALESCE(rate, 0), 0);

    unit_price := NULLIF(batch ->> 'price', '')::numeric;

    IF unit_price IS NOT NULL AND unit_price > 0 THEN
      tickets := ROUND(unit_price * GREATEST(COALESCE(r.quantity, 1), 1) - COALESCE(r.discount_amount, 0), 2);
      conv := ROUND(tickets * rate / 100, 2);
      interest := ROUND(r.amount_total - tickets - conv, 2);

      -- Lote alterado depois da venda: o bruto não fecha com o preço atual.
      -- Nesse caso confia no bruto e deriva os ingressos pela taxa.
      IF interest < 0 OR (r.payment_method <> 'credit_card' AND interest <> 0) THEN
        tickets := ROUND(r.amount_total / (1 + rate / 100), 2);
        conv := ROUND(r.amount_total - tickets, 2);
        interest := 0;
      END IF;
    ELSE
      tickets := ROUND(r.amount_total / (1 + rate / 100), 2);
      conv := ROUND(r.amount_total - tickets, 2);
      interest := 0;
    END IF;

    UPDATE public.app_event_orders
       SET convenience_fee_legacy = COALESCE(convenience_fee_legacy, convenience_fee),
           tickets_amount = tickets,
           convenience_fee = conv,
           convenience_fee_percentage = rate,
           installment_interest = GREATEST(interest, 0),
           fee_source = 'reconstruida'
     WHERE id = r.id;
  END LOOP;
END $$;

-- Pré-Venda do Halloween 2026: vendida sem taxa para o cliente, mas a Better
-- Now assumiu 3% de conveniência, descontados do repasse. Acordo pontual —
-- se outro lote precisar disso, vira campo no cadastro do lote.
UPDATE public.app_event_orders
   SET organizer_fee_percentage = 3,
       organizer_fee = ROUND(tickets_amount * 0.03, 2)
 WHERE event_id = '5bb8a2d1-ff90-4b8f-9045-b483bba72588'
   AND COALESCE(batch_index, 0) = 0
   AND tickets_amount IS NOT NULL
   AND organizer_fee = 0
   AND COALESCE(amount_total, 0) > 0
   AND status IN ('paid', 'approved', 'refunded');

-- ---------------------------------------------------------------------------
-- 3. Repasses
--    Um repasse agrupa pedidos (kind = 'payout'). A devolução de saldo negativo
--    pelo organizador é um lançamento sem pedidos (kind = 'return').
--    Nada é apagado: estorno marca voided_at e mantém a trilha.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_event_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'payout' CHECK (kind IN ('payout', 'return')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  reference TEXT,
  notes TEXT,
  proof_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payouts_event
  ON public.app_event_payouts (event_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS public.app_event_payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.app_event_payouts(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.app_event_orders(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at TIMESTAMPTZ
);

-- Um pedido só pode estar em um repasse válido. A trava real fica no banco.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payout_item_order_active
  ON public.app_event_payout_items (order_id)
  WHERE voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payout_items_payout
  ON public.app_event_payout_items (payout_id);

ALTER TABLE public.app_event_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_event_payout_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_admin_read" ON public.app_event_payouts;
CREATE POLICY "payouts_admin_read" ON public.app_event_payouts
  FOR SELECT TO authenticated USING (public.is_mural_admin());

DROP POLICY IF EXISTS "payout_items_admin_read" ON public.app_event_payout_items;
CREATE POLICY "payout_items_admin_read" ON public.app_event_payout_items
  FOR SELECT TO authenticated USING (public.is_mural_admin());

-- Escrita só pelas funções abaixo, que validam e gravam de forma atômica
REVOKE ALL ON public.app_event_payouts FROM anon;
REVOKE ALL ON public.app_event_payout_items FROM anon;
GRANT SELECT ON public.app_event_payouts TO authenticated;
GRANT SELECT ON public.app_event_payout_items TO authenticated;
GRANT ALL PRIVILEGES ON public.app_event_payouts TO service_role;
GRANT ALL PRIVILEGES ON public.app_event_payout_items TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Visão financeira por pedido — fonte única das fórmulas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.app_event_order_financials
WITH (security_invoker = true) AS
WITH active_items AS (
  SELECT i.order_id, i.payout_id, i.amount, p.paid_at
    FROM public.app_event_payout_items i
    JOIN public.app_event_payouts p ON p.id = i.payout_id
   WHERE i.voided_at IS NULL AND p.voided_at IS NULL
),
base AS (
  SELECT
    o.*,
    (o.status IN ('paid', 'approved')) AS is_paid,
    (o.status = 'refunded' OR o.refunded_at IS NOT NULL) AS is_refunded,
    ROUND(COALESCE(o.amount_total, 0), 2) AS gross,
    ROUND(COALESCE(o.installment_interest, 0), 2) AS interest,
    ROUND(COALESCE(
      o.tickets_amount,
      COALESCE(o.amount_total, 0) - COALESCE(o.installment_interest, 0) - COALESCE(o.convenience_fee, 0)
    ), 2) AS tickets,
    CASE WHEN o.payment_method = 'pix_chave' THEN 0
         ELSE ROUND(COALESCE(o.gateway_fee, 0), 2) END AS mp_fee,
    ROUND(COALESCE(o.organizer_fee, 0), 2) AS org_fee
  FROM public.app_event_orders o
)
SELECT
  b.id AS order_id,
  b.event_id,
  b.created_at,
  b.client_name,
  b.client_email,
  b.payment_method,
  b.status,
  b.quantity,
  b.batch_name,
  b.coupon_code,
  b.installments,
  b.is_paid,
  b.is_refunded,
  b.gross AS gross_amount,
  b.tickets AS tickets_amount,
  ROUND(b.gross - b.interest - b.tickets + b.org_fee, 2) AS convenience_fee,
  COALESCE(b.convenience_fee_percentage, 0) AS convenience_fee_percentage,
  b.interest AS installment_interest,
  b.mp_fee AS gateway_fee,
  (b.payment_method <> 'pix_chave' AND b.gateway_fee IS NULL) AS gateway_fee_missing,
  ROUND(b.gross - b.mp_fee, 2) AS net_received,
  b.gateway_net_amount,
  CASE WHEN b.is_paid AND NOT b.is_refunded THEN ROUND(b.tickets - b.org_fee, 2) ELSE 0 END AS payout_due,
  CASE WHEN b.is_paid AND NOT b.is_refunded
       THEN ROUND((b.gross - b.interest - b.tickets + b.org_fee) + b.interest - b.mp_fee, 2)
       ELSE 0 END AS net_profit,
  b.money_release_date,
  b.money_release_status,
  b.fee_source,
  ai.payout_id,
  ai.paid_at AS payout_paid_at,
  COALESCE(ai.amount, 0) AS paid_out_amount,
  CASE
    WHEN ai.payout_id IS NOT NULL AND b.is_refunded THEN 'estornado_apos_repasse'
    WHEN ai.payout_id IS NOT NULL THEN 'repassado'
    WHEN b.is_refunded THEN 'estornado'
    WHEN b.payment_method <> 'pix_chave'
         AND b.money_release_date IS NOT NULL
         AND b.money_release_date > NOW() THEN 'a_liberar'
    ELSE 'pendente'
  END AS payout_status,
  b.org_fee AS organizer_fee,
  ROUND(b.gross - b.interest - b.tickets, 2) AS client_convenience_fee,
  CASE WHEN b.org_fee > 0 THEN COALESCE(b.organizer_fee_percentage, 0)
       ELSE COALESCE(b.convenience_fee_percentage, 0) END AS fee_percentage_total
FROM base b
LEFT JOIN active_items ai ON ai.order_id = b.id
WHERE b.gross > 0
  AND (b.status IN ('paid', 'approved', 'refunded') OR ai.payout_id IS NOT NULL);

GRANT SELECT ON public.app_event_order_financials TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Resumo por evento
--    Saldo = repasse devido − repassado + devolvido. Negativo quando houve
--    estorno de pedido já repassado: é o organizador quem deve à plataforma.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.app_event_payout_summary
WITH (security_invoker = true) AS
WITH orders AS (
  SELECT
    event_id,
    COUNT(*) FILTER (WHERE is_paid AND NOT is_refunded) AS paid_orders,
    COUNT(*) FILTER (WHERE is_refunded) AS refunded_orders,
    COALESCE(SUM(gross_amount) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS gross_amount,
    COALESCE(SUM(tickets_amount) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS tickets_amount,
    COALESCE(SUM(convenience_fee) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS convenience_fee,
    COALESCE(SUM(installment_interest) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS installment_interest,
    COALESCE(SUM(gateway_fee) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS gateway_fee,
    COALESCE(SUM(net_profit), 0) AS net_profit,
    COALESCE(SUM(payout_due), 0) AS payout_due,
    COALESCE(SUM(payout_due) FILTER (WHERE payout_status = 'pendente'), 0) AS pending_released,
    COALESCE(SUM(payout_due) FILTER (WHERE payout_status = 'a_liberar'), 0) AS pending_unreleased,
    COALESCE(SUM(paid_out_amount) FILTER (WHERE payout_status = 'estornado_apos_repasse'), 0) AS refunded_after_payout,
    COUNT(*) FILTER (WHERE gateway_fee_missing AND is_paid) AS missing_gateway_fees,
    COALESCE(SUM(organizer_fee) FILTER (WHERE is_paid AND NOT is_refunded), 0) AS organizer_fee
  FROM public.app_event_order_financials
  GROUP BY event_id
),
payouts AS (
  SELECT
    event_id,
    COALESCE(SUM(amount) FILTER (WHERE kind = 'payout'), 0) AS paid_out,
    COALESCE(SUM(amount) FILTER (WHERE kind = 'return'), 0) AS returned,
    MAX(paid_at) AS last_payout_at
  FROM public.app_event_payouts
  WHERE voided_at IS NULL
  GROUP BY event_id
)
SELECT
  COALESCE(o.event_id, p.event_id) AS event_id,
  e.title AS event_title,
  e.event_date,
  COALESCE(o.paid_orders, 0) AS paid_orders,
  COALESCE(o.refunded_orders, 0) AS refunded_orders,
  ROUND(COALESCE(o.gross_amount, 0), 2) AS gross_amount,
  ROUND(COALESCE(o.tickets_amount, 0), 2) AS tickets_amount,
  ROUND(COALESCE(o.convenience_fee, 0), 2) AS convenience_fee,
  ROUND(COALESCE(o.installment_interest, 0), 2) AS installment_interest,
  ROUND(COALESCE(o.gateway_fee, 0), 2) AS gateway_fee,
  ROUND(COALESCE(o.net_profit, 0), 2) AS net_profit,
  ROUND(COALESCE(o.payout_due, 0), 2) AS payout_due,
  ROUND(COALESCE(p.paid_out, 0), 2) AS paid_out,
  ROUND(COALESCE(p.returned, 0), 2) AS returned,
  ROUND(COALESCE(o.pending_released, 0), 2) AS pending_released,
  ROUND(COALESCE(o.pending_unreleased, 0), 2) AS pending_unreleased,
  ROUND(COALESCE(o.refunded_after_payout, 0), 2) AS refunded_after_payout,
  ROUND(COALESCE(o.payout_due, 0) - COALESCE(p.paid_out, 0) + COALESCE(p.returned, 0), 2) AS balance,
  COALESCE(o.missing_gateway_fees, 0) AS missing_gateway_fees,
  p.last_payout_at,
  ROUND(COALESCE(o.organizer_fee, 0), 2) AS organizer_fee
FROM orders o
FULL OUTER JOIN payouts p ON p.event_id = o.event_id
LEFT JOIN public.app_events e ON e.id = COALESCE(o.event_id, p.event_id);

GRANT SELECT ON public.app_event_payout_summary TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Operações (atômicas, só administradores)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_event_payout(
  p_event_id UUID,
  p_order_ids UUID[],
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_method TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_total NUMERIC;
  v_valid INTEGER;
  v_requested INTEGER;
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar repasses.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(DISTINCT x) INTO v_requested FROM unnest(p_order_ids) AS x;
  IF COALESCE(v_requested, 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um pedido para repassar.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(f.payout_due), 0)
    INTO v_valid, v_total
    FROM public.app_event_order_financials f
   WHERE f.order_id = ANY(p_order_ids)
     AND f.event_id = p_event_id
     AND f.is_paid AND NOT f.is_refunded
     AND f.payout_id IS NULL;

  IF v_valid <> v_requested THEN
    RAISE EXCEPTION 'A seleção tem pedidos já repassados, estornados, não pagos ou de outro evento. Atualize a lista e tente de novo.';
  END IF;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'O valor do repasse precisa ser maior que zero.';
  END IF;

  INSERT INTO public.app_event_payouts
    (event_id, kind, amount, paid_at, method, reference, notes, proof_url, created_by)
  VALUES
    (p_event_id, 'payout', v_total, COALESCE(p_paid_at, CURRENT_DATE),
     NULLIF(TRIM(p_method), ''), NULLIF(TRIM(p_reference), ''), NULLIF(TRIM(p_notes), ''),
     NULLIF(TRIM(p_proof_url), ''), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.app_event_payout_items (payout_id, order_id, amount)
  SELECT v_id, f.order_id, f.payout_due
    FROM public.app_event_order_financials f
   WHERE f.order_id = ANY(p_order_ids);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_event_payout_return(
  p_event_id UUID,
  p_amount NUMERIC,
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_method TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar devoluções.' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe um valor de devolução maior que zero.';
  END IF;

  INSERT INTO public.app_event_payouts
    (event_id, kind, amount, paid_at, method, reference, notes, proof_url, created_by)
  VALUES
    (p_event_id, 'return', ROUND(p_amount, 2), COALESCE(p_paid_at, CURRENT_DATE),
     NULLIF(TRIM(p_method), ''), NULLIF(TRIM(p_reference), ''), NULLIF(TRIM(p_notes), ''),
     NULLIF(TRIM(p_proof_url), ''), auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_event_payout(
  p_payout_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_mural_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem estornar repasses.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.app_event_payouts
     SET voided_at = NOW(), voided_by = auth.uid(), voided_reason = NULLIF(TRIM(p_reason), '')
   WHERE id = p_payout_id AND voided_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repasse não encontrado ou já estornado.';
  END IF;

  -- Os pedidos voltam a ficar pendentes de repasse
  UPDATE public.app_event_payout_items
     SET voided_at = NOW()
   WHERE payout_id = p_payout_id AND voided_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.register_event_payout(UUID, UUID[], DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_event_payout_return(UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_event_payout(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_event_payout(UUID, UUID[], DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_event_payout_return(UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_event_payout(UUID, TEXT) TO authenticated;
