import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Lock, Loader2, Eye, Search, DollarSign, Receipt, Wallet, Ticket,
  CheckCircle2, Clock, Ban, RotateCcw, Gift, AlertTriangle, Filter, FileText, Hourglass, Send,
  ChevronRight, X,
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface OrderRow {
  code: string;
  buyer: string;
  batch: string;
  quantity: number;
  method: string | null;
  gross: number;
  fee: number;
  fee_percentage: number;
  net: number;
  status: string;
  created_at: string;
  payout: PayoutInfo | null;
}

interface PayoutInfo {
  status: 'pendente' | 'a_liberar' | 'repassado' | 'estornado' | 'estornado_apos_repasse';
  paid_at: string | null;
  registered_at: string | null;
  method: string | null;
  reference: string | null;
  proof_url: string | null;
}

interface Totals {
  gross: number; fee: number; net: number;
  paid_orders: number; total_orders: number; tickets: number;
}

interface Payload {
  event: { title: string; date: string | null };
  label: string | null;
  orders: OrderRow[];
  totals: Totals;
}

const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  paid: { label: 'Pago', cls: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle2 },
  approved: { label: 'Pago', cls: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle2 },
  pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800', Icon: Clock },
  pending_proof: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800', Icon: Clock },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-200 text-gray-700', Icon: Ban },
  failed: { label: 'Recusado', cls: 'bg-red-100 text-red-800', Icon: Ban },
  refunded: { label: 'Reembolsado', cls: 'bg-purple-100 text-purple-800', Icon: RotateCcw },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_META[status] || { label: status, cls: 'bg-gray-100 text-gray-600', Icon: Clock };
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1 ${s.cls}`}>
      <s.Icon className="w-3.5 h-3.5" /> {s.label}
    </span>
  );
};

const PAYOUT_META: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  repassado: { label: 'Repassado', cls: 'bg-emerald-100 text-emerald-800', Icon: Send },
  pendente: { label: 'A repassar', cls: 'bg-amber-100 text-amber-800', Icon: Clock },
  a_liberar: { label: 'Aguardando Mercado Pago', cls: 'bg-sky-100 text-sky-800', Icon: Hourglass },
  estornado: { label: 'Estornado', cls: 'bg-gray-200 text-gray-700', Icon: RotateCcw },
  estornado_apos_repasse: { label: 'Estornado após repasse', cls: 'bg-red-100 text-red-800', Icon: RotateCcw },
};

const NO_PAYOUT_LABEL = 'Sem repasse (não pago)';

type StatusGroupKey = 'paid' | 'courtesy' | 'failed' | 'refunded' | 'pending' | 'cancelled';

const STATUS_GROUPS: { key: StatusGroupKey; label: string; cls: string; Icon: typeof CheckCircle2; always: boolean }[] = [
  { key: 'paid', label: 'Pagos', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, always: true },
  { key: 'courtesy', label: 'Cortesias', cls: 'bg-teal-50 text-teal-700', Icon: Gift, always: true },
  { key: 'failed', label: 'Recusados', cls: 'bg-red-50 text-red-700', Icon: Ban, always: true },
  { key: 'refunded', label: 'Reembolsados', cls: 'bg-purple-50 text-purple-700', Icon: RotateCcw, always: true },
  { key: 'pending', label: 'Pendentes', cls: 'bg-amber-50 text-amber-700', Icon: Clock, always: false },
  { key: 'cancelled', label: 'Cancelados', cls: 'bg-gray-100 text-gray-600', Icon: Ban, always: false },
];

const statusGroupOf = (o: OrderRow): StatusGroupKey | null => {
  const isFree = o.method === 'cortesia' || o.method === 'free';
  if (o.status === 'paid' || o.status === 'approved') return isFree ? 'courtesy' : 'paid';
  if (o.status === 'failed') return 'failed';
  if (o.status === 'refunded') return 'refunded';
  if (o.status === 'pending' || o.status === 'pending_proof') return 'pending';
  if (o.status === 'cancelled') return 'cancelled';
  return null;
};

const payoutLabel = (status: string) => PAYOUT_META[status]?.label || NO_PAYOUT_LABEL;

const fmtDay = (d: string) =>
  new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR');

/**
 * O repasse guarda o dia da transferência e o momento em que foi registrado.
 * A hora só é mostrada quando o registro foi no mesmo dia da transferência —
 * em lançamento retroativo ela seria a hora do registro, não a do Pix.
 */
const payoutWhen = (p: PayoutInfo): string | null => {
  if (!p.paid_at) return null;
  const day = fmtDay(p.paid_at);
  if (!p.registered_at) return day;
  const reg = new Date(p.registered_at);
  const sameDay = reg.toLocaleDateString('pt-BR') === day;
  return sameDay
    ? `${day} às ${reg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : day;
};

