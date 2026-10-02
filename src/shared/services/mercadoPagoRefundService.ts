import { supabase } from './lib/supabase';

/**
 * Reembolsos pela função refund-mercadopago-payment. O estorno acontece no
 * Mercado Pago primeiro; o pedido só é marcado no sistema com o que o MP
 * confirmar.
 */

export type RefundAction = 'refund' | 'register' | 'undo';

export interface RefundResult {
  ok: boolean;
  refunded_amount?: number;
  total?: boolean;
  already?: boolean;
  refund_id?: number | string | null;
}

/** Pedido pago pelo Mercado Pago (tem id de pagamento do MP). */
export const isMercadoPagoOrder = (order: { stripe_session_id?: string | null; payment_method?: string | null }) =>
  /^\d+$/.test(String(order.stripe_session_id || '')) && order.payment_method !== 'pix_chave';

export const runOrderRefund = async (params: {
  orderId: string;
  action: RefundAction;
  amount?: number | null;
  reason?: string | null;
}): Promise<RefundResult> => {
  const { data, error } = await supabase.functions.invoke('refund-mercadopago-payment', {
    body: {
      order_id: params.orderId,
      action: params.action,
      amount: params.amount ?? null,
      reason: params.reason ?? null,
    },
  });

  if (error) {
    // A função responde com a mensagem em JSON mesmo nos erros
    let message = 'Não foi possível concluir o reembolso.';
    try {
      const body = await (error as any).context?.json?.();
      if (body?.message) message = body.message;
    } catch { /* resposta sem corpo */ }
    throw new Error(message);
  }
  if (!data?.ok) throw new Error(data?.message || 'Não foi possível concluir o reembolso.');
  return data as RefundResult;
};
