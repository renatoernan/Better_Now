import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Filter, Download, Ticket, DollarSign, Clock, 
  CheckCircle2, XCircle, Eye, FileText, Globe, RefreshCw, User, Phone, 
  Calendar, Layers, CreditCard, ChevronRight, AlertCircle, Ban, Trash2, RotateCcw, Zap, MessageSquare, Gift
} from 'lucide-react';
import { Event } from '../../shared/types/types/event';
import { useEventOrders, EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import AdminOrderDetailModal from '../shared/AdminOrderDetailModal';
import AdminPaymentProofAuditModal from '../shared/AdminPaymentProofAuditModal';
import AdminCancelOrderConfirmModal from '../shared/AdminCancelOrderConfirmModal';
import AdminRestoreOrderConfirmModal from '../shared/AdminRestoreOrderConfirmModal';
import AdminIssueComplimentaryModal from '../shared/AdminIssueComplimentaryModal';
import { toast } from 'sonner';

interface AdminEventOrdersProps {
  event: Event;
  onBack: () => void;
}

export const AdminEventOrders: React.FC<AdminEventOrdersProps> = ({ event, onBack }) => {
  const { 
    orders, 
    loading, 
    syncing, 
    kpis, 
    refetch, 
    approvePixProof, 
    rejectPixProof, 
    cancelOrder, 
    restoreOrder, 
    syncOrderWithMercadoPago, 
    syncAllPendingWithMercadoPago,
    sendManualOrderNotification,
  } = useEventOrders(event.id);

  // Estados de busca e filtros (Padrão: Pagos e Pendentes selecionados)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['paid', 'pending']);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  // Estados dos modais
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<EventOrderRecord | null>(null);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<EventOrderRecord | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<EventOrderRecord | null>(null);
  const [orderToRestore, setOrderToRestore] = useState<EventOrderRecord | null>(null);
  const [showComplimentaryModal, setShowComplimentaryModal] = useState<boolean>(false);

  // Alternar status selecionado (múltipla escolha)
  const toggleStatus = (statusKey: string) => {
    setSelectedStatuses(prev => 
      prev.includes(statusKey) 
        ? prev.filter(s => s !== statusKey)
        : [...prev, statusKey]
    );
  };

  // Filtragem das ordens
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client_phone?.includes(searchTerm) ||
        order.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client_document?.includes(searchTerm) ||
        order.ip_address?.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatuses.length === 0 ||
        (selectedStatuses.includes('paid') && (order.status === 'paid' || (order.status as string) === 'approved')) ||
        (selectedStatuses.includes('pending') && (order.status === 'pending' || order.status === 'pending_proof')) ||
        (selectedStatuses.includes('cancelled') && (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'failed'));

      const matchesPayment =
        paymentFilter === 'all' || order.payment_method === paymentFilter;

      const matchesBatch =
        batchFilter === 'all' || order.batch_name === batchFilter || String(order.batch_index) === batchFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesBatch;
    });
  }, [orders, searchTerm, selectedStatuses, paymentFilter, batchFilter]);

  // Lista de lotes únicos para o filtro
  const uniqueBatches = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.batch_name) set.add(o.batch_name);
    });
    return Array.from(set);
  }, [orders]);

  // Exportar dados para CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.info('Nenhuma ordem para exportar.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Data/Hora',
      'Status',
      'Comprador',
      'CPF',
      'WhatsApp',
      'E-mail',
      'IP',
      'Lote',
      'Qtd Ingressos',
      'Forma Pagamento',
      'Taxa',
      'Total Pago (R$)',
      'Participantes Nominais'
    ];

    const rows = filteredOrders.map((o) => {
      const attendees = (o.tickets || [])
        .map((t) => `${t.person?.nome || o.client_name || 'Participante'} (${t.ticket_number})`)
        .join(' | ');

      return [
        o.id,
        new Date(o.created_at).toLocaleString('pt-BR'),
        o.status,
        `"${o.client_name || ''}"`,
        o.client_document || '',
        o.client_phone || '',
        o.client_email || '',
        o.ip_address || '',
        `"${o.batch_name || ''}"`,
        o.quantity,
        o.payment_method || '',
        o.convenience_fee || 0,
        o.amount_total,
        `"${attendees}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ordens_${event.title.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório CSV exportado com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
          </span>
        );
      case 'pending':
      case 'pending_proof':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'cancelled':
      case 'failed':
      case 'refunded':
      default:
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
            <Ban className="w-3.5 h-3.5" /> Cancelado
          </span>
        );
    }
  };

  const getPaymentBadge = (method?: string) => {
    if (method === 'cortesia' || method === 'free') return (
      <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 text-xs font-bold flex items-center gap-1">
        <Gift className="w-3 h-3" /> Cortesia
      </span>
    );
    if (method === 'credit_card') return <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs font-medium">Cartão</span>;
    if (method === 'pix' || method === 'pix_stripe') return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs font-medium">Pix</span>;
    if (method === 'pix_chave') return <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs font-medium">Pix Chave</span>;
    if (method === 'boleto') return <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-xs font-medium">Boleto</span>;
    return <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">{method || 'MP'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação e Título */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors mb-2 gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Lista de Eventos</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-xs text-gray-500">Gestão de Vendas, Ingressos e Ordens do Evento</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowComplimentaryModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            title="Emitir ingressos cortesia manualmente para convidados VIP, palestrantes ou parceiros"
          >
            <Gift className="w-4 h-4" />
            <span>+ Emitir Cortesia</span>
          </button>

          <button
            onClick={() => syncAllPendingWithMercadoPago()}
            disabled={loading || syncing}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Consulta todos os pedidos pendentes na API do Mercado Pago e confirma os pagos"
          >
            <Zap className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Mercado Pago'}</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={loading || syncing}
            className="p-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cards de KPIs no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Total */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Receita Confirmada</p>
            <h3 className="text-xl font-black text-gray-900">{formatPrice(kpis.totalRevenue)}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold">{kpis.paidOrders} pedidos pagos</p>
          </div>
        </div>

        {/* Ingressos Vendidos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Ingressos Vendidos</p>
            <h3 className="text-xl font-black text-gray-900">{kpis.totalTicketsSold}</h3>
            <p className="text-[11px] text-gray-500">
              {event.max_guests ? `de ${event.max_guests} disponíveis` : 'Lotação livre'}
            </p>
          </div>
        </div>

        {/* Pedidos Pendentes */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Aguardando Pagamento</p>
            <h3 className="text-xl font-black text-amber-600">{kpis.pendingOrders}</h3>
            <p className="text-[11px] text-amber-700">Inclui Pix Chave / Mercado Pago</p>
          </div>
        </div>

        {/* Pedidos Cancelados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Cancelados / Recusados</p>
            <h3 className="text-xl font-black text-gray-900">{kpis.cancelledOrders}</h3>
            <p className="text-[11px] text-gray-400">Total de pedidos: {kpis.totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Busca textual */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por comprador, CPF, WhatsApp, e-mail, IP ou #código..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filtro Multi-Status com Chips (Padrão: Pagos e Pendentes) */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-gray-500 px-2 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Status:
            </span>
            <button
              type="button"
              onClick={() => toggleStatus('paid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedStatuses.includes('paid')
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pagos</span>
            </button>

            <button
              type="button"
              onClick={() => toggleStatus('pending')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedStatuses.includes('pending')
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendentes</span>
            </button>

            <button
              type="button"
              onClick={() => toggleStatus('cancelled')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedStatuses.includes('cancelled')
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancelados</span>
            </button>
          </div>

          {/* Filtro de Meio de Pagamento */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
          >
            <option value="all">Todas as Formas</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="pix">Pix</option>
            <option value="pix_chave">Pix Chave</option>
            <option value="boleto">Boleto</option>
          </select>

          {/* Filtro de Lote */}
          {uniqueBatches.length > 0 && (
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
            >
              <option value="all">Todos os Lotes</option>
              {uniqueBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabela de Ordens */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
            <p className="text-xs">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-300" />
            <h4 className="text-sm font-bold text-gray-700">Nenhum pedido encontrado</h4>
            <p className="text-xs">Tente ajustar os filtros ou aguarde novas compras no site.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Pedido</th>
                  <th className="px-5 py-3.5">Comprador</th>
                  <th className="px-5 py-3.5">Lote / Ingressos</th>
                  <th className="px-5 py-3.5">Forma</th>
                  <th className="px-5 py-3.5">Valor Total</th>
                  <th className="px-5 py-3.5">IP</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-indigo-950">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{order.client_name || 'Anônimo'}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <span>{order.client_phone || '-'}</span>
                        {order.client_document && (
                          <span className="text-gray-400">({order.client_document})</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{order.batch_name || 'Lote Padrão'}</div>
                      <div className="text-[11px] text-indigo-600 font-bold">
                        {order.quantity} ingresso(s)
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {getPaymentBadge(order.payment_method)}
                    </td>

                    <td className="px-5 py-4 font-black text-gray-900 text-sm">
                      {formatPrice(order.amount_total)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-[11px] text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {order.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {getStatusBadge(order.status)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão de Ver Detalhes */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalhes da ordem e participantes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botão de Auditar Comprovante (se Pix Chave com comprovante) */}
                        {order.payment_proof_url && order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForProof(order)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer relative"
                            title="Auditar Comprovante Pix"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1 right-1 animate-pulse" />
                          </button>
                        )}

                        {/* Botão de Verificar Status no Mercado Pago (para pendentes) */}
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => syncOrderWithMercadoPago(order.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Verificar se este pedido foi pago no Mercado Pago"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botão de Enviar / Reenviar Notificação WhatsApp */}
                        {order.client_phone && (
                          <button
                            type="button"
                            onClick={() => {
                              const notifType = (order.status === 'paid' || (order.status as string) === 'approved')
                                ? 'confirmed'
                                : order.status === 'cancelled'
                                ? 'cancelled'
                                : 'created';
                              sendManualOrderNotification(order.id, notifType);
                            }}
                            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar / Reenviar mensagem no WhatsApp do comprador"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botão de Recuperar / Reativar Pedido (para cancelados) */}
                        {(order.status === 'cancelled' || order.status === 'refunded' || order.status === 'failed') && (
                          <button
                            type="button"
                            onClick={() => setOrderToRestore(order)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Reativar / Recuperar Pedido"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botão de Cancelar Pedido (para não cancelados) */}
                        {order.status !== 'cancelled' && order.status !== 'refunded' && (
                          <button
                            type="button"
                            onClick={() => setOrderToCancel(order)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar Pedido"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Ordem */}
      <AdminOrderDetailModal
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        onCancelOrder={(orderId) => {
          const target = orders.find(o => o.id === orderId);
          if (target) setOrderToCancel(target);
        }}
        onSendWhatsApp={(orderId, type) => sendManualOrderNotification(orderId, type)}
      />

      {/* Modal de Auditoria de Comprovante */}
      <AdminPaymentProofAuditModal
        isOpen={!!selectedOrderForProof}
        onClose={() => setSelectedOrderForProof(null)}
        order={selectedOrderForProof}
        onApprove={approvePixProof}
        onReject={rejectPixProof}
      />

      {/* Modal de Confirmação de Cancelamento de Pedido */}
      <AdminCancelOrderConfirmModal
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        order={orderToCancel}
        onConfirmCancel={async (orderId, reason) => {
          await cancelOrder(orderId, reason);
          setOrderToCancel(null);
        }}
      />

      {/* Modal de Confirmação de Recuperação de Pedido */}
      <AdminRestoreOrderConfirmModal
        isOpen={!!orderToRestore}
        onClose={() => setOrderToRestore(null)}
        order={orderToRestore}
        onConfirmRestore={async (orderId, targetStatus) => {
          await restoreOrder(orderId, targetStatus);
          setOrderToRestore(null);
        }}
      />

      {/* Modal de Emissão de Cortesia VIP */}
      <AdminIssueComplimentaryModal
        isOpen={showComplimentaryModal}
        onClose={() => setShowComplimentaryModal(false)}
        event={event}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default AdminEventOrders;
