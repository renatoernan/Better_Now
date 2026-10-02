-- 045_mercadopago_mirror.sql
-- Espelho dos valores do Mercado Pago em cada pedido.
--
-- Princípio: o que é do MP vem do MP, por sincronização, sem cálculo paralelo.
-- O sistema guarda o valor, o status, a tarifa, o líquido e os estornos exatamente
-- como o MP informa, e só compara com o próprio registro para explicar o que
-- foge do padrão (status divergente, financiamento cobrado do vendedor etc.).
--
-- Pré-requisito: 044_event_payouts.sql.

ALTER TABLE public.app_event_orders
  ADD COLUMN IF NOT EXISTS gateway_status TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status_detail TEXT,
  ADD COLUMN IF NOT EXISTS gateway_gross_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_total_paid_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_refunded_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gateway_approved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.app_event_orders.gateway_status IS
  'Status do pagamento no Mercado Pago (approved, refunded, cancelled, charged_back...).';
COMMENT ON COLUMN public.app_event_orders.gateway_gross_amount IS
  'transaction_amount do MP: valor da venda ("Recebimento" no relatório do MP).';
COMMENT ON COLUMN public.app_event_orders.gateway_total_paid_amount IS
  'total_paid_amount do MP: o que o comprador pagou, incluindo juros de parcelamento cobrados dele.';
COMMENT ON COLUMN public.app_event_orders.gateway_refunded_amount IS
  'transaction_amount_refunded do MP: total estornado ao comprador.';

-- Colunas novas no fim da view (CREATE OR REPLACE só aceita acréscimo no final)
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
  b.gateway_synced_at
FROM base b
LEFT JOIN active_items ai ON ai.order_id = b.id
WHERE b.gross > 0
  AND (b.status IN ('paid', 'approved', 'refunded') OR ai.payout_id IS NOT NULL);

GRANT SELECT ON public.app_event_order_financials TO authenticated, service_role;
