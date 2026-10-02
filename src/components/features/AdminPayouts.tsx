import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wallet, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock, Send, Undo2, Download,
  FileText, X, ArrowDownLeft, Ban, CloudDownload, AlertCircle, Info, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useEventPayouts, OrderFinancial, PayoutStatus, EventPayout, PayoutInput,
} from '../../shared/hooks/hooks/useEventPayouts';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { downloadCSV } from '../../shared/utils/utils/exportUtils';
import { formatPersonName } from '../../shared/utils/utils/eventAttendees';
import ConfirmModal from '../shared/ConfirmModal';
import { runOrderRefund, RefundAction } from '../../shared/services/mercadoPagoRefundService';
import {
  explainOrder, worstLevel, isGatewayOrder, mpStatusLabel, ReconciliationNotice, NoticeLevel,
} from '../../shared/utils/utils/mpReconciliation';

const STATUS_META: Record<PayoutStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-50 text-amber-700' },
  a_liberar: { label: 'A liberar no MP', className: 'bg-sky-50 text-sky-700' },
  repassado: { label: 'Repassado', className: 'bg-green-50 text-green-700' },
  estornado: { label: 'Estornado', className: 'bg-gray-100 text-gray-500' },
  estornado_apos_repasse: { label: 'Estornado após repasse', className: 'bg-red-50 text-red-700' },
};

const METHOD_LABEL: Record<string, string> = {
  pix: 'Pix (MP)',
  pix_stripe: 'Pix',
  pix_chave: 'Pix chave',
  credit_card: 'Cartão',
  cortesia: 'Cortesia',
};

type OrderFilter = 'todos' | 'pendente' | 'a_liberar' | 'repassado' | 'estornado' | 'observacoes';

/** Sincroniza sozinho ao abrir o evento se o espelho do MP tiver mais que isso. */
const AUTO_SYNC_MAX_AGE_MS = 30 * 60 * 1000;

