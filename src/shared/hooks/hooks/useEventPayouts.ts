import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';

/**
 * Controle de repasses. As fórmulas vivem no banco (views da migration 044) e
 * as escritas passam por funções que validam e gravam de forma atômica; aqui
 * só se lê e se chama essas funções.
 */

export type PayoutStatus = 'pendente' | 'a_liberar' | 'repassado' | 'estornado' | 'estornado_apos_repasse';

export interface OrderFinancial {
  order_id: string;
  event_id: string;
  created_at: string;
  client_name: string | null;
  client_email: string | null;
  payment_method: string | null;
  status: string;
  quantity: number;
  batch_name: string | null;
  coupon_code: string | null;
  installments: number | null;
  is_paid: boolean;
  is_refunded: boolean;
  gross_amount: number;
  tickets_amount: number;
  convenience_fee: number;
  convenience_fee_percentage: number;
  installment_interest: number;
  gateway_fee: number;
  gateway_fee_missing: boolean;
  net_received: number;
  gateway_net_amount: number | null;
  payout_due: number;
  net_profit: number;
  money_release_date: string | null;
  money_release_status: string | null;
  fee_source: string | null;
  payout_id: string | null;
  payout_paid_at: string | null;
  paid_out_amount: number;
  payout_status: PayoutStatus;
  /** Parte da conveniência assumida pelo organizador, descontada do repasse. */
  organizer_fee: number;
  client_convenience_fee: number;
  fee_percentage_total: number;
  // Espelho do Mercado Pago (migration 045): valores exatamente como o MP informa
  gateway_payment_id: string | null;
  gateway_status: string | null;
  gateway_status_detail: string | null;
  gateway_gross_amount: number | null;
  gateway_total_paid_amount: number | null;
  gateway_refunded_amount: number | null;
  gateway_approved_at: string | null;
  gateway_financing_fee: number | null;
  gateway_fee_details: { type?: string; amount?: number; fee_payer?: string }[] | null;
  gateway_synced_at: string | null;
}

export interface EventPayoutSummary {
  event_id: string;
  event_title: string | null;
  event_date: string | null;
  paid_orders: number;
  refunded_orders: number;
  gross_amount: number;
  tickets_amount: number;
  convenience_fee: number;
  installment_interest: number;
  gateway_fee: number;
  net_profit: number;
  payout_due: number;
  paid_out: number;
  returned: number;
  pending_released: number;
  pending_unreleased: number;
  refunded_after_payout: number;
  balance: number;
  missing_gateway_fees: number;
  last_payout_at: string | null;
  organizer_fee: number;
}

export interface EventPayout {
  id: string;
  event_id: string;
  kind: 'payout' | 'return';
  amount: number;
  paid_at: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  proof_url: string | null;
  created_at: string;
  voided_at: string | null;
  voided_reason: string | null;
  items?: { order_id: string; amount: number; voided_at: string | null }[];
}

export interface PayoutInput {
  paidAt: string;
  method?: string;
  reference?: string;
  notes?: string;
  proofFile?: File | null;
}

const num = (v: unknown) => Number(v) || 0;
const optNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const normalizeSummary = (r: any): EventPayoutSummary => ({
  ...r,
  gross_amount: num(r.gross_amount),
  tickets_amount: num(r.tickets_amount),
  convenience_fee: num(r.convenience_fee),
  installment_interest: num(r.installment_interest),
  gateway_fee: num(r.gateway_fee),
  net_profit: num(r.net_profit),
  payout_due: num(r.payout_due),
  paid_out: num(r.paid_out),
  returned: num(r.returned),
  pending_released: num(r.pending_released),
  pending_unreleased: num(r.pending_unreleased),
  refunded_after_payout: num(r.refunded_after_payout),
  balance: num(r.balance),
  organizer_fee: num(r.organizer_fee),
});

const normalizeOrder = (r: any): OrderFinancial => ({
  ...r,
  gross_amount: num(r.gross_amount),
  tickets_amount: num(r.tickets_amount),
  convenience_fee: num(r.convenience_fee),
  convenience_fee_percentage: num(r.convenience_fee_percentage),
  installment_interest: num(r.installment_interest),
  gateway_fee: num(r.gateway_fee),
  net_received: num(r.net_received),
  payout_due: num(r.payout_due),
  net_profit: num(r.net_profit),
  paid_out_amount: num(r.paid_out_amount),
  organizer_fee: num(r.organizer_fee),
  client_convenience_fee: num(r.client_convenience_fee),
  fee_percentage_total: num(r.fee_percentage_total),
  // Nulo continua nulo: "não sincronizado" não pode virar zero
  gateway_net_amount: optNum(r.gateway_net_amount),
  gateway_gross_amount: optNum(r.gateway_gross_amount),
  gateway_total_paid_amount: optNum(r.gateway_total_paid_amount),
  gateway_refunded_amount: optNum(r.gateway_refunded_amount),
  gateway_financing_fee: optNum(r.gateway_financing_fee),
});

