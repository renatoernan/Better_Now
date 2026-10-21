import React, { useState, useMemo } from 'react';
import {
  BarChart3, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2, X, Filter,
  Layers, Send, PieChart, ArrowUpRight, Check,
} from 'lucide-react';
import { OrderFinancial, EventPayout } from '../../shared/hooks/hooks/useEventPayouts';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { daysSinceRelease } from '../../shared/utils/utils/mpReconciliation';

export type AgingScope = 'pendente' | 'todos' | 'repassado';
export type TodosViewMode = 'barras' | 'pizza';

export interface AgingBucket {
  key: string;
  label: string;
  shortLabel: string;
  days: number | null;
  isOver30: boolean;
  isUnreleased: boolean;
  amount: number;
  count: number;
  orderIds: string[];
  sortWeight: number;
}

export interface RepassadoBarItem {
  id: string;
  key: string;
  dateStr: string;
  amount: number;
  count: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

interface PayoutAgingChartProps {
  orders: OrderFinancial[];
  payouts?: EventPayout[];
  selectedBucket: string | null;
  onSelectBucket: (bucketKey: string | null) => void;
  scope?: AgingScope;
  onScopeChange?: (scope: AgingScope) => void;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '—';

const PayoutAgingChart: React.FC<PayoutAgingChartProps> = ({
  orders,
  payouts = [],
  selectedBucket,
  onSelectBucket,
  scope: externalScope,
  onScopeChange: externalOnScopeChange,
}) => {
  const [internalScope, setInternalScope] = useState<AgingScope>('pendente');
  const [todosViewMode, setTodosViewMode] = useState<TodosViewMode>('barras');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const [hoveredPieSlice, setHoveredPieSlice] = useState<'pendente' | 'repassado' | null>(null);

  const scope = externalScope ?? internalScope;
  const setScope = externalOnScopeChange ?? setInternalScope;

  // ==========================================
  // 1. DADOS DE REPASSADOS (EXECUÇÕES REAIS)
  // ==========================================
  const validPayouts = useMemo(() => {
    return (payouts || [])
      .filter(p => !p.voided_at && p.kind === 'payout')
      .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
  }, [payouts]);

  const repassadoBars = useMemo((): RepassadoBarItem[] => {
    const items: RepassadoBarItem[] = [];
    const accountedOrderIds = new Set<string>();

    // Payouts reais registrados
    if (validPayouts.length > 0) {
      for (const p of validPayouts) {
        const matchingOrders = orders.filter(o => o.payout_id === p.id);
        matchingOrders.forEach(o => accountedOrderIds.add(o.order_id));
        const count = (p.items || []).filter(i => !i.voided_at).length || matchingOrders.length || 1;
        items.push({
          id: p.id,
          key: `payout:${p.id}`,
          dateStr: fmtDate(p.paid_at),
          amount: p.amount,
          count,
          method: p.method || 'Pix',
          reference: p.reference,
          notes: p.notes,
        });
      }
    }

    // Pedidos repassados sem vínculo a validPayouts
    const repassedOrders = orders.filter(o =>
      (o.payout_status === 'repassado' || o.payout_status === 'estornado_apos_repasse') &&
      !accountedOrderIds.has(o.order_id)
    );

    if (repassedOrders.length > 0) {
      const groupMap = new Map<string, RepassadoBarItem>();
      for (const o of repassedOrders) {
        const key = o.payout_id || o.payout_paid_at || 'repassado';
        const existing = groupMap.get(key);
        const amt = o.payout_due || 0;
        if (existing) {
          existing.amount += amt;
          existing.count += 1;
        } else {
          groupMap.set(key, {
            id: key,
            key: `payout:${key}`,
            dateStr: fmtDate(o.payout_paid_at),
            amount: amt,
            count: 1,
            method: 'Pix',
          });
        }
      }
      items.push(...Array.from(groupMap.values()));
    }

    return items;
  }, [validPayouts, orders]);

  const repassadoTotalAmount = useMemo(() => repassadoBars.reduce((s, r) => s + r.amount, 0), [repassadoBars]);
  const repassadoTotalOrders = useMemo(() => repassadoBars.reduce((s, r) => s + r.count, 0), [repassadoBars]);
  const maxRepassadoAmount = useMemo(() => Math.max(...repassadoBars.map(r => r.amount), 1), [repassadoBars]);

  // ==========================================
  // 2. DADOS DE PENDENTES (AGING DE LIBERAÇÃO)
  // ==========================================
  const pendingOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.is_refunded && o.payout_status !== 'estornado_apos_repasse') return false;
      return o.payout_status === 'pendente' || o.payout_status === 'a_liberar';
    });
  }, [orders]);

  const pendingBuckets = useMemo((): AgingBucket[] => {
    const map = new Map<string, AgingBucket>();

    for (const o of pendingOrders) {
      const amount = o.payout_due || 0;
      if (amount <= 0 && !o.is_paid) continue;

      const days = daysSinceRelease(o);

      let key: string;
      let label: string;
      let shortLabel: string;
      let isOver30 = false;
      let isUnreleased = false;
      let sortWeight: number;

      if (days === null) {
        key = 'sem_data';
        label = 'Sem data MP';
        shortLabel = 'S/ data';
        sortWeight = -9999;
      } else if (days < 0) {
        key = '<0';
        label = `A liberar (em ${-days} dia${-days !== 1 ? 's' : ''})`;
        shortLabel = `-${-days}d`;
        isUnreleased = true;
        sortWeight = -1000 + days;
      } else if (days > 30) {
        key = '>30';
        label = 'Liberado há > 30 dias';
        shortLabel = '> 30d';
        isOver30 = true;
        sortWeight = 9999;
      } else {
        key = String(days);
        label = days === 0 ? 'Liberado hoje (0 dias)' : days === 1 ? 'Liberado há 1 dia' : `Liberado há ${days} dias`;
        shortLabel = days === 0 ? 'Hoje' : `${days}d`;
        sortWeight = days;
      }

      const existing = map.get(key);
      if (existing) {
        existing.amount += amount;
        existing.count += 1;
        existing.orderIds.push(o.order_id);
      } else {
        map.set(key, {
          key,
          label,
          shortLabel,
          days,
          isOver30,
          isUnreleased,
          amount,
          count: 1,
          orderIds: [o.order_id],
          sortWeight,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.sortWeight - a.sortWeight);
  }, [pendingOrders]);

  const pendingTotalAmount = useMemo(() => pendingBuckets.reduce((s, b) => s + b.amount, 0), [pendingBuckets]);
  const pendingTotalCount = useMemo(() => pendingBuckets.reduce((s, b) => s + b.count, 0), [pendingBuckets]);
  const maxPendingAmount = useMemo(() => Math.max(...pendingBuckets.map(b => b.amount), 1), [pendingBuckets]);

  const pendingSummaryTiers = useMemo(() => {
    let over30 = { amount: 0, count: 0 };
    let mid = { amount: 0, count: 0 };
    let recent = { amount: 0, count: 0 };
    let unreleased = { amount: 0, count: 0 };

    for (const b of pendingBuckets) {
      if (b.isOver30) {
        over30.amount += b.amount;
        over30.count += b.count;
      } else if (b.isUnreleased) {
        unreleased.amount += b.amount;
        unreleased.count += b.count;
      } else if (b.days !== null && b.days > 7) {
        mid.amount += b.amount;
        mid.count += b.count;
      } else {
        recent.amount += b.amount;
        recent.count += b.count;
      }
    }

    return { over30, mid, recent, unreleased };
  }, [pendingBuckets]);

  // ==========================================
  // 3. TOTALIZAÇÃO GERAL (PIZZA E VISÃO TODOS)
  // ==========================================
  const grandTotalAmount = useMemo(() => pendingTotalAmount + repassadoTotalAmount, [pendingTotalAmount, repassadoTotalAmount]);
  const grandTotalOrders = useMemo(() => pendingTotalCount + repassadoTotalOrders, [pendingTotalCount, repassadoTotalOrders]);

  const pendingPercent = grandTotalAmount > 0 ? (pendingTotalAmount / grandTotalAmount) * 100 : 0;
  const repassadoPercent = grandTotalAmount > 0 ? (repassadoTotalAmount / grandTotalAmount) * 100 : 0;

  // Bucket ativo
  const activeBucket = pendingBuckets.find(b => b.key === selectedBucket) || null;
  const activeRepassado = repassadoBars.find(r => r.key === selectedBucket || r.id === selectedBucket) || null;

  // Circunferência para gráfico Donut SVG
  const pieRadius = 64;
  const pieCircumference = 2 * Math.PI * pieRadius;
  const pendingDash = (pendingPercent / 100) * pieCircumference;
  const repassadoDash = (repassadoPercent / 100) * pieCircumference;

  // ==========================================================
  // RENDER: GRÁFICO DE BARRAS DE PENDENTES (AGING DE LIBERAÇÃO)
  // ==========================================================
  const renderPendingBarsSection = (isEmbedded = false) => {
    return (
      <div className={`space-y-4 ${isEmbedded ? 'p-4 sm:p-5 bg-purple-50/20 rounded-2xl border border-purple-100/80' : ''}`}>
        {isEmbedded && (
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">
                  1. Valores Pendentes por Prazo de Liberação
                </h4>
                <p className="text-[11px] text-gray-500">
                  Agrupados por dias desde a liberação no Mercado Pago com previsão de alcançar 30 dias
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {formatPrice(pendingTotalAmount)} · {pendingTotalCount} pedidos
            </span>
          </div>
        )}

        {/* Mini-cards de urgência */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div
            onClick={() => onSelectBucket(selectedBucket === '>30' ? null : '>30')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedBucket === '>30'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-400/40'
                : 'bg-red-50/40 border-red-100 hover:bg-red-50/80 hover:border-red-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-red-700 mb-0.5">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> &gt; 30 dias (Crítico)
              </span>
              <span className="text-[11px] text-red-600/80">{pendingSummaryTiers.over30.count} ped.</span>
            </div>
            <p className="text-lg font-bold text-red-900 tabular-nums">
              {formatPrice(pendingSummaryTiers.over30.amount)}
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-amber-50/40 border-amber-100">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 mb-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 8 a 30 dias (Atenção)
              </span>
              <span className="text-[11px] text-amber-600/80">{pendingSummaryTiers.mid.count} ped.</span>
            </div>
            <p className="text-lg font-bold text-amber-900 tabular-nums">
              {formatPrice(pendingSummaryTiers.mid.amount)}
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-purple-50/40 border-purple-100">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-700 mb-0.5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 0 a 7 dias (Recente)
              </span>
              <span className="text-[11px] text-purple-600/80">{pendingSummaryTiers.recent.count} ped.</span>
            </div>
            <p className="text-lg font-bold text-purple-900 tabular-nums">
              {formatPrice(pendingSummaryTiers.recent.amount)}
            </p>
          </div>

          {pendingSummaryTiers.unreleased.count > 0 ? (
            <div
              onClick={() => onSelectBucket(selectedBucket === '<0' ? null : '<0')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                selectedBucket === '<0'
                  ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/40'
                  : 'bg-sky-50/40 border-sky-100 hover:bg-sky-50/80 hover:border-sky-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-sky-700 mb-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> A liberar no MP
                </span>
                <span className="text-[11px] text-sky-600/80">{pendingSummaryTiers.unreleased.count} ped.</span>
              </div>
              <p className="text-lg font-bold text-sky-900 tabular-nums">
                {formatPrice(pendingSummaryTiers.unreleased.amount)}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border bg-gray-50/60 border-gray-100">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-0.5">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Total Pendente
                </span>
                <span className="text-[11px] text-gray-400">{pendingTotalCount} ped.</span>
              </div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {formatPrice(pendingTotalAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Barras de Aging */}
        {pendingBuckets.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 bg-white/60 rounded-xl border border-dashed border-gray-200">
            Nenhum repasse pendente no momento.
          </div>
        ) : (
          <div className="relative pt-6 pb-2 flex items-stretch bg-white/70 rounded-xl border border-gray-100 p-2">
            {/* Eixo Y fixo */}
            <div className="w-24 shrink-0 flex flex-col justify-between pt-8 pb-[88px] text-right pr-3 text-[10px] text-gray-400 font-medium select-none pointer-events-none">
              <span className="leading-none tabular-nums truncate">{formatPrice(maxPendingAmount)}</span>
              <span className="leading-none tabular-nums truncate">{formatPrice(maxPendingAmount * 0.66)}</span>
              <span className="leading-none tabular-nums truncate">{formatPrice(maxPendingAmount * 0.33)}</span>
              <span className="leading-none tabular-nums truncate">R$ 0,00</span>
            </div>

            {/* Área das Barras com borda e espaçamento */}
            <div className="relative flex-1 min-w-0 overflow-x-auto overflow-y-visible pb-2 pt-8 border-l border-gray-200/80">
              <div className="absolute inset-x-0 top-8 bottom-[88px] pointer-events-none flex flex-col justify-between opacity-50">
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
              </div>

              <div
                className="flex items-end gap-2.5 sm:gap-3.5 pl-5 pr-4 h-56 sm:h-60 relative z-10"
                style={{ minWidth: Math.max(pendingBuckets.length * 76, 340) }}
              >
                {pendingBuckets.map((b) => {
                  const isSelected = selectedBucket === b.key;
                  const isHovered = hoveredBucket === b.key;
                  const heightPercent = Math.max((b.amount / maxPendingAmount) * 100, 7);

                  let forecast: { dateStr: string; hint: string; isOverdue: boolean } | null = null;
                  if (b.days !== null) {
                    if (b.isOver30 || b.days > 30) {
                      forecast = {
                        dateStr: 'Imediato',
                        hint: 'Já ultrapassou 30 dias de liberação',
                        isOverdue: true,
                      };
                    } else {
                      const remainingDays = 30 - b.days;
                      const target = new Date();
                      target.setHours(12, 0, 0, 0);
                      target.setDate(target.getDate() + remainingDays);
                      forecast = {
                        dateStr: target.toLocaleDateString('pt-BR'),
                        hint: remainingDays === 0
                          ? 'Completa 30 dias hoje'
                          : remainingDays === 1
                            ? 'Falta 1 dia (amanhã)'
                            : `Faltam ${remainingDays} dias`,
                        isOverdue: false,
                      };
                    }
                  }

                  let barColor = 'from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white shadow-purple-500/20';
                  let labelColor = 'text-gray-700';

                  if (b.isOver30) {
                    barColor = 'from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white shadow-red-500/25';
                    labelColor = 'text-red-700 font-bold';
                  } else if (b.isUnreleased) {
                    barColor = 'from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-sky-500/20';
                    labelColor = 'text-sky-700';
                  } else if (b.days !== null && b.days > 7) {
                    barColor = 'from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white shadow-amber-500/20';
                    labelColor = 'text-amber-800 font-semibold';
                  }

                  return (
                    <div
                      key={b.key}
                      onClick={() => onSelectBucket(isSelected ? null : b.key)}
                      onMouseEnter={() => setHoveredBucket(b.key)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      className={`group relative flex-1 min-w-[66px] max-w-[88px] flex flex-col items-center justify-end h-full cursor-pointer transition-all duration-200 ${
                        isSelected ? 'scale-105 z-20' : 'hover:scale-[1.02] z-10'
                      }`}
                    >
                      {/* Tooltip flutuante */}
                      {isHovered && (
                        <div className="absolute -top-24 z-30 pointer-events-none transform -translate-x-1/2 left-1/2 whitespace-nowrap bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl animate-fadeIn">
                          <p className="font-bold">{b.label}</p>
                          <p className="text-purple-300 font-mono text-[11px] mt-0.5">
                            {formatPrice(b.amount)} · {b.count} pedido{b.count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {((b.amount / (pendingTotalAmount || 1)) * 100).toFixed(1)}% dos pendentes
                          </p>
                          {forecast && (
                            <div className="mt-1 pt-1 border-t border-gray-700/80 text-[10px]">
                              <span className="text-gray-300">Previsão do repasse: </span>
                              <strong className={forecast.isOverdue ? 'text-rose-400' : 'text-amber-300'}>
                                {forecast.dateStr}
                              </strong>
                              <span className="text-gray-400 block text-[9px]">({forecast.hint})</span>
                            </div>
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}

                      {/* Valor acima da barra: exato sem R$ */}
                      <span
                        className={`mb-1.5 text-[11px] font-bold tabular-nums text-center transition-colors whitespace-nowrap px-0.5 ${
                          isSelected
                            ? 'text-purple-900 scale-110 font-extrabold'
                            : isHovered
                              ? 'text-gray-900'
                              : 'text-gray-600'
                        }`}
                        title={formatPrice(b.amount)}
                      >
                        {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>

                      {/* Coluna da Barra */}
                      <div
                        className={`w-full rounded-t-xl bg-gradient-to-t shadow-sm transition-all duration-300 relative ${barColor} ${
                          isSelected
                            ? 'ring-2 ring-purple-600 ring-offset-2 brightness-110 shadow-md'
                            : ''
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-white/20 rounded-t-xl" />
                      </div>

                      {/* Rótulo inferior da barra */}
                      <div className="mt-2 text-center w-full flex flex-col items-center">
                        <p className={`text-xs truncate ${labelColor}`}>
                          {b.shortLabel}
                        </p>
                        <p className="text-[10px] text-gray-400 group-hover:text-gray-600 truncate">
                          {b.count} ped.
                        </p>

                        {forecast && (
                          <div
                            className={`mt-1.5 w-full pt-1 pb-1 px-1 rounded-md border text-center transition-colors ${
                              forecast.isOverdue
                                ? 'bg-red-50/70 border-red-200/80 text-red-700'
                                : 'bg-purple-50/50 border-purple-100 text-purple-900 group-hover:border-purple-200'
                            }`}
                            title={`Previsão de repasse (ao atingir 30 dias): ${forecast.dateStr} · ${forecast.hint}`}
                          >
                            <span className="block text-[8px] font-semibold uppercase tracking-wider text-gray-500 leading-tight">
                              Prev. repasse
                            </span>
                            <span
                              className={`block text-[10px] font-bold tabular-nums leading-tight truncate ${
                                forecast.isOverdue ? 'text-red-700 font-extrabold' : 'text-purple-950'
                              }`}
                            >
                              {forecast.dateStr}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================
  // RENDER: GRÁFICO DE BARRAS DE REPASSADOS (EXECUÇÕES REAIS)
  // ==========================================================
  const renderRepassadoBarsSection = (isEmbedded = false) => {
    return (
      <div className={`space-y-4 ${isEmbedded ? 'p-4 sm:p-5 bg-emerald-50/20 rounded-2xl border border-emerald-100/80' : ''}`}>
        {isEmbedded && (
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">
                  2. Repasses Realizados
                </h4>
                <p className="text-[11px] text-gray-500">
                  Histórico de repasses já executados com data, valor e quantidade de pedidos (sem previsão)
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {formatPrice(repassadoTotalAmount)} · {repassadoBars.length} repasse{repassadoBars.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Mini-cards de execuções */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl border bg-emerald-50/40 border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-0.5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Total Repassado
              </span>
              <span className="text-[11px] text-emerald-600/80">{repassadoTotalOrders} ped.</span>
            </div>
            <p className="text-lg font-bold text-emerald-900 tabular-nums">
              {formatPrice(repassadoTotalAmount)}
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-emerald-50/40 border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-0.5">
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Repasses Realizados
              </span>
              <span className="text-[11px] text-emerald-600/80">executados</span>
            </div>
            <p className="text-lg font-bold text-emerald-900 tabular-nums">
              {repassadoBars.length} {repassadoBars.length !== 1 ? 'repasses' : 'repasse'}
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-gray-50/60 border-gray-100">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Último Repasse
              </span>
            </div>
            <p className="text-base font-bold text-gray-900 tabular-nums truncate">
              {repassadoBars.length > 0 ? repassadoBars[repassadoBars.length - 1].dateStr : '—'}
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-gray-50/60 border-gray-100">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Média por Repasse
              </span>
            </div>
            <p className="text-base font-bold text-gray-900 tabular-nums truncate">
              {repassadoBars.length > 0
                ? formatPrice(repassadoTotalAmount / repassadoBars.length)
                : '—'}
            </p>
          </div>
        </div>

        {/* Barras de Repasse */}
        {repassadoBars.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 bg-white/60 rounded-xl border border-dashed border-gray-200">
            Nenhum repasse realizado registrado até o momento.
          </div>
        ) : (
          <div className="relative pt-6 pb-2 flex items-stretch bg-white/70 rounded-xl border border-gray-100 p-2">
            {/* Eixo Y fixo */}
            <div className="w-24 shrink-0 flex flex-col justify-between pt-8 pb-[88px] text-right pr-3 text-[10px] text-gray-400 font-medium select-none pointer-events-none">
              <span className="leading-none tabular-nums truncate">{formatPrice(maxRepassadoAmount)}</span>
              <span className="leading-none tabular-nums truncate">{formatPrice(maxRepassadoAmount * 0.66)}</span>
              <span className="leading-none tabular-nums truncate">{formatPrice(maxRepassadoAmount * 0.33)}</span>
              <span className="leading-none tabular-nums truncate">R$ 0,00</span>
            </div>

            {/* Área das Barras de Repasse */}
            <div className="relative flex-1 min-w-0 overflow-x-auto overflow-y-visible pb-2 pt-8 border-l border-gray-200/80">
              <div className="absolute inset-x-0 top-8 bottom-[88px] pointer-events-none flex flex-col justify-between opacity-50">
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
                <div className="border-b border-gray-200" />
              </div>

              <div
                className="flex items-end gap-3 sm:gap-4 pl-5 pr-4 h-56 sm:h-60 relative z-10"
                style={{ minWidth: Math.max(repassadoBars.length * 84, 320) }}
              >
                {repassadoBars.map((r) => {
                  const isSelected = selectedBucket === r.key || selectedBucket === r.id;
                  const isHovered = hoveredBucket === r.key;
                  const heightPercent = Math.max((r.amount / maxRepassadoAmount) * 100, 8);

                  return (
                    <div
                      key={r.key}
                      onClick={() => onSelectBucket(isSelected ? null : r.key)}
                      onMouseEnter={() => setHoveredBucket(r.key)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      className={`group relative flex-1 min-w-[70px] max-w-[96px] flex flex-col items-center justify-end h-full cursor-pointer transition-all duration-200 ${
                        isSelected ? 'scale-105 z-20' : 'hover:scale-[1.02] z-10'
                      }`}
                    >
                      {/* Tooltip flutuante */}
                      {isHovered && (
                        <div className="absolute -top-24 z-30 pointer-events-none transform -translate-x-1/2 left-1/2 whitespace-nowrap bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl animate-fadeIn">
                          <p className="font-bold">Repasse em {r.dateStr}</p>
                          <p className="text-emerald-300 font-mono text-[11px] mt-0.5">
                            {formatPrice(r.amount)} · {r.count} pedido{r.count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-[10px] text-gray-300">Forma: {r.method}</p>
                          {r.reference && <p className="text-[10px] text-gray-400">Ref: {r.reference}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {((r.amount / (repassadoTotalAmount || 1)) * 100).toFixed(1)}% do total repassado
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}

                      {/* Valor exato no topo sem "R$" */}
                      <span
                        className={`mb-1.5 text-[11px] font-bold tabular-nums text-center transition-colors whitespace-nowrap px-0.5 ${
                          isSelected
                            ? 'text-emerald-900 scale-110 font-extrabold'
                            : isHovered
                              ? 'text-gray-900'
                              : 'text-gray-700'
                        }`}
                        title={formatPrice(r.amount)}
                      >
                        {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>

                      {/* Coluna da Barra - Verde Esmeralda */}
                      <div
                        className={`w-full rounded-t-xl bg-gradient-to-t from-emerald-600 via-green-500 to-teal-400 text-white shadow-sm shadow-green-500/20 transition-all duration-300 relative group-hover:from-emerald-700 group-hover:to-green-600 ${
                          isSelected
                            ? 'ring-2 ring-emerald-600 ring-offset-2 brightness-110 shadow-md'
                            : ''
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-white/25 rounded-t-xl" />
                      </div>

                      {/* Rótulo inferior da barra: Data, Pedidos e Forma (sem badge de previsão) */}
                      <div className="mt-2 text-center w-full flex flex-col items-center">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {r.dateStr}
                        </p>
                        <p className="text-[10px] text-gray-500 group-hover:text-gray-700 truncate">
                          {r.count} ped.
                        </p>
                        <span className="mt-1 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 bg-emerald-50 rounded border border-emerald-200/80 truncate max-w-full">
                          {r.method}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================
  // RENDER: GRÁFICO PIZZA COM 2 DIVISÕES (A REPASSAR VS REPASSADOS)
  // ==========================================================
  const renderPieChartSection = () => {
    return (
      <div className="space-y-6 pt-1">
        {/* Banner Explicativo com Botão de Alternar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-purple-600" />
              Proporção Geral: A Repassar vs Repassados
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Divisão percentual e totalização de valores já pagos versus saldo pendente de liberação
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
              Total do Evento: <strong>{formatPrice(grandTotalAmount)}</strong> ({grandTotalOrders} pedidos)
            </span>
            <button
              onClick={() => setTodosViewMode('barras')}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Ver em Barras
            </button>
          </div>
        </div>

        {/* Grid: Donut Chart à esquerda e Cards de Totalização à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Coluna do Gráfico Pizza SVG */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100 relative">
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                {/* Trilha base de fundo */}
                <circle
                  cx="80"
                  cy="80"
                  r={pieRadius}
                  stroke="#f3f4f6"
                  strokeWidth="22"
                  fill="none"
                />

                {grandTotalAmount > 0 ? (
                  <>
                    {/* Fatia: A Repassar (Roxo) */}
                    {pendingTotalAmount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={pieRadius}
                        stroke="#8b5cf6"
                        strokeWidth={hoveredPieSlice === 'pendente' ? 26 : 22}
                        strokeDasharray={`${pendingDash} ${pieCircumference - pendingDash}`}
                        strokeDashoffset={0}
                        fill="none"
                        className="transition-all duration-300 cursor-pointer hover:stroke-purple-600"
                        onMouseEnter={() => setHoveredPieSlice('pendente')}
                        onMouseLeave={() => setHoveredPieSlice(null)}
                        onClick={() => {
                          setScope('pendente');
                          onSelectBucket(null);
                        }}
                      />
                    )}

                    {/* Fatia: Repassados (Esmeralda) */}
                    {repassadoTotalAmount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={pieRadius}
                        stroke="#10b981"
                        strokeWidth={hoveredPieSlice === 'repassado' ? 26 : 22}
                        strokeDasharray={`${repassadoDash} ${pieCircumference - repassadoDash}`}
                        strokeDashoffset={-pendingDash}
                        fill="none"
                        className="transition-all duration-300 cursor-pointer hover:stroke-emerald-600"
                        onMouseEnter={() => setHoveredPieSlice('repassado')}
                        onMouseLeave={() => setHoveredPieSlice(null)}
                        onClick={() => {
                          setScope('repassado');
                          onSelectBucket(null);
                        }}
                      />
                    )}
                  </>
                ) : (
                  <circle
                    cx="80"
                    cy="80"
                    r={pieRadius}
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    fill="none"
                  />
                )}
              </svg>

              {/* Informações centrais dentro do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">
                  Total Geral
                </span>
                <span className="text-base sm:text-lg font-extrabold text-gray-900 tabular-nums leading-tight mt-1">
                  {formatPrice(grandTotalAmount)}
                </span>
                <span className="text-[11px] font-medium text-gray-500 mt-0.5">
                  {grandTotalOrders} {grandTotalOrders !== 1 ? 'pedidos' : 'pedido'}
                </span>
              </div>
            </div>

            {/* Legenda rápida abaixo do Donut */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs">
              <button
                onClick={() => { setScope('pendente'); onSelectBucket(null); }}
                className="flex items-center gap-1.5 text-gray-700 hover:text-purple-700 font-medium transition-colors"
              >
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-2xs" />
                <span>A repassar ({pendingPercent.toFixed(1)}%)</span>
              </button>
              <button
                onClick={() => { setScope('repassado'); onSelectBucket(null); }}
                className="flex items-center gap-1.5 text-gray-700 hover:text-emerald-700 font-medium transition-colors"
              >
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-2xs" />
                <span>Repassados ({repassadoPercent.toFixed(1)}%)</span>
              </button>
            </div>
          </div>

          {/* Coluna dos Cards Detalhados de Totalização */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Divisão 1: A Repassar */}
            <div
              onClick={() => { setScope('pendente'); onSelectBucket(null); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                hoveredPieSlice === 'pendente'
                  ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/30 shadow-sm'
                  : 'bg-white border-purple-100 hover:bg-purple-50/50 hover:border-purple-200 shadow-2xs'
              }`}
              onMouseEnter={() => setHoveredPieSlice('pendente')}
              onMouseLeave={() => setHoveredPieSlice(null)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                        Divisão 1 · A Repassar
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800">
                        {pendingPercent.toFixed(1)}% do total
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Valores com status pendente ou a liberar no Mercado Pago
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-purple-700 transition-colors" />
              </div>

              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-purple-100/60">
                <div>
                  <span className="text-xl font-extrabold text-gray-900 tabular-nums">
                    {formatPrice(pendingTotalAmount)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({pendingTotalCount} {pendingTotalCount !== 1 ? 'pedidos' : 'pedido'})
                  </span>
                </div>
                <span className="text-xs font-semibold text-purple-700 group-hover:underline">
                  Ver pedidos pendentes &rarr;
                </span>
              </div>

              {/* Barra visual de proporção */}
              <div className="mt-2.5 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pendingPercent}%` }}
                />
              </div>
            </div>

            {/* Divisão 2: Repassados */}
            <div
              onClick={() => { setScope('repassado'); onSelectBucket(null); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                hoveredPieSlice === 'repassado'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30 shadow-sm'
                  : 'bg-white border-emerald-100 hover:bg-emerald-50/50 hover:border-emerald-200 shadow-2xs'
              }`}
              onMouseEnter={() => setHoveredPieSlice('repassado')}
              onMouseLeave={() => setHoveredPieSlice(null)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Divisão 2 · Repassados
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {repassadoPercent.toFixed(1)}% do total
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Valores já transferidos e confirmados ({repassadoBars.length} {repassadoBars.length !== 1 ? 'repasses executados' : 'repasse executado'})
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-700 transition-colors" />
              </div>

              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-emerald-100/60">
                <div>
                  <span className="text-xl font-extrabold text-gray-900 tabular-nums">
                    {formatPrice(repassadoTotalAmount)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({repassadoTotalOrders} {repassadoTotalOrders !== 1 ? 'pedidos' : 'pedido'})
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 group-hover:underline">
                  Ver pedidos repassados &rarr;
                </span>
              </div>

              {/* Barra visual de proporção */}
              <div className="mt-2.5 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${repassadoPercent}%` }}
                />
              </div>
            </div>

            {/* Totalização Comparativa */}
            <div className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>
                  Taxa de liquidação: <strong>{repassadoPercent.toFixed(1)}%</strong> concluída
                </span>
              </div>
              <div>
                <span>Saldo em aberto: </span>
                <strong className="text-purple-700">{formatPrice(pendingTotalAmount)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden transition-all">
      {/* Cabeçalho do Card */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 sm:p-2.5 rounded-xl text-white shadow-xs shrink-0 ${
            scope === 'repassado'
              ? 'bg-gradient-to-br from-emerald-600 to-green-600 shadow-emerald-500/25'
              : scope === 'todos'
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-500/25'
                : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/25'
          }`}>
            {scope === 'repassado' ? (
              <Send className="w-5 h-5" />
            ) : scope === 'todos' ? (
              todosViewMode === 'pizza' ? <PieChart className="w-5 h-5" /> : <Layers className="w-5 h-5" />
            ) : (
              <BarChart3 className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {scope === 'repassado'
                  ? 'Repasses Realizados'
                  : scope === 'todos'
                    ? (todosViewMode === 'pizza' ? 'Gráfico Pizza de Repasses (A Repassar vs Repassados)' : 'Repasses — Visão Geral (Dois Gráficos)')
                    : 'Repasses por Prazo de Liberação'}
              </h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                scope === 'repassado'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                  : scope === 'todos'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200/70'
                    : 'bg-purple-50 text-purple-700 border-purple-200/60'
              }`}>
                {scope === 'repassado'
                  ? `${formatPrice(repassadoTotalAmount)} · ${repassadoBars.length} repasse${repassadoBars.length !== 1 ? 's' : ''}`
                  : scope === 'todos'
                    ? `${formatPrice(grandTotalAmount)} · ${grandTotalOrders} pedidos`
                    : `${formatPrice(pendingTotalAmount)} · ${pendingTotalCount} pedidos`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {scope === 'repassado'
                ? 'Histórico e valores dos repasses já executados com data e quantidade de pedidos'
                : scope === 'todos'
                  ? (todosViewMode === 'pizza'
                      ? 'Totalização e proporção visual entre valores a repassar e já repassados'
                      : 'Dois gráficos independentes: Repasses pendentes por liberação e Repasses realizados')
                  : 'Valores pendentes agrupados por dias de liberação no Mercado Pago'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Alternador de Modo de Visualização quando em 'Todos' */}
          {scope === 'todos' && (
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium border border-gray-200/70">
              <button
                onClick={() => setTodosViewMode('barras')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  todosViewMode === 'barras'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Mostrar os dois gráficos de forma independente"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Barras (Dois Gráficos)</span>
              </button>
              <button
                onClick={() => setTodosViewMode('pizza')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  todosViewMode === 'pizza'
                    ? 'bg-white text-purple-700 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Mostrar gráfico pizza com 2 divisões (A repassar e repassados)"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Pizza (2 Divisões)</span>
              </button>
            </div>
          )}

          {/* Seletor de Escopo */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => { setScope('pendente'); onSelectBucket(null); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                scope === 'pendente'
                  ? 'bg-white text-purple-700 font-semibold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => { setScope('todos'); onSelectBucket(null); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                scope === 'todos'
                  ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setScope('repassado'); onSelectBucket(null); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                scope === 'repassado'
                  ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Repassados
            </button>
          </div>

          {/* Recolher / Expandir */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? 'Expandir gráfico' : 'Recolher gráfico'}
            aria-label={isCollapsed ? 'Expandir gráfico' : 'Recolher gráfico'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* BARRA ATIVA DE FILTRO (quando um bucket ou repasse estiver selecionado) */}
          {activeRepassado ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs border border-emerald-200 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Filtrando tabela abaixo: <strong>Repasse de {activeRepassado.dateStr}</strong> · {formatPrice(activeRepassado.amount)} ({activeRepassado.count} pedido{activeRepassado.count !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={() => onSelectBucket(null)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtro
              </button>
            </div>
          ) : activeBucket ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-50 text-purple-900 text-xs border border-purple-200 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  Filtrando tabela abaixo: <strong>{activeBucket.label}</strong> · {formatPrice(activeBucket.amount)} ({activeBucket.count} pedido{activeBucket.count !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={() => onSelectBucket(null)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtro
              </button>
            </div>
          ) : null}

          {/* CONTEÚDO BASEADO NO ESCOPO E NO MODO SELECIONADO */}
          {scope === 'pendente' && renderPendingBarsSection(false)}

          {scope === 'repassado' && renderRepassadoBarsSection(false)}

          {scope === 'todos' && (
            todosViewMode === 'pizza' ? (
              renderPieChartSection()
            ) : (
              /* MODO TODOS: MOSTRAR OS DOIS GRÁFICOS DE FORMA INDEPENDENTE */
              <div className="space-y-6">
                {/* Banner de atalho para Pizza */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-indigo-100 text-xs">
                  <span className="text-gray-700">
                    💡 Visualizando <strong>dois gráficos independentes</strong> (Pendentes e Repassados).
                  </span>
                  <button
                    onClick={() => setTodosViewMode('pizza')}
                    className="font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    Ver Gráfico Pizza (2 Divisões) &rarr;
                  </button>
                </div>

                {/* Gráfico 1: Pendentes */}
                {renderPendingBarsSection(true)}

                {/* Divisória elegante */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Resumo Integrado
                    </span>
                  </div>
                </div>

                {/* Gráfico 2: Repassados */}
                {renderRepassadoBarsSection(true)}
              </div>
            )
          )}

          {/* DICA DE INTERAÇÃO NA BASE */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 flex-wrap gap-2">
            {scope === 'repassado' ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Repasse realizado com sucesso
                </span>
                <span className="text-gray-500">
                  💡 Cada barra representa um repasse executado com sua data, valor e pedidos contemplados
                </span>
              </>
            ) : scope === 'todos' ? (
              todosViewMode === 'pizza' ? (
                <>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> A Repassar
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Repassados
                    </span>
                  </span>
                  <span className="text-gray-500">
                    💡 Clique em qualquer fatia ou card para navegar diretamente para os pedidos correspondentes
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> &gt; 30d
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> 8 a 30d
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-600" /> 0 a 7d
                    </span>
                    <span className="flex items-center gap-1 ml-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Repassados
                    </span>
                  </span>
                  <span className="text-gray-500">
                    💡 Visão completa: analise os prazos de liberação dos pendentes e o histórico dos repasses efetuados
                  </span>
                </>
              )
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> &gt; 30d (Crítico / Imediato)
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-2" /> 8 a 30d (Atenção)
                  <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 ml-2" /> 0 a 7d (Recente)
                </span>
                <span className="text-gray-500">
                  📅 <strong>Prev. repasse:</strong> data prevista para o lote alcançar 30 dias de liberação no Mercado Pago
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutAgingChart;