const NOTICE_STYLE: Record<NoticeLevel, { chip: string; text: string; Icon: typeof AlertCircle }> = {
  error: { chip: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', Icon: AlertCircle },
  warn: { chip: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-800', Icon: AlertTriangle },
  info: { chip: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-800', Icon: Info },
};

const FEE_TYPE_LABEL: Record<string, string> = {
  mercadopago_fee: 'Tarifa de processamento',
  financing_fee: 'Financiamento do parcelamento',
  application_fee: 'Tarifa da aplicação',
  shipping_fee: 'Frete',
};

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Valor do MP como veio da sincronização; ausente vira travessão, nunca zero. */
const MpValue: React.FC<{ value: number | null | undefined; synced: boolean; strong?: boolean }> = ({ value, synced, strong }) =>
  synced && value !== null && value !== undefined
    ? <span className={strong ? 'font-medium' : ''}>{formatPrice(value)}</span>
    : <span className="text-gray-300" title={synced ? 'Sem valor no MP' : 'Não sincronizado com o Mercado Pago'}>—</span>;
type DetailTab = 'pedidos' | 'repasses';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '—';
const csvNumber = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Quando o dinheiro ficou disponível para repassar: a liberação do Mercado Pago
 * ou, no Pix por chave própria, a própria compra — cai direto na conta.
 */
const releaseDateOf = (o: OrderFinancial): string | null =>
  o.payment_method === 'pix_chave' ? o.created_at : o.money_release_date;

/** Dias corridos desde a liberação; negativo enquanto o MP ainda retém o valor. */
const daysSinceRelease = (o: OrderFinancial): number | null => {
  const d = releaseDateOf(o);
  if (!d) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - start.getTime()) / 86_400_000);
};

const DAY_PRESETS = [7, 15, 30];

/** Card de indicador. `tone` destaca o que pede atenção. */
const Kpi: React.FC<{
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'brand';
}> = ({ label, value, hint, tone = 'default' }) => {
  const toneClass = {
    default: 'text-gray-900',
    good: 'text-green-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
    brand: 'text-purple-700',
  }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums truncate ${toneClass}`}>{formatPrice(value)}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
};

/** Modal compartilhado de repasse e devolução. */
const PayoutModal: React.FC<{
  mode: 'payout' | 'return';
  amount: number;
  ordersCount?: number;
  onClose: () => void;
  onSubmit: (amount: number, input: PayoutInput) => Promise<void>;
}> = ({ mode, amount, ordersCount, onClose, onSubmit }) => {
  const [paidAt, setPaidAt] = useState(today());
  const [method, setMethod] = useState('Pix');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [returnAmount, setReturnAmount] = useState(amount.toFixed(2));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isPayout = mode === 'payout';

  const submit = async () => {
    const value = isPayout ? amount : Number(String(returnAmount).replace(',', '.'));
    if (!value || value <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(value, { paidAt, method, reference, notes, proofFile });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível registrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isPayout ? 'Registrar repasse' : 'Registrar devolução'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isPayout
                ? `${ordersCount} pedido${ordersCount !== 1 ? 's' : ''} selecionado${ordersCount !== 1 ? 's' : ''}`
                : 'Valor devolvido pela Better Now para cobrir saldo negativo'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Fechar">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {isPayout ? (
            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs font-medium text-purple-700">Valor do repasse</p>
              <p className="text-2xl font-bold text-purple-900 tabular-nums">{formatPrice(amount)}</p>
              <p className="text-[11px] text-purple-700/70 mt-1">
                Soma do valor dos ingressos dos pedidos selecionados.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor devolvido (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option>Pix</option>
                <option>TED</option>
                <option>Transferência MP</option>
                <option>Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referência <span className="font-normal text-gray-400">(ID da transação, opcional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observação <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comprovante <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-5 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPayout ? 'Confirmar repasse' : 'Confirmar devolução'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPayouts: React.FC = () => {
  const [eventId, setEventId] = useState<string | null>(null);
  const {
    summaries, orders, payouts, loading, error,
    refresh, registerPayout, registerReturn, voidPayout, syncGatewayFees,
  } = useEventPayouts(eventId);

  const [tab, setTab] = useState<DetailTab>('pedidos');
  const [filter, setFilter] = useState<OrderFilter>('pendente');
  // "Recebidos do MP há mais de N dias" — vazio = qualquer prazo
  const [minDays, setMinDays] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'payout' | 'return' | null>(null);
  const [voiding, setVoiding] = useState<EventPayout | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Resolução de divergência de estorno, sempre confirmada antes de executar
  const [resolving, setResolving] = useState<{
    order: OrderFinancial;
    action: RefundAction;
    title: string;
    message: string;
    confirmText: string;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);
  const [resolvingBusy, setResolvingBusy] = useState<string | null>(null);
  // Resultado de cada resolução, fixo na linha do pedido: um aviso passageiro
  // não basta quando a operação mexe em dinheiro
  const [resolutionLog, setResolutionLog] = useState<Record<string, {
    state: 'running' | 'ok' | 'error';
    message: string;
    at: string;
  }>>({});
  // Eventos já sincronizados automaticamente nesta sessão da tela
  const autoSynced = useRef<Set<string>>(new Set());

  // Abre direto no evento com saldo em aberto mais recente
  useEffect(() => {
    if (eventId || summaries.length === 0) return;
    const withBalance = summaries.find(s => Math.abs(s.balance) > 0.009) || summaries[0];
    setEventId(withBalance.event_id);
  }, [summaries, eventId]);

  useEffect(() => { setSelected(new Set()); }, [eventId, filter, minDays]);

  const totals = useMemo(() => summaries.reduce((acc, s) => ({
    gross: acc.gross + s.gross_amount,
    due: acc.due + s.payout_due,
    paidOut: acc.paidOut + s.paid_out - s.returned,
    pending: acc.pending + Math.max(0, s.balance),
    negative: acc.negative + Math.min(0, s.balance),
    convenience: acc.convenience + s.convenience_fee,
    interest: acc.interest + s.installment_interest,
    gateway: acc.gateway + s.gateway_fee,
    profit: acc.profit + s.net_profit,
  }), { gross: 0, due: 0, paidOut: 0, pending: 0, negative: 0, convenience: 0, interest: 0, gateway: 0, profit: 0 }), [summaries]);

  const current = summaries.find(s => s.event_id === eventId) || null;

  const minDaysValue = minDays.trim() === '' ? null : Math.max(0, Number(minDays) || 0);

  // Explicações do que foge do padrão, por pedido — só comparação, nenhum cálculo
  const noticesById = useMemo(() => {
    const map = new Map<string, ReconciliationNotice[]>();
    orders.forEach(o => map.set(o.order_id, explainOrder(o)));
    return map;
  }, [orders]);

  const hasAttention = (o: OrderFinancial) =>
    (noticesById.get(o.order_id) || []).some(n => n.level !== 'info');

  // Conciliação: somas dos valores do MP exatamente como sincronizados
  const mpOrders = orders.filter(isGatewayOrder);
  const mpSynced = mpOrders.filter(o => o.gateway_synced_at && o.gateway_status);
  const mpTotals = {
    gross: mpSynced.reduce((s, o) => s + Number(o.gateway_gross_amount || 0), 0),
    fee: mpSynced.reduce((s, o) => s + o.gateway_fee, 0),
    net: mpSynced.reduce((s, o) => s + Number(o.gateway_net_amount || 0), 0),
    refunded: mpSynced.reduce((s, o) => s + Number(o.gateway_refunded_amount || 0), 0),
  };
  const attentionCount = orders.filter(hasAttention).length;
  const oldestSync = mpOrders.length && mpSynced.length === mpOrders.length
    ? mpSynced.reduce((min, o) => (o.gateway_synced_at! < min ? o.gateway_synced_at! : min), mpSynced[0].gateway_synced_at!)
    : null;

  const visibleOrders = useMemo(() => orders.filter(o => {
    if (minDaysValue !== null) {
      const days = daysSinceRelease(o);
      if (days === null || days <= minDaysValue) return false;
    }
    if (filter === 'todos') return true;
    if (filter === 'observacoes') return hasAttention(o);
    if (filter === 'estornado') return o.payout_status === 'estornado' || o.payout_status === 'estornado_apos_repasse';
    return o.payout_status === filter;
  }), [orders, filter, minDaysValue, noticesById]);

  const selectable = (o: OrderFinancial) => o.payout_status === 'pendente' || o.payout_status === 'a_liberar';
  const selectedOrders = orders.filter(o => selected.has(o.order_id));
  const selectedTotal = selectedOrders.reduce((sum, o) => sum + o.payout_due, 0);
  const visibleSelectable = visibleOrders.filter(selectable);
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every(o => selected.has(o.order_id));

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    if (allVisibleSelected) visibleSelectable.forEach(o => next.delete(o.order_id));
    else visibleSelectable.forEach(o => next.add(o.order_id));
    return next;
  });

  const handleSync = async (silent = false) => {
    setSyncing(true);
    try {
      const r = await syncGatewayFees();
      if (r.failed.length) toast.warning(`${r.synced} de ${r.total} pedidos sincronizados. ${r.failed.length} sem resposta do MP.`);
      else if (!silent) toast.success(`${r.synced} pedido${r.synced !== 1 ? 's' : ''} sincronizado${r.synced !== 1 ? 's' : ''} com o Mercado Pago.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar com o Mercado Pago.');
    } finally {
      setSyncing(false);
    }
  };

  // Abriu o evento com o espelho do MP velho ou incompleto: sincroniza sozinho,
  // uma vez por evento, para a tela nunca mostrar valor do MP desatualizado
  useEffect(() => {
    if (!eventId || loading || syncing || autoSynced.current.has(eventId)) return;
    if (orders.length === 0 || orders[0].event_id !== eventId || mpOrders.length === 0) return;
    const stale = mpOrders.some(o =>
      !o.gateway_synced_at || Date.now() - new Date(o.gateway_synced_at).getTime() > AUTO_SYNC_MAX_AGE_MS
    );
    autoSynced.current.add(eventId);
    if (stale) handleSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, orders, loading]);

  const runResolution = async () => {
    const target = resolving;
    setResolving(null);
    if (!target) return;

    const id = target.order.order_id;
    const log = (state: 'running' | 'ok' | 'error', message: string) =>
      setResolutionLog(prev => ({ ...prev, [id]: { state, message, at: new Date().toISOString() } }));

    setExpanded(prev => new Set(prev).add(id));
    setResolvingBusy(id);
    log('running', target.action === 'refund'
      ? 'Solicitando o estorno ao Mercado Pago…'
      : 'Atualizando o pedido…');

    // Sem resposta em 60 s a tela avisa em vez de ficar girando para sempre.
    // Repetir depois é seguro: a mesma solicitação não estorna duas vezes.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        'Sem resposta do Mercado Pago em 60 segundos. Clique em "Sincronizar com o MP" para conferir se o estorno foi feito antes de tentar de novo — repetir não estorna em dobro.'
      )), 60_000)
    );

    try {
      const r = await Promise.race([
        runOrderRefund({
          orderId: id,
          action: target.action,
          amount: target.action === 'register' ? target.order.gateway_refunded_amount : null,
          reason: target.action === 'refund' ? 'Estorno pela conciliação com o Mercado Pago' : null,
        }),
        timeout,
      ]);

      const message = target.action === 'refund'
        ? r.already
          ? `O Mercado Pago já tinha este pagamento estornado (${formatPrice(Number(r.refunded_amount || 0))}). O sistema foi alinhado ao MP.`
          : `Estorno confirmado pelo Mercado Pago: ${formatPrice(Number(r.refunded_amount || 0))} devolvidos ao comprador${r.refund_id ? ` (ID do estorno no MP: ${r.refund_id})` : ''}. O crédito no cartão pode levar alguns dias para aparecer na fatura.`
        : target.action === 'register'
          ? `Estorno do Mercado Pago registrado no sistema: ${formatPrice(Number(r.refunded_amount || 0))}.`
          : 'Reembolso desfeito no sistema. O pedido voltou para pago, igual ao Mercado Pago.';
      log('ok', message);
      toast.success(target.action === 'refund' ? 'Estorno confirmado pelo Mercado Pago.' : 'Pedido atualizado.');
      await refresh();
    } catch (err: any) {
      log('error', err.message || 'Não foi possível concluir a operação.');
      toast.error(err.message || 'Não foi possível concluir a operação.');
    } finally {
      setResolvingBusy(null);
    }
  };

  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const exportCsv = () => {
    const header = [
      'Data', 'Cliente', 'Forma', 'Parcelas', 'Status pedido', 'Transação MP', 'Status MP', 'Venda MP', 'Tarifa MP',
      'Líquido MP', 'Estornado MP', 'Observações', 'Bruto', 'Valor ingressos', 'Conveniência cliente',
      'Conveniência assumida Better Now', 'Conveniência total', '% conveniência', 'Juros parcelamento', 'Taxa MP',
      'Lucro líquido', 'Repasse devido', 'Liberado pelo MP em', 'Dias desde a liberação', 'Status repasse', 'Repassado em',
    ];
    const rows = orders.map(o => [
      fmtDate(o.created_at),
      formatPersonName(o.client_name || ''),
      METHOD_LABEL[o.payment_method || ''] || o.payment_method || '',
      o.installments ?? '',
      o.status,
      o.gateway_payment_id || '',
      mpStatusLabel(o.gateway_status),
      o.gateway_gross_amount !== null ? csvNumber(o.gateway_gross_amount) : '',
      o.gateway_synced_at ? csvNumber(o.gateway_fee) : '',
      o.gateway_net_amount !== null ? csvNumber(Number(o.gateway_net_amount)) : '',
      o.gateway_refunded_amount !== null ? csvNumber(o.gateway_refunded_amount) : '',
      (noticesById.get(o.order_id) || []).map(n => n.message).join(' | '),
      csvNumber(o.gross_amount),
      csvNumber(o.tickets_amount),
      csvNumber(o.client_convenience_fee),
      csvNumber(o.organizer_fee),
      csvNumber(o.convenience_fee),
      String(o.fee_percentage_total).replace('.', ','),
      csvNumber(o.installment_interest),
      csvNumber(o.gateway_fee),
      csvNumber(o.net_profit),
      csvNumber(o.payout_due),
      fmtDate(releaseDateOf(o)),
      daysSinceRelease(o) ?? '',
      STATUS_META[o.payout_status].label,
      fmtDate(o.payout_paid_at),
    ]);
    // ';' e vírgula decimal para o Excel em português abrir sem importar
    const content = '﻿' + [header, ...rows]
      .map(r => r.map(v => {
        const s = String(v ?? '');
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';'))
      .join('\n');
    const slug = (current?.event_title || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadCSV(content, `repasses-${slug}-${today()}.csv`);
  };

  const pendingTotal = (current?.pending_released || 0) + (current?.pending_unreleased || 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Repasses</h1>
            <p className="text-sm text-gray-500">
              Repasse devido à Better Now, taxas e lucro da plataforma por evento.
            </p>
          </div>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Visão geral — todos os eventos */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Todos os eventos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Kpi label="Repassado" value={totals.paidOut} tone="good" />
          <Kpi label="Pendente de repasse" value={totals.pending} tone="warn" />
          <Kpi
            label="Saldo negativo"
            value={totals.negative}
            tone={totals.negative < 0 ? 'bad' : 'default'}
            hint="Estornos após repasse"
          />
          <Kpi label="Taxa de conveniência" value={totals.convenience} hint={totals.interest > 0 ? `+ ${formatPrice(totals.interest)} de juros` : undefined} />
          <Kpi label="Taxa Mercado Pago" value={totals.gateway} />
          <Kpi label="Lucro líquido" value={totals.profit} tone="brand" hint="Conveniência + juros − taxa MP" />
        </div>
      </section>

      {/* Lista de eventos */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Evento</th>
                <th className="text-right font-semibold px-4 py-3">Pedidos</th>
                <th className="text-right font-semibold px-4 py-3">Bruto</th>
                <th className="text-right font-semibold px-4 py-3">Repasse devido</th>
                <th className="text-right font-semibold px-4 py-3">Repassado</th>
                <th className="text-right font-semibold px-4 py-3">Saldo</th>
                <th className="text-right font-semibold px-4 py-3">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summaries.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum evento com vendas pagas.</td></tr>
              )}
              {summaries.map(s => (
                <tr
                  key={s.event_id}
                  onClick={() => setEventId(s.event_id)}
                  className={`cursor-pointer transition-colors ${s.event_id === eventId ? 'bg-purple-50/60' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.event_title || 'Evento'}</p>
                    <p className="text-xs text-gray-400">{fmtDate(s.event_date)}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.paid_orders}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(s.gross_amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(s.payout_due)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatPrice(s.paid_out - s.returned)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                    s.balance < -0.009 ? 'text-red-700' : s.balance > 0.009 ? 'text-amber-700' : 'text-gray-400'
                  }`}>
                    {formatPrice(s.balance)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-purple-700">{formatPrice(s.net_profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalhe do evento */}
      {current && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{current.event_title}</h2>
              <p className="text-sm text-gray-500">
                {current.paid_orders} pedido{current.paid_orders !== 1 ? 's' : ''} pago{current.paid_orders !== 1 ? 's' : ''}
                {current.last_payout_at && ` · último repasse em ${fmtDate(current.last_payout_at)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSync()}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
                title="Busca no Mercado Pago valor, status, tarifa, líquido, estornos e liberação de cada pedido"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                Sincronizar com o MP
              </button>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                <Download className="w-4 h-4" /> Exportar
              </button>
              {current.balance < -0.009 && (
                <button
                  onClick={() => setModal('return')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg"
                >
                  <ArrowDownLeft className="w-4 h-4" /> Registrar devolução
                </button>
              )}
            </div>
          </div>

          {mpOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Mercado Pago</h3>
                  <p className="text-xs text-gray-500">
                    {syncing
                      ? 'Sincronizando…'
                      : mpSynced.length < mpOrders.length
                        ? `${mpOrders.length - mpSynced.length} de ${mpOrders.length} pedidos ainda não sincronizados`
                        : `Valores exatamente como no MP · sincronizado em ${fmtDateTime(oldestSync)}`}
                  </p>
                </div>
                {attentionCount > 0 ? (
                  <button
                    onClick={() => { setTab('pedidos'); setFilter('observacoes'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {attentionCount} pedido{attentionCount !== 1 ? 's' : ''} com observação
                  </button>
                ) : mpSynced.length === mpOrders.length && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sistema e MP de acordo
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Vendas', value: mpTotals.gross },
                  { label: 'Tarifas e impostos', value: -mpTotals.fee },
                  { label: 'Estornos', value: -mpTotals.refunded },
                  { label: 'Líquido recebido', value: mpTotals.net },
                ].map(k => (
                  <div key={k.label} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">{k.label}</p>
                    <p className="font-bold tabular-nums text-gray-900">{formatPrice(k.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Bruto pago pelos clientes" value={current.gross_amount} />
            <Kpi
              label="Repasse devido"
              value={current.payout_due}
              hint={current.organizer_fee > 0 ? `Ingressos ${formatPrice(current.tickets_amount)} − taxa assumida` : 'Valor dos ingressos'}
            />
            <Kpi label="Repassado" value={current.paid_out - current.returned} tone="good" />
            <Kpi
              label={current.balance < -0.009 ? 'Saldo negativo' : 'Pendente de repasse'}
              value={current.balance}
              tone={current.balance < -0.009 ? 'bad' : current.balance > 0.009 ? 'warn' : 'default'}
              hint={current.balance < -0.009
                ? 'Better Now deve à plataforma'
                : pendingTotal > 0
                  ? `${formatPrice(current.pending_released)} liberado · ${formatPrice(current.pending_unreleased)} a liberar`
                  : undefined}
            />
            <Kpi
              label="Taxa de conveniência"
              value={current.convenience_fee}
              hint={current.organizer_fee > 0 ? `${formatPrice(current.organizer_fee)} assumidos pela Better Now` : undefined}
            />
            <Kpi label="Juros de parcelamento" value={current.installment_interest} hint="Pagos pelo cliente" />
            <Kpi label="Taxa Mercado Pago" value={current.gateway_fee} />
            <Kpi label="Lucro líquido" value={current.net_profit} tone="brand" hint="Conveniência + juros − taxa MP" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-1 px-4 border-b border-gray-200">
              {(['pedidos', 'repasses'] as DetailTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'pedidos' ? 'Pedidos' : `Repasses (${payouts.filter(p => !p.voided_at).length})`}
                </button>
              ))}
            </div>

            {tab === 'pedidos' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ['pendente', 'Pendentes'],
                      ['a_liberar', 'A liberar'],
                      ['repassado', 'Repassados'],
                      ['estornado', 'Estornados'],
                      ['todos', 'Todos'],
                      ...(attentionCount > 0 ? [['observacoes', `Com observação (${attentionCount})`]] : []),
                    ] as [OrderFilter, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Recebidos do MP há mais de</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={minDays}
                      onChange={(e) => setMinDays(e.target.value)}
                      placeholder="—"
                      aria-label="Dias desde a liberação"
                      className="w-14 px-2 py-1 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span>dias</span>
                    {DAY_PRESETS.map(d => (
                      <button
                        key={d}
                        onClick={() => setMinDays(String(d))}
                        className={`px-2 py-1 rounded-md font-medium transition-colors ${
                          minDaysValue === d ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                    {minDaysValue !== null && (
                      <button
                        onClick={() => setMinDays('')}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                        aria-label="Limpar filtro de dias"
                        title="Limpar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {selected.size > 0 && (
                    <button
                      onClick={() => setModal('payout')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      Repassar {selected.size} · {formatPrice(selectedTotal)}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleAll}
                            disabled={visibleSelectable.length === 0}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            aria-label="Selecionar todos"
                          />
                        </th>
                        <th className="text-left font-semibold px-3 py-2.5">Pedido</th>
                        <th className="text-right font-semibold px-3 py-2.5 whitespace-nowrap bg-sky-50/60">Venda MP</th>
                        <th className="text-right font-semibold px-3 py-2.5 whitespace-nowrap bg-sky-50/60">Tarifa MP</th>
                        <th className="text-right font-semibold px-3 py-2.5 whitespace-nowrap bg-sky-50/60">Líquido MP</th>
                        <th className="text-right font-semibold px-3 py-2.5">Conveniência</th>
                        <th className="text-right font-semibold px-3 py-2.5">Repasse</th>
                        <th className="text-right font-semibold px-3 py-2.5">Lucro</th>
                        <th className="text-right font-semibold px-3 py-2.5 whitespace-nowrap">Liberado há</th>
                        <th className="text-left font-semibold px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    {visibleOrders.length > 0 && (
                      <tbody className="bg-purple-50/40 font-semibold text-gray-700 border-b-2 border-purple-100">
                        <tr>
                          <td />
                          <td className="px-3 py-2.5 text-xs uppercase text-gray-500">Total do filtro</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(visibleOrders.reduce((s, o) => s + Number(o.gateway_gross_amount || 0), 0))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(visibleOrders.reduce((s, o) => s + (o.gateway_synced_at ? o.gateway_fee : 0), 0))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(visibleOrders.reduce((s, o) => s + Number(o.gateway_net_amount || 0), 0))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(visibleOrders.reduce((s, o) => s + o.convenience_fee, 0))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(visibleOrders.reduce((s, o) => s + o.tickets_amount - o.organizer_fee, 0))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-purple-700">{formatPrice(visibleOrders.reduce((s, o) => s + o.net_profit, 0))}</td>
                          <td />
                          <td />
                        </tr>
                      </tbody>
                    )}
                    <tbody className="divide-y divide-gray-100">
                      {visibleOrders.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Nenhum pedido neste filtro.</td></tr>
                      )}
                      {visibleOrders.map(o => {
                        const meta = STATUS_META[o.payout_status];
                        const days = daysSinceRelease(o);
                        // Liberado e ainda não repassado há muito tempo pede atenção
                        const waiting = o.payout_status === 'pendente' && days !== null;
                        const daysTone = waiting && days > 30 ? 'text-red-600 font-semibold'
                          : waiting && days > 7 ? 'text-amber-600 font-semibold'
                          : 'text-gray-700';
                        const notices = noticesById.get(o.order_id) || [];
                        const level = worstLevel(notices);
                        const isOpen = expanded.has(o.order_id);
                        const viaMp = isGatewayOrder(o);
                        const synced = viaMp && Boolean(o.gateway_synced_at && o.gateway_status);
                        return (
                          <React.Fragment key={o.order_id}>
                          <tr className={selected.has(o.order_id) ? 'bg-purple-50/50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2.5">
                              {selectable(o) && (
                                <input
                                  type="checkbox"
                                  checked={selected.has(o.order_id)}
                                  onChange={() => toggle(o.order_id)}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  aria-label="Selecionar pedido"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2.5 min-w-[180px]">
                              <p className="font-medium text-gray-900 truncate max-w-[220px]">
                                {formatPersonName(o.client_name || 'Cliente')}
                              </p>
                              <p className="text-xs text-gray-400">
                                {fmtDate(o.created_at)} · {METHOD_LABEL[o.payment_method || ''] || o.payment_method}
                                {o.installments && o.installments > 1 ? ` ${o.installments}x` : ''}
                                {o.batch_name ? ` · ${o.batch_name}` : ''}
                              </p>
                              {(viaMp || notices.length > 0) && (
                                <button
                                  onClick={() => toggleExpanded(o.order_id)}
                                  className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                                    level ? NOTICE_STYLE[level].chip : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}
                                >
                                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {notices.length > 0
                                    ? `${notices.length} observaç${notices.length !== 1 ? 'ões' : 'ão'}`
                                    : 'Detalhes MP'}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums bg-sky-50/30">
                              {viaMp
                                ? <MpValue value={o.gateway_gross_amount} synced={synced} strong />
                                : <span className="text-gray-500" title="Não passa pelo Mercado Pago">{formatPrice(o.gross_amount)}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums bg-sky-50/30">
                              {viaMp ? <MpValue value={o.gateway_fee} synced={synced} /> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums bg-sky-50/30">
                              {viaMp
                                ? <MpValue value={o.gateway_net_amount} synced={synced} />
                                : <span className="text-gray-500">{formatPrice(o.gross_amount)}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatPrice(o.convenience_fee)}
                              {o.fee_percentage_total > 0 && (
                                <span className={`block text-[10px] ${o.organizer_fee > 0 ? 'text-indigo-500' : 'text-gray-400'}`}>
                                  {o.fee_percentage_total}%{o.organizer_fee > 0 ? ' · assumida pela Better Now' : ''}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                              {formatPrice(o.is_paid && !o.is_refunded ? o.payout_due : o.tickets_amount - o.organizer_fee)}
                              {o.organizer_fee > 0 && (
                                <span className="block text-[10px] text-gray-400">ingressos {formatPrice(o.tickets_amount)}</span>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right tabular-nums ${o.net_profit < 0 ? 'text-red-600' : 'text-purple-700'}`}>
                              {formatPrice(o.net_profit)}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              {days === null ? (
                                <span className="text-xs text-gray-400" title="Data de liberação ainda não sincronizada com o Mercado Pago">—</span>
                              ) : days < 0 ? (
                                <span className="text-xs text-sky-600">libera em {-days} dia{days !== -1 ? 's' : ''}</span>
                              ) : (
                                <span className={`tabular-nums ${daysTone}`}>
                                  {days === 0 ? 'hoje' : `${days} dia${days !== 1 ? 's' : ''}`}
                                </span>
                              )}
                              {days !== null && (
                                <span className="block text-[10px] text-gray-400">{fmtDate(releaseDateOf(o))}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${meta.className}`}>
                                {o.payout_status === 'repassado' && <CheckCircle2 className="w-3 h-3" />}
                                {o.payout_status === 'a_liberar' && <Clock className="w-3 h-3" />}
                                {meta.label}
                              </span>
                              {o.payout_paid_at && (
                                <span className="block text-[10px] text-gray-400 mt-0.5">em {fmtDate(o.payout_paid_at)}</span>
                              )}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-gray-50/70">
                              <td />
                              <td colSpan={9} className="px-3 py-3">
                                {resolutionLog[o.order_id] && (() => {
                                  const entry = resolutionLog[o.order_id];
                                  const tone = entry.state === 'ok' ? 'bg-green-50 border-green-200 text-green-800'
                                    : entry.state === 'error' ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-sky-50 border-sky-200 text-sky-800';
                                  return (
                                    <div className={`flex items-start gap-2 mb-3 p-3 rounded-lg border text-xs ${tone}`}>
                                      {entry.state === 'running' && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                                      {entry.state === 'ok' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                                      {entry.state === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                                      <div className="flex-1">
                                        <p className="font-medium">{entry.message}</p>
                                        <p className="opacity-70 mt-0.5">{fmtDateTime(entry.at)}</p>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const codes = new Set(notices.map(n => n.code));
                                  const busy = resolvingBusy === o.order_id;
                                  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50';
                                  if (codes.has('refund_missing_on_mp')) {
                                    return (
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        <button
                                          disabled={busy}
                                          onClick={() => setResolving({
                                            order: o,
                                            action: 'refund',
                                            title: `Estornar ${formatPrice(Number(o.gateway_gross_amount || 0))} no Mercado Pago?`,
                                            message: `O valor volta para o comprador (${formatPersonName(o.client_name || 'Cliente')}) pelo mesmo meio de pagamento. O estorno no MP não pode ser desfeito.`,
                                            confirmText: 'Estornar no MP',
                                            type: 'danger',
                                          })}
                                          className={`${btn} bg-red-600 hover:bg-red-700 text-white`}
                                        >
                                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                                          Estornar no Mercado Pago
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() => setResolving({
                                            order: o,
                                            action: 'undo',
                                            title: 'Desfazer o reembolso no sistema?',
                                            message: 'Use quando o estorno não deveria ter acontecido. O pedido volta para pago, igual ao Mercado Pago, e os ingressos voltam a valer.',
                                            confirmText: 'Desfazer reembolso',
                                            type: 'warning',
                                          })}
                                          className={`${btn} bg-white border border-gray-300 hover:bg-gray-50 text-gray-700`}
                                        >
                                          Desfazer reembolso no sistema
                                        </button>
                                      </div>
                                    );
                                  }
                                  if (codes.has('refunded_on_mp') || codes.has('partial_refund')) {
                                    return (
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        <button
                                          disabled={busy}
                                          onClick={() => setResolving({
                                            order: o,
                                            action: 'register',
                                            title: 'Registrar no sistema o estorno do Mercado Pago?',
                                            message: `O pedido passa a refletir o estorno de ${formatPrice(Number(o.gateway_refunded_amount || 0))} feito no MP. Estorno total cancela os ingressos.`,
                                            confirmText: 'Registrar estorno',
                                            type: 'warning',
                                          })}
                                          className={`${btn} bg-amber-600 hover:bg-amber-700 text-white`}
                                        >
                                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                          Registrar estorno do MP no sistema
                                        </button>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {notices.length > 0 && (
                                  <ul className="space-y-1.5 mb-3">
                                    {notices.map(n => {
                                      const st = NOTICE_STYLE[n.level];
                                      return (
                                        <li key={n.code} className={`flex items-start gap-2 text-xs ${st.text}`}>
                                          <st.Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                          <span>{n.message}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                                {viaMp && (
                                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                      <dt className="text-gray-400">Transação MP</dt>
                                      <dd className="font-mono text-gray-800">{o.gateway_payment_id || '—'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Status no MP</dt>
                                      <dd className="text-gray-800">
                                        {mpStatusLabel(o.gateway_status)}
                                        {o.gateway_status_detail ? <span className="text-gray-400"> · {o.gateway_status_detail}</span> : null}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Aprovado em</dt>
                                      <dd className="text-gray-800">{fmtDateTime(o.gateway_approved_at)}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Liberação</dt>
                                      <dd className="text-gray-800">
                                        {fmtDateTime(o.money_release_date)}
                                        {o.money_release_status ? <span className="text-gray-400"> · {o.money_release_status === 'released' ? 'liberado' : 'retido'}</span> : null}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Total pago pelo comprador</dt>
                                      <dd className="text-gray-800"><MpValue value={o.gateway_total_paid_amount} synced={synced} /></dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Estornado no MP</dt>
                                      <dd className="text-gray-800"><MpValue value={o.gateway_refunded_amount} synced={synced} /></dd>
                                    </div>
                                    <div className="col-span-2">
                                      <dt className="text-gray-400">Tarifas detalhadas pelo MP</dt>
                                      <dd className="text-gray-800">
                                        {(o.gateway_fee_details || []).length === 0 ? '—' : (o.gateway_fee_details || []).map((f, i) => (
                                          <span key={i} className="block">
                                            {FEE_TYPE_LABEL[f.type || ''] || f.type}: {formatPrice(Number(f.amount || 0))}
                                            {f.fee_payer === 'payer' ? ' (paga pelo comprador)' : ''}
                                          </span>
                                        ))}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-400">Sincronizado em</dt>
                                      <dd className="text-gray-800">{fmtDateTime(o.gateway_synced_at)}</dd>
                                    </div>
                                  </dl>
                                )}
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="divide-y divide-gray-100">
                {payouts.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum repasse registrado. Selecione pedidos na aba Pedidos para registrar o primeiro.
                  </p>
                )}
                {payouts.map(p => {
                  const isReturn = p.kind === 'return';
                  const count = (p.items || []).length;
                  return (
                    <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${p.voided_at ? 'opacity-50' : ''}`}>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${isReturn ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {isReturn ? <ArrowDownLeft className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <p className={`font-medium text-gray-900 ${p.voided_at ? 'line-through' : ''}`}>
                          {isReturn ? 'Devolução da Better Now' : `Repasse de ${count} pedido${count !== 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ${p.reference}` : ''}
                        </p>
                        {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                        {p.voided_at && (
                          <p className="text-xs text-red-600 mt-0.5">
                            Estornado em {fmtDate(p.voided_at)}{p.voided_reason ? ` — ${p.voided_reason}` : ''}
                          </p>
                        )}
                      </div>
                      <p className={`text-lg font-bold tabular-nums ${isReturn ? 'text-red-700' : 'text-gray-900'}`}>
                        {isReturn ? '− ' : ''}{formatPrice(p.amount)}
                      </p>
                      <div className="flex items-center gap-1">
                        {p.proof_url && (
                          <a
                            href={p.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Ver comprovante"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {!p.voided_at && (
                          <button
                            onClick={() => setVoiding(p)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Estornar lançamento"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                        {p.voided_at && <Ban className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {modal === 'payout' && (
        <PayoutModal
          mode="payout"
          amount={selectedTotal}
          ordersCount={selected.size}
          onClose={() => setModal(null)}
          onSubmit={async (_amount, input) => {
            await registerPayout(Array.from(selected), input);
            setSelected(new Set());
            toast.success('Repasse registrado.');
          }}
        />
      )}

      {modal === 'return' && current && (
        <PayoutModal
          mode="return"
          amount={Math.abs(current.balance)}
          onClose={() => setModal(null)}
          onSubmit={async (amount, input) => {
            await registerReturn(amount, input);
            toast.success('Devolução registrada.');
          }}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(resolving)}
        onClose={() => setResolving(null)}
        onConfirm={runResolution}
        title={resolving?.title ?? ''}
        message={resolving?.message ?? ''}
        confirmText={resolving?.confirmText ?? 'Confirmar'}
        type={resolving?.type ?? 'warning'}
      />

      <ConfirmModal
        isOpen={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        onConfirm={async () => {
          const target = voiding;
          setVoiding(null);
          if (!target) return;
          try {
            await voidPayout(target.id);
            toast.success('Lançamento estornado. Os pedidos voltaram para pendentes.');
          } catch (err: any) {
            toast.error(err.message || 'Erro ao estornar.');
          }
        }}
        title={`Estornar ${voiding?.kind === 'return' ? 'devolução' : 'repasse'} de ${voiding ? formatPrice(voiding.amount) : ''}?`}
        message={voiding?.kind === 'return'
          ? 'A devolução sai do saldo do evento. O registro fica guardado como estornado.'
          : 'Use quando o repasse foi lançado por engano. Os pedidos voltam a ficar pendentes e o registro fica guardado como estornado.'}
        confirmText="Estornar"
        type="danger"
      />
    </div>
  );
};

export default AdminPayouts;
