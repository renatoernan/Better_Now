-- 048_partial_refund_payout.sql
-- Reembolso parcial mantém o repasse, com o valor definido no reembolso.
--
-- Até aqui qualquer pedido com refunded_at contava como estornado: repasse 0 e
-- status "estornado", mesmo quando o comprador recebeu só parte do valor e o
-- pedido segue pago. Agora:
--
--   reembolso parcial = pedido pago, refunded_at preenchido e refund_amount
--                       menor que o bruto
--   repasse devido    = refund_payout_amount, informado por quem registra o
--                       reembolso. Não há fórmula: quem absorve a conveniência
--                       devolvida varia caso a caso (#205EDEAB devolveu ingresso
--                       + conveniência e repassa 308,00; #AC8BA381 devolveu
--                       30,90 e também repassa 308,00). Sem valor informado,
--                       vale ingressos − taxa do organizador − reembolso.
--
-- O pedido parcial continua entrando nos totais de pagos e pode ser repassado.
-- Se o reembolso parcial vier depois do repasse, o status é
-- "estornado_apos_repasse" e o saldo do evento fica negativo pelo valor
-- reembolsado (o repasse devido cai, o repassado não).
--
-- Pré-requisito: 045_mercadopago_mirror.sql.

ALTER TABLE public.app_event_orders
  ADD COLUMN IF NOT EXISTS refund_payout_amount NUMERIC(12,2);

COMMENT ON COLUMN public.app_event_orders.refund_payout_amount IS
  'Repasse à organização definido no reembolso parcial. Nulo fora de reembolso parcial.';

-- Valores definidos pelo usuário em 14/10/2026
UPDATE public.app_event_orders SET refund_payout_amount = 308.00
 WHERE id IN ('205edeab-4a85-494c-accf-abf2a1059037', 'ac8ba381-d855-47b5-8b2c-25732aa90c01');

-- Colunas novas no fim da view (CREATE OR REPLACE só aceita acréscimo no final)
CREATE OR REPLACE VIEW public.app_event_order_financials
WITH (security_invoker = true) AS
WITH active_items AS (
  SELECT i.order_id, i.payout_id, i.amount, p.paid_at
    FROM public.app_event_payout_items i
    JOIN public.app_event_payouts p ON p.id = i.payout_id
   WHERE i.voided_at IS NULL AND p.voided_at IS NULL
),
raw AS (
  SELECT
    o.*,
    (o.status IN ('paid', 'approved')) AS is_paid,
    ROUND(COALESCE(o.amount_total, 0), 2) AS gross,
    ROUND(COALESCE(o.installment_interest, 0), 2) AS interest,
    ROUND(COALESCE(
      o.tickets_amount,
      COALESCE(o.amount_total, 0) - COALESCE(o.installment_interest, 0) - COALESCE(o.convenience_fee, 0)
    ), 2) AS tickets,
    CASE WHEN o.payment_method = 'pix_chave' THEN 0
         ELSE ROUND(COALESCE(o.gateway_fee, 0), 2) END AS mp_fee,
    ROUND(COALESCE(o.organizer_fee, 0), 2) AS org_fee,
    -- Reembolso sem valor gravado é o legado: vale como total
    CASE WHEN o.status = 'refunded' OR o.refunded_at IS NOT NULL
         THEN ROUND(COALESCE(o.refund_amount, o.amount_total, 0), 2)
         ELSE 0 END AS refunded
  FROM public.app_event_orders o
),
base AS (
  SELECT
    r.*,
    (r.is_paid AND r.refunded_at IS NOT NULL
      AND r.refunded > 0 AND r.refunded < r.gross - 0.01) AS is_partially_refunded
  FROM raw r
),
flags AS (
  SELECT
    b.*,
    ((b.status = 'refunded' OR b.refunded_at IS NOT NULL) AND NOT b.is_partially_refunded) AS is_refunded
  FROM base b
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
  CASE WHEN b.is_paid AND NOT b.is_refunded
       THEN CASE WHEN b.is_partially_refunded
                 THEN COALESCE(b.refund_payout_amount, GREATEST(ROUND(b.tickets - b.org_fee - b.refunded, 2), 0))
                 ELSE ROUND(b.tickets - b.org_fee, 2) END
       ELSE 0 END AS payout_due,
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
    WHEN ai.payout_id IS NOT NULL AND (b.is_refunded OR b.is_partially_refunded) THEN 'estornado_apos_repasse'
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
       ELSE COALESCE(b.convenience_fee_percentage, 0) END AS fee_percentage_total,
  -- Espelho do Mercado Pago (045): exatamente o que o MP informa
  b.stripe_session_id AS gateway_payment_id,
  b.gateway_status,
  b.gateway_status_detail,
  b.gateway_gross_amount,
  b.gateway_total_paid_amount,
  b.gateway_refunded_amount,
  b.gateway_approved_at,
  b.gateway_financing_fee,
  b.gateway_fee_details,
  b.gateway_synced_at,
  -- 048: reembolso parcial
  b.is_partially_refunded,
  b.refunded AS refund_amount,
  -- Repasse que o pedido teria sem o reembolso, para a tela mostrar a diferença
  CASE WHEN b.is_paid THEN ROUND(b.tickets - b.org_fee, 2) ELSE 0 END AS original_payout_due,
  (b.is_partially_refunded AND b.refund_payout_amount IS NULL) AS refund_payout_missing
FROM flags b
LEFT JOIN active_items ai ON ai.order_id = b.id
WHERE b.gross > 0
  AND (b.status IN ('paid', 'approved', 'refunded') OR ai.payout_id IS NOT NULL);

GRANT SELECT ON public.app_event_order_financials TO authenticated, service_role;

-- Estornado após repasse: no parcial, o que volta é o reembolso, não o repasse todo
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
    COALESCE(SUM(
      CASE WHEN is_partially_refunded THEN LEAST(refund_amount, paid_out_amount) ELSE paid_out_amount END
    ) FILTER (WHERE payout_status = 'estornado_apos_repasse'), 0) AS refunded_after_payout,
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