const PayoutCell: React.FC<{ payout: PayoutInfo | null }> = ({ payout }) => {
  if (!payout) return <span className="text-gray-400">—</span>;
  const meta = PAYOUT_META[payout.status] || PAYOUT_META.pendente;
  const when = payoutWhen(payout);
  return (
    <div className="space-y-1">
      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${meta.cls}`}>
        <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
      </span>
      {when && (
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {when}{payout.method ? ` · ${payout.method}` : ''}
        </div>
      )}
      {payout.reference && (
        <div className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]" title={payout.reference}>
          {payout.reference}
        </div>
      )}
      {payout.proof_url && (
        <a
          href={payout.proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <FileText className="w-3.5 h-3.5" /> Comprovante
        </a>
      )}
    </div>
  );
};

const METHOD_META: Record<string, { label: string; cls: string }> = {
  cortesia: { label: 'Cortesia', cls: 'text-emerald-800 bg-emerald-100 border-emerald-300 font-bold' },
  free: { label: 'Cortesia', cls: 'text-emerald-800 bg-emerald-100 border-emerald-300 font-bold' },
  credit_card: { label: 'Cartão', cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  pix: { label: 'Pix', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pix_stripe: { label: 'Pix', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pix_chave: { label: 'Pix Chave', cls: 'text-teal-700 bg-teal-50 border-teal-200' },
  boleto: { label: 'Boleto', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
};

const methodLabel = (method: string | null) =>
  METHOD_META[method || '']?.label || method || 'MP';

const MethodBadge: React.FC<{ method: string | null }> = ({ method }) => {
  const m = METHOD_META[method || ''] || { label: method || 'MP', cls: 'text-gray-600 bg-gray-50 border-gray-200' };
  const isFree = method === 'cortesia' || method === 'free';
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium inline-flex items-center gap-1 ${m.cls}`}>
      {isFree && <Gift className="w-3 h-3" />} {m.label}
    </span>
  );
};

