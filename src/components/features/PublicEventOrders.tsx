import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Lock, Loader2, Eye, Search, DollarSign, Receipt, Wallet, Ticket,
  CheckCircle2, Clock, Ban, RotateCcw, Gift, AlertTriangle, Filter,
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
      if (!q) return true;
      return o.buyer.toLowerCase().includes(q)
        || o.code.toLowerCase().includes(q)
        || o.batch.toLowerCase().includes(q);
    });
  }, [data, term, statusFilter, methodFilter, statusOptions, methodOptions]);

  // Os totais acompanham o filtro, senão o cabeçalho contradiz a tabela
  const shownTotals = useMemo(() => {
    const paid = filtered.filter(o => o.status === 'paid' || o.status === 'approved');
    return {
      gross: paid.reduce((s, o) => s + o.gross, 0),
      fee: paid.reduce((s, o) => s + o.fee, 0),
      net: paid.reduce((s, o) => s + o.net, 0),
      paidOrders: paid.length,
      tickets: paid.reduce((s, o) => s + o.quantity, 0),
    };
  }, [filtered]);

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Receita Bruta', value: formatPrice(shownTotals.gross), hint: `${shownTotals.paidOrders} pedidos pagos`, Icon: DollarSign, cls: 'bg-emerald-50 text-emerald-600' },
            { label: 'Taxas', value: formatPrice(shownTotals.fee), hint: 'Taxas de serviço', Icon: Receipt, cls: 'bg-amber-50 text-amber-600' },
            { label: 'Receita Líquida', value: formatPrice(shownTotals.net), hint: 'Bruto menos taxas', Icon: Wallet, cls: 'bg-indigo-50 text-indigo-600' },
            { label: 'Ingressos', value: String(shownTotals.tickets), hint: `${filtered.length} pedidos listados`, Icon: Ticket, cls: 'bg-blue-50 text-blue-600' },
          ].map(k => (
            <div key={k.label} className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.cls}`}>
                <k.Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 truncate">{k.label}</p>
                <h3 className="text-base font-black text-gray-900 truncate">{k.value}</h3>
                <p className="text-[11px] text-gray-500 truncate">{k.hint}</p>
              </div>
            </div>
          ))}
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

              <span className="text-xs text-gray-500">
                {filtered.length} de {data.orders.length} pedido{data.orders.length !== 1 ? 's' : ''}
              </span>

              {(statusFilter !== 'all' || methodFilter !== 'all' || term) && (
                <button
                  onClick={() => { setStatusFilter('all'); setMethodFilter('all'); setTerm(''); }}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Página de consulta. Os dados não podem ser alterados por aqui.
        </p>
      </div>
    </div>
  );
};

export default PublicEventOrders;