/** Comprovante de repasse no mesmo bucket dos eventos, em pasta própria. */
const uploadProof = async (eventId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `payout-proofs/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('events').upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Não foi possível enviar o comprovante: ${error.message}`);
  return supabase.storage.from('events').getPublicUrl(path).data.publicUrl;
};

export const useEventPayouts = (eventId: string | null) => {
  const [summaries, setSummaries] = useState<EventPayoutSummary[]>([]);
  const [orders, setOrders] = useState<OrderFinancial[]>([]);
  const [payouts, setPayouts] = useState<EventPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('app_event_payout_summary')
      .select('*')
      .order('event_date', { ascending: false, nullsFirst: false });
    if (err) throw err;
    setSummaries((data || []).map(normalizeSummary));
  }, []);

  const fetchEventDetail = useCallback(async () => {
    if (!eventId) {
      setOrders([]);
      setPayouts([]);
      return;
    }

    const [ordersRes, payoutsRes] = await Promise.all([
      supabase
        .from('app_event_order_financials')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
      supabase
        .from('app_event_payouts')
        .select('*, items:app_event_payout_items(order_id, amount, voided_at)')
        .eq('event_id', eventId)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (payoutsRes.error) throw payoutsRes.error;

    setOrders((ordersRes.data || []).map(normalizeOrder));
    setPayouts((payoutsRes.data || []).map((p: any) => ({ ...p, amount: num(p.amount) })));
  }, [eventId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSummaries(), fetchEventDetail()]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o financeiro.');
    } finally {
      setLoading(false);
    }
  }, [fetchSummaries, fetchEventDetail]);

  useEffect(() => { refresh(); }, [refresh]);

  const registerPayout = useCallback(async (orderIds: string[], input: PayoutInput) => {
    if (!eventId) throw new Error('Selecione um evento.');
    const proofUrl = input.proofFile ? await uploadProof(eventId, input.proofFile) : null;

    const { error: err } = await supabase.rpc('register_event_payout', {
      p_event_id: eventId,
      p_order_ids: orderIds,
      p_paid_at: input.paidAt,
      p_method: input.method || null,
      p_reference: input.reference || null,
      p_notes: input.notes || null,
      p_proof_url: proofUrl,
    });
    if (err) throw new Error(err.message);
    await refresh();
  }, [eventId, refresh]);

  const registerReturn = useCallback(async (amount: number, input: PayoutInput) => {
    if (!eventId) throw new Error('Selecione um evento.');
    const proofUrl = input.proofFile ? await uploadProof(eventId, input.proofFile) : null;

    const { error: err } = await supabase.rpc('register_event_payout_return', {
      p_event_id: eventId,
      p_amount: amount,
      p_paid_at: input.paidAt,
      p_method: input.method || null,
      p_reference: input.reference || null,
      p_notes: input.notes || null,
      p_proof_url: proofUrl,
    });
    if (err) throw new Error(err.message);
    await refresh();
  }, [eventId, refresh]);

  const voidPayout = useCallback(async (payoutId: string, reason?: string) => {
    const { error: err } = await supabase.rpc('void_event_payout', {
      p_payout_id: payoutId,
      p_reason: reason || null,
    });
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  /** Busca no Mercado Pago a taxa real e a liberação do dinheiro de cada pedido. */
  const syncGatewayFees = useCallback(async (): Promise<{ synced: number; total: number; failed: string[] }> => {
    if (!eventId) throw new Error('Selecione um evento.');
    const { data, error: err } = await supabase.functions.invoke('sync-order-financials', {
      body: { event_id: eventId },
    });
    if (err) throw new Error(err.message);
    if (!data?.ok) throw new Error(data?.message || 'Falha na sincronização.');
    await refresh();
    return { synced: data.synced, total: data.total, failed: data.failed || [] };
  }, [eventId, refresh]);

  return {
    summaries, orders, payouts, loading, error,
    refresh, registerPayout, registerReturn, voidPayout, syncGatewayFees,
  };
};

export default useEventPayouts;