const PublicEventOrders: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [term, setTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [showStatusSummary, setShowStatusSummary] = useState(false);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !token) return;

    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke('view-event-orders', {
        body: { token, password },
      });

      if (fnError) {
        const ctx = (fnError as any).context;
        let body: any = null;
        try { body = await ctx?.json?.(); } catch { /* resposta sem corpo JSON */ }

        // Sem corpo de resposta a causa não é a senha, e sim a função ausente
        // ou inacessível. Dizer "verifique a senha" aqui manda a pessoa tentar
        // de novo até travar por excesso de tentativas.
        if (body?.message) {
          setError(body.message);
        } else if (ctx?.status === 404) {
          setError('Serviço de consulta indisponível. Avise a organização.');
        } else {
          setError('Não foi possível conectar ao serviço de consulta. Tente novamente.');
        }
        return;
      }
      if (!res?.ok) {
        setError(res?.message || 'Acesso negado.');
        return;
      }
      setData(res as Payload);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opções montadas a partir dos pedidos existentes, não de uma lista fixa:
   * assim o filtro nunca oferece um valor que não retorna nada. Agrupa por
   * rótulo porque paid/approved e pix/pix_stripe são o mesmo para quem lê.
   */
  const buildOptions = (values: (string | null)[], labelOf: (v: string) => string) => {
    const byLabel = new Map<string, string[]>();
    for (const v of values) {
      const key = v || '';
      const label = labelOf(key);
      byLabel.set(label, [...(byLabel.get(label) || []), key]);
    }
    return [...byLabel.entries()]
      .map(([label, raws]) => ({ label, raws: [...new Set(raws)] }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  };

  const statusOptions = useMemo(
    () => data ? buildOptions(data.orders.map(o => o.status), v => STATUS_META[v]?.label || v) : [],
    [data]
  );

  const methodOptions = useMemo(
    () => data ? buildOptions(data.orders.map(o => o.method), v => methodLabel(v)) : [],
    [data]
  );

  const payoutOptions = useMemo(
    () => data ? buildOptions(data.orders.map(o => o.payout?.status || null), v => payoutLabel(v)) : [],
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = term.trim().toLowerCase();

    return data.orders.filter(o => {
      if (statusFilter !== 'all') {
        const group = statusOptions.find(s => s.label === statusFilter);
        if (!group?.raws.includes(o.status)) return false;
      }
      if (methodFilter !== 'all') {
        const group = methodOptions.find(m => m.label === methodFilter);
        if (!group?.raws.includes(o.method || '')) return false;
      }
      if (payoutFilter !== 'all') {
        const group = payoutOptions.find(p => p.label === payoutFilter);
        if (!group?.raws.includes(o.payout?.status || '')) return false;
      }
      if (!q) return true;
      return o.buyer.toLowerCase().includes(q)
        || o.code.toLowerCase().includes(q)
        || o.batch.toLowerCase().includes(q);
    });
  }, [data, term, statusFilter, methodFilter, payoutFilter, statusOptions, methodOptions, payoutOptions]);

  // Os totais acompanham o filtro, senão o cabeçalho contradiz a tabela
  const shownTotals = useMemo(() => {
    const paid = filtered.filter(o => o.status === 'paid' || o.status === 'approved');
    return {
      gross: paid.reduce((s, o) => s + o.gross, 0),
      fee: paid.reduce((s, o) => s + o.fee, 0),
      net: paid.reduce((s, o) => s + o.net, 0),
      // Repassado conta também o pedido estornado depois do repasse: o
      // dinheiro saiu, e é isso que o card de repasses precisa somar
      paidOut: filtered
        .filter(o => o.payout?.status === 'repassado' || o.payout?.status === 'estornado_apos_repasse')
        .reduce((s, o) => s + o.net, 0),
      toPay: paid.filter(o => o.payout?.status === 'pendente').reduce((s, o) => s + o.net, 0),
      awaitingMp: paid.filter(o => o.payout?.status === 'a_liberar').reduce((s, o) => s + o.net, 0),
      refundedAfter: filtered
        .filter(o => o.payout?.status === 'estornado_apos_repasse')
        .reduce((s, o) => s + o.net, 0),
      paidOrders: paid.length,
      tickets: paid.reduce((s, o) => s + o.quantity, 0),
      // O total de ingressos junta vendas e cortesias; o card mostra a divisão
      courtesyTickets: paid
        .filter(o => o.method === 'cortesia' || o.method === 'free')
        .reduce((s, o) => s + o.quantity, 0),
    };
  }, [filtered]);

  const statusSummary = useMemo(() => {
    const acc = new Map<StatusGroupKey, { orders: number; tickets: number; gross: number }>();
    for (const o of filtered) {
      const key = statusGroupOf(o);
      if (!key) continue;
      const cur = acc.get(key) || { orders: 0, tickets: 0, gross: 0 };
      acc.set(key, { orders: cur.orders + 1, tickets: cur.tickets + o.quantity, gross: cur.gross + o.gross });
    }
    const rows = STATUS_GROUPS
      .map(g => ({ ...g, ...(acc.get(g.key) || { orders: 0, tickets: 0, gross: 0 }) }))
      .filter(g => g.always || g.orders > 0);
    const total = rows.reduce(
      (t, r) => ({ orders: t.orders + r.orders, tickets: t.tickets + r.tickets, gross: t.gross + r.gross }),
      { orders: 0, tickets: 0, gross: 0 }
    );
    return { rows, total };
  }, [filtered]);

  const hasFilters = statusFilter !== 'all' || methodFilter !== 'all' || payoutFilter !== 'all' || term.trim() !== '';

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Consulta de pedidos</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Informe a senha de acesso para visualizar.
          </p>

          <form onSubmit={unlock}>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Senha"
              autoComplete="current-password"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
            />

            {error && (
              <div className="flex items-start gap-2 mb-3 p-2.5 bg-red-50 text-red-800 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Acessar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { event } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <header className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-900 truncate">{event.title}</h1>
              <p className="text-sm text-gray-500">
                Consulta de pedidos{data.label ? ` · ${data.label}` : ''}
              </p>
            </div>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Somente leitura
            </span>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {[
            { label: 'Receita Bruta', value: formatPrice(shownTotals.gross), hint: `${shownTotals.paidOrders} pedidos pagos`, Icon: DollarSign, cls: 'bg-emerald-50 text-emerald-600' },
            { label: 'Taxas', value: formatPrice(shownTotals.fee), hint: 'Taxas de serviço', Icon: Receipt, cls: 'bg-amber-50 text-amber-600' },
            { label: 'Receita Líquida', value: formatPrice(shownTotals.net), hint: 'Bruto menos taxas', Icon: Wallet, cls: 'bg-indigo-50 text-indigo-600' },
            {
              label: 'Repassado',
              value: formatPrice(shownTotals.paidOut),
              hint: [
                shownTotals.toPay > 0 ? `${formatPrice(shownTotals.toPay)} a repassar` : null,
                shownTotals.awaitingMp > 0 ? `${formatPrice(shownTotals.awaitingMp)} no Mercado Pago` : null,
                shownTotals.refundedAfter > 0 ? `${formatPrice(shownTotals.refundedAfter)} estornado após repasse` : null,
              ].filter(Boolean).join(' · ') || (shownTotals.paidOrders > 0 ? 'Tudo repassado' : 'Nenhum repasse'),
              Icon: Send,
              cls: 'bg-teal-50 text-teal-600',
            },
            {
              label: 'Ingressos · pagos + cortesias',
              value: String(shownTotals.tickets),
              hint: `${shownTotals.tickets - shownTotals.courtesyTickets} pagos + ${shownTotals.courtesyTickets} cortesia${shownTotals.courtesyTickets !== 1 ? 's' : ''}`,
              Icon: Ticket,
              cls: 'bg-blue-50 text-blue-600',
              onClick: () => setShowStatusSummary(true),
            },
          ].map((k: { label: string; value: string; hint: string; Icon: typeof Ticket; cls: string; onClick?: () => void }) => {
            const content = (
              <>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.cls}`}>
                  <k.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[11px] font-semibold text-gray-500 truncate">{k.label}</p>
                  <h3 className="text-base font-black text-gray-900 truncate">{k.value}</h3>
                  <p className={`text-[11px] truncate ${k.onClick ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{k.hint}</p>
                </div>
                {k.onClick && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
              </>
            );
            return k.onClick ? (
              <button
                key={k.label}
                type="button"
                onClick={k.onClick}
                title="Ver resumo por status"
                aria-label={`${k.label}: ${k.value}. Ver resumo por status`}
                className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                {content}
              </button>
            ) : (
              <div key={k.label} className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
                {content}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar por comprador, código do pedido ou lote..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-gray-500 inline-flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filtros
              </span>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Todos os status</option>
                {statusOptions.map(s => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Todas as formas</option>
                {methodOptions.map(m => (
                  <option key={m.label} value={m.label}>{m.label}</option>
                ))}
              </select>

              <select
                value={payoutFilter}
                onChange={(e) => setPayoutFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Todos os repasses</option>
                {payoutOptions.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>

              <span className="text-xs text-gray-500">
                {filtered.length} de {data.orders.length} pedido{data.orders.length !== 1 ? 's' : ''}
              </span>

              {(statusFilter !== 'all' || methodFilter !== 'all' || payoutFilter !== 'all' || term) && (
                <button
                  onClick={() => { setStatusFilter('all'); setMethodFilter('all'); setPayoutFilter('all'); setTerm(''); }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Comprador</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Lote / Ingressos</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Forma</th>
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Valor Bruto</th>
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Taxa</th>
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Valor Líquido</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : filtered.map(o => (
                  <tr key={o.code} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-gray-900">{o.code}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        {' '}
                        {new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.buyer}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{o.batch}</div>
                      <div className="text-xs text-indigo-600 font-semibold">
                        {o.quantity} ingresso{o.quantity !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3"><MethodBadge method={o.method} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(o.gross)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      {o.fee > 0 ? (
                        <>
                          {formatPrice(o.fee)}
                          {o.fee_percentage > 0 && (
                            <span className="block text-xs text-gray-400">{o.fee_percentage}%</span>
                          )}
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-950">{formatPrice(o.net)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3"><PayoutCell payout={o.payout} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Página de consulta. Os dados não podem ser alterados por aqui.
        </p>

        {showStatusSummary && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowStatusSummary(false); }}
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-start justify-between p-5 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Resumo por status</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasFilters ? 'Considerando os filtros aplicados' : 'Todos os pedidos do evento'}
                  </p>
                </div>
                <button
                  onClick={() => setShowStatusSummary(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">Pedidos</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">Ingressos</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">Valor bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statusSummary.rows.map(r => (
                    <tr key={r.key} className={r.orders === 0 ? 'text-gray-400' : ''}>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1 ${r.cls}`}>
                          <r.Icon className="w-3.5 h-3.5" /> {r.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.orders}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.tickets}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {r.key === 'courtesy' ? <span className="text-gray-400">—</span> : formatPrice(r.gross)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-gray-900">
                  <tr>
                    <td className="px-5 py-3 text-xs uppercase text-gray-500">Total</td>
                    <td className="px-3 py-3 text-right tabular-nums">{statusSummary.total.orders}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{statusSummary.total.tickets}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatPrice(statusSummary.total.gross)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className="px-5 py-3 text-[11px] text-gray-500 border-t border-gray-100">
                Recusados e reembolsados não entram na receita. O card Ingressos soma pagos e cortesias.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEventOrders;
