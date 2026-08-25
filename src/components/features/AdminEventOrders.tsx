import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Filter, Download, Ticket, DollarSign, Clock, 
  CheckCircle2, XCircle, Eye, FileText, Globe, RefreshCw, User, Phone, 
  Calendar, Layers, CreditCard, ChevronRight, AlertCircle, Ban, Trash2, 
  RotateCcw, Zap, MessageSquare, Gift, Users, ArrowRightLeft, QrCode, ShoppingBag
} from 'lucide-react';
import { Event } from '../../shared/types/types/event';
import { useEventOrders, EventOrderRecord, EventTicketRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import AdminOrderDetailModal from '../shared/AdminOrderDetailModal';
import AdminPaymentProofAuditModal from '../shared/AdminPaymentProofAuditModal';
import AdminCancelOrderConfirmModal from '../shared/AdminCancelOrderConfirmModal';
import AdminRestoreOrderConfirmModal from '../shared/AdminRestoreOrderConfirmModal';
import AdminIssueComplimentaryModal from '../shared/AdminIssueComplimentaryModal';
import AdminRefundOrderModal from '../shared/AdminRefundOrderModal';
import AdminTransferTicketModal from '../shared/AdminTransferTicketModal';
import { toast } from 'sonner';

interface AdminEventOrdersProps {
  event: Event;
  onBack: () => void;
}

export interface FlattenedTicketItem {
  id: string;
  ticketIndex: number;
  ticketNumber: string;
  order: EventOrderRecord;
  ticket?: EventTicketRecord;
  holderName: string;
  holderDoc?: string;
  holderPhone?: string;
  holderEmail?: string;
  buyerName: string;
  buyerDoc?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  unitPrice: number;
  ticketStatus: 'valid' | 'used' | 'cancelled' | 'pending';
  qrCodeHash?: string;
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
    refundOrder,
    transferTicket,
    restoreOrder, 
    syncOrderWithMercadoPago, 
    syncAllPendingWithMercadoPago,
    sendManualOrderNotification,
  } = useEventOrders(event.id);

  // Modo de visualização: 'orders' (por compra) ou 'tickets' (por ingresso individual)
  const [viewMode, setViewMode] = useState<'orders' | 'tickets'>('orders');

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
  const [orderToRefund, setOrderToRefund] = useState<EventOrderRecord | null>(null);
  const [ticketToTransfer, setTicketToTransfer] = useState<{ ticket: EventTicketRecord; order: EventOrderRecord } | null>(null);
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

      const isOrderRefunded = order.status === 'refunded' || !!order.refunded_at;

      const matchesStatus =
        selectedStatuses.length === 0 ||
        (selectedStatuses.includes('paid') && (order.status === 'paid' || (order.status as string) === 'approved')) ||
        (selectedStatuses.includes('pending') && (order.status === 'pending' || order.status === 'pending_proof')) ||
        (selectedStatuses.includes('cancelled') && (order.status === 'cancelled' || order.status === 'failed')) ||
        (selectedStatuses.includes('refunded') && isOrderRefunded);

      const matchesPayment =
        paymentFilter === 'all' || order.payment_method === paymentFilter;

      const matchesBatch =
        batchFilter === 'all' || order.batch_name === batchFilter || String(order.batch_index) === batchFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesBatch;
    });
  }, [orders, searchTerm, selectedStatuses, paymentFilter, batchFilter]);

  // Transformação das ordens em lista de ingressos individuais (Flattened)
  const flattenedTickets = useMemo<FlattenedTicketItem[]>(() => {
    const list: FlattenedTicketItem[] = [];

    orders.forEach((order) => {
      let attendeesParsed: any[] = [];
      if (order.cancellation_reason && order.cancellation_reason.startsWith('[')) {
        try {
          attendeesParsed = JSON.parse(order.cancellation_reason);
        } catch {
          // Ignora erro de parse
        }
      }

      const qty = Math.max(1, order.quantity || 1);
      const unitPrice = Number(order.amount_total || 0) / qty;

      if (order.tickets && order.tickets.length > 0) {
        order.tickets.forEach((t, idx) => {
          const attendee = attendeesParsed[idx] || null;
          const holderName = t.person?.nome || attendee?.nome || order.client_name || `Participante ${idx + 1}`;
          const holderDoc = t.person?.documento || attendee?.documento || attendee?.cpf || (idx === 0 ? order.client_document : undefined);
          const holderPhone = t.person?.whatsapp || attendee?.whatsapp || attendee?.telefone || (idx === 0 ? order.client_phone : undefined);
          const holderEmail = t.person?.email || attendee?.email || (idx === 0 ? order.client_email : undefined);

          list.push({
            id: t.id || `${order.id}-${idx}`,
            ticketIndex: idx + 1,
            ticketNumber: String(t.ticket_number || idx + 1),
            order,
            ticket: t,
            holderName,
            holderDoc,
            holderPhone,
            holderEmail,
            buyerName: order.client_name || 'Anônimo',
            buyerDoc: order.client_document,
            buyerPhone: order.client_phone,
            buyerEmail: order.client_email,
            unitPrice,
            ticketStatus: t.status || (order.status === 'paid' || (order.status as string) === 'approved' ? 'valid' : 'pending'),
            qrCodeHash: t.qr_code_hash,
          });
        });
      } else {
        // Pedidos pendentes ou sem tickets emitidos ainda: cria cota individual
        for (let i = 0; i < qty; i++) {
          const attendee = attendeesParsed[i] || null;
          const holderName = attendee?.nome || (i === 0 ? order.client_name : `Participante ${i + 1}`) || 'Aguardando Emissão';
          const holderDoc = attendee?.documento || attendee?.cpf || (i === 0 ? order.client_document : undefined);
          const holderPhone = attendee?.whatsapp || attendee?.telefone || (i === 0 ? order.client_phone : undefined);
          const holderEmail = attendee?.email || (i === 0 ? order.client_email : undefined);

          list.push({
            id: `virtual-${order.id}-${i + 1}`,
            ticketIndex: i + 1,
            ticketNumber: `${i + 1}`,
            order,
            holderName,
            holderDoc,
            holderPhone,
            holderEmail,
            buyerName: order.client_name || 'Anônimo',
            buyerDoc: order.client_document,
            buyerPhone: order.client_phone,
            buyerEmail: order.client_email,
            unitPrice,
            ticketStatus: order.status === 'paid' ? 'valid' : order.status === 'cancelled' || order.status === 'refunded' ? 'cancelled' : 'pending',
          });
        }
      }
    });

    return list;
  }, [orders]);

  // Filtragem dos Ingressos Individuais
  const filteredTickets = useMemo(() => {
    return flattenedTickets.filter((item) => {
      const { order, holderName, holderDoc, holderPhone, holderEmail, buyerName, buyerDoc, buyerPhone, buyerEmail, ticketNumber } = item;

      const matchesSearch =
        !searchTerm ||
        holderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (holderDoc && holderDoc.includes(searchTerm)) ||
        (holderPhone && holderPhone.includes(searchTerm)) ||
        (holderEmail && holderEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (buyerDoc && buyerDoc.includes(searchTerm)) ||
        (buyerPhone && buyerPhone.includes(searchTerm)) ||
        (buyerEmail && buyerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.ip_address?.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const isOrderRefunded = order.status === 'refunded' || !!order.refunded_at;

      const matchesStatus =
        selectedStatuses.length === 0 ||
        (selectedStatuses.includes('paid') && (order.status === 'paid' || (order.status as string) === 'approved')) ||
        (selectedStatuses.includes('pending') && (order.status === 'pending' || order.status === 'pending_proof')) ||
        (selectedStatuses.includes('cancelled') && (order.status === 'cancelled' || order.status === 'failed')) ||
        (selectedStatuses.includes('refunded') && isOrderRefunded);

      const matchesPayment =
        paymentFilter === 'all' || order.payment_method === paymentFilter;

      const matchesBatch =
        batchFilter === 'all' || order.batch_name === batchFilter || String(order.batch_index) === batchFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesBatch;
    });
  }, [flattenedTickets, searchTerm, selectedStatuses, paymentFilter, batchFilter]);

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
    if (viewMode === 'orders') {
      if (filteredOrders.length === 0) {
        toast.info('Nenhuma ordem para exportar.');
        return;
      }

      const headers = [
        'ID Pedido',
        'Data/Hora',
        'Status',
        'Comprador',
        'CPF Comprador',
        'WhatsApp Comprador',
        'E-mail Comprador',
        'IP',
        'Lote',
        'Qtd Ingressos',
        'Forma Pagamento',
        'Taxa',
        'Total Pago (R$)',
        'Valor Reembolsado (R$)',
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
          o.refund_amount || 0,
          `"${attendees}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pedidos_${event.title.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Relatório CSV de pedidos exportado com sucesso!');
    } else {
      if (filteredTickets.length === 0) {
        toast.info('Nenhum ingresso para exportar.');
        return;
      }

      const headers = [
        'ID Pedido',
        'Num Ingresso',
        'Status Ingresso',
        'Status Pedido',
        'Titular Nominal',
        'CPF Titular',
        'WhatsApp Titular',
        'E-mail Titular',
        'Comprador',
        'CPF Comprador',
        'WhatsApp Comprador',
        'Lote',
        'Valor Unitario (R$)',
        'Forma Pagamento',
        'Data Compra'
      ];

      const rows = filteredTickets.map((t) => [
        t.order.id,
        t.ticketNumber,
        t.ticketStatus,
        t.order.status,
        `"${t.holderName}"`,
        t.holderDoc || '',
        t.holderPhone || '',
        t.holderEmail || '',
        `"${t.buyerName}"`,
        t.buyerDoc || '',
        t.buyerPhone || '',
        `"${t.order.batch_name || 'Padrão'}"`,
        t.unitPrice.toFixed(2),
        t.order.payment_method || '',
        new Date(t.order.created_at).toLocaleString('pt-BR')
      ].join(';'));

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ingressos_individuais_${event.title.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Relatório CSV de ingressos individuais exportado com sucesso!');
    }
  };

  const getStatusBadge = (order: EventOrderRecord) => {
    if (order.status === 'refunded' || !!order.refunded_at) {
      return (
        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
          <RotateCcw className="w-3.5 h-3.5" /> Reembolsado
        </span>
      );
    }

    const st = order.status as string;
    if (st === 'paid' || st === 'approved') {
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5" /> Pago
        </span>
      );
    }

    if (st === 'pending' || st === 'pending_proof') {
      return (
        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
          <Clock className="w-3.5 h-3.5" /> Pendente
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1 w-fit">
        <Ban className="w-3.5 h-3.5" /> Cancelado
      </span>
    );
  };

  const getTicketStatusBadge = (status: string, orderStatus: string) => {
    if (orderStatus === 'refunded') {
      return (
        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-lg flex items-center gap-1 w-fit">
          <RotateCcw className="w-3 h-3" /> Reembolsado
        </span>
      );
    }

    if (orderStatus === 'cancelled') {
      return (
        <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-lg flex items-center gap-1 w-fit">
          <Ban className="w-3 h-3" /> Cancelado
        </span>
      );
    }

    if (status === 'valid') {
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" /> Válido
        </span>
      );
    }

    if (status === 'used') {
      return (
        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" /> Utilizado
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3" /> Pendente
      </span>
    );
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
            <span>{viewMode === 'orders' ? 'Exportar CSV (Pedidos)' : 'Exportar CSV (Ingressos)'}</span>
          </button>
        </div>
      </div>

      {/* Cards de KPIs no Topo (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Receita Total */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Aguardando Pagamento</p>
            <h3 className="text-xl font-black text-amber-600">{kpis.pendingOrders}</h3>
            <p className="text-[11px] text-amber-700">Pix Chave / Mercado Pago</p>
          </div>
        </div>

        {/* Pedidos Cancelados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Cancelados / Recusados</p>
            <h3 className="text-xl font-black text-gray-900">{kpis.cancelledOrders}</h3>
            <p className="text-[11px] text-gray-400">Total: {kpis.totalOrders} pedidos</p>
          </div>
        </div>

        {/* Card KPI de Reembolsos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Reembolsos / Devoluções</p>
            <h3 className="text-xl font-black text-purple-900">{formatPrice(kpis.totalRefundAmount)}</h3>
            <p className="text-[11px] text-purple-700 font-semibold">{kpis.refundedOrders} pedido(s) devolvido(s)</p>
          </div>
        </div>
      </div>

      {/* Filtros, Barra de Busca e Alternador de Visualização */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Busca textual */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                viewMode === 'orders'
                  ? "Buscar por comprador, CPF, WhatsApp, e-mail, IP ou #código..."
                  : "Buscar por titular nominal, comprador, CPF, WhatsApp, e-mail ou #código..."
              }
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Alternador Global de Visualização (Por Pedidos / Por Ingressos) */}
          <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl border border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'orders'
                  ? 'bg-white text-indigo-950 shadow-xs border border-gray-200/80 font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualizar lista agrupada por pedidos / compras"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Por Compras ({filteredOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tickets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'tickets'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualizar detalhamento linha a linha por ingresso individual nominal"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-300" />
              <span>Por Ingressos ({filteredTickets.length})</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between pt-1">
          {/* Filtro Multi-Status com Chips */}
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

            {/* Chip de Reembolsados */}
            <button
              type="button"
              onClick={() => toggleStatus('refunded')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedStatuses.includes('refunded')
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reembolsados</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de Meio de Pagamento */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
            >
              <option value="all">Todas as Formas</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="pix">Pix</option>
              <option value="pix_chave">Pix Chave</option>
              <option value="boleto">Boleto</option>
              <option value="cortesia">Cortesia</option>
            </select>

            {/* Filtro de Lote */}
            {uniqueBatches.length > 0 && (
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
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
      </div>

      {/* Tabela de Ordens ou Ingressos Individuais */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
            <p className="text-xs">Carregando dados...</p>
          </div>
        ) : viewMode === 'orders' ? (
          /* ========================================================================= */
          /* MODO 1: VISUALIZAÇÃO POR PEDIDOS / COMPRAS                                */
          /* ========================================================================= */
          filteredOrders.length === 0 ? (
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
                  {filteredOrders.map((order) => {
                    const isPaid = order.status === 'paid' || (order.status as string) === 'approved';
                    return (
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
                          {order.refund_amount && (
                            <div className="text-[10px] text-purple-700 font-bold">
                              Devolvido: {formatPrice(order.refund_amount)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-[11px] text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {order.ip_address || '127.0.0.1'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {getStatusBadge(order)}
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

                            {/* Botão de Reembolso para Pedidos Pagos */}
                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => setOrderToRefund(order)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Registrar Reembolso / Devolução"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

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

                            {/* Botão de Recuperar / Reativar Pedido (para cancelados ou reembolsados) */}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* MODO 2: VISUALIZAÇÃO POR INGRESSOS INDIVIDUAIS (FLATTENED)                */
          /* ========================================================================= */
          filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Ticket className="w-10 h-10 mx-auto text-gray-300" />
              <h4 className="text-sm font-bold text-gray-700">Nenhum ingresso encontrado</h4>
              <p className="text-xs">Tente ajustar os filtros de busca ou status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Pedido / Ingresso</th>
                    <th className="px-5 py-3.5">Comprador</th>
                    <th className="px-5 py-3.5">Titular do Ingresso</th>
                    <th className="px-5 py-3.5">Lote / Forma</th>
                    <th className="px-5 py-3.5">Valor Unitário</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredTickets.map((item) => {
                    const { order, ticket, holderName, holderDoc, holderPhone, buyerName, buyerDoc, buyerPhone, unitPrice, ticketStatus, ticketNumber } = item;
                    const isPaid = order.status === 'paid' || (order.status as string) === 'approved';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Pedido / Ingresso */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-indigo-950">
                              #{order.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 font-extrabold text-[10px]">
                              Ingresso #{ticketNumber}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Comprador */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{buyerName}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <span>{buyerPhone || '-'}</span>
                            {buyerDoc && <span className="text-gray-400">({buyerDoc})</span>}
                          </div>
                        </td>

                        {/* Titular Nominal do Ingresso */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{holderName}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            {holderDoc ? (
                              <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                                CPF: {holderDoc}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[10px]">CPF não vinculado</span>
                            )}
                            {holderPhone && <span>{holderPhone}</span>}
                          </div>
                        </td>

                        {/* Lote / Forma de Pagamento */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">{order.batch_name || 'Lote Padrão'}</div>
                          <div className="mt-1">
                            {getPaymentBadge(order.payment_method)}
                          </div>
                        </td>

                        {/* Valor Unitário */}
                        <td className="px-5 py-4 font-black text-gray-900 text-sm">
                          {formatPrice(unitPrice)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {getTicketStatusBadge(ticketStatus, order.status)}
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver Detalhes do Pedido */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForDetail(order)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Ver detalhes completos do pedido"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Transferir Ingresso Individual */}
                            {isPaid && ticket && ticketStatus === 'valid' && (
                              <button
                                type="button"
                                onClick={() => setTicketToTransfer({ ticket, order })}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Transferir titularidade deste ingresso para outra pessoa"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reembolso do Pedido */}
                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => setOrderToRefund(order)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Registrar Reembolso / Devolução"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Notificação WhatsApp */}
                            {(holderPhone || buyerPhone) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const notifType = isPaid ? 'confirmed' : order.status === 'cancelled' ? 'cancelled' : 'created';
                                  sendManualOrderNotification(order.id, notifType);
                                }}
                                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Reenviar notificação de WhatsApp"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            {/* Cancelar Pedido */}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
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
        onTransferTicket={(ticket, ord) => setTicketToTransfer({ ticket, order: ord })}
        onRefundOrder={(ord) => setOrderToRefund(ord)}
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
        onConfirmCancel={async (orderId, reason, notifyOptions) => {
          await cancelOrder(orderId, reason, notifyOptions);
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

      {/* Modal de Reembolso de Pedido */}
      <AdminRefundOrderModal
        isOpen={!!orderToRefund}
        onClose={() => setOrderToRefund(null)}
        order={orderToRefund}
        onConfirmRefund={async ({ orderId, amount, reason, isPartial }) => {
          await refundOrder({ orderId, amount, reason, isPartial });
          setOrderToRefund(null);
        }}
      />

      {/* Modal de Transferência de Ingresso Individual */}
      <AdminTransferTicketModal
        isOpen={!!ticketToTransfer}
        onClose={() => setTicketToTransfer(null)}
        ticket={ticketToTransfer?.ticket || null}
        orderClientName={ticketToTransfer?.order.client_name}
        orderClientDocument={ticketToTransfer?.order.client_document}
        orderClientPhone={ticketToTransfer?.order.client_phone}
        onConfirmTransfer={async (params) => {
          await transferTicket(params);
          setTicketToTransfer(null);
        }}
      />
    </div>
  );
};

export default AdminEventOrders;


