import React from 'react';
import { X, Ticket, User, Phone, Mail, CreditCard, Calendar, Globe, QrCode, CheckCircle2, AlertCircle, Ban, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  onCancelOrder?: (orderId: string) => void;
  onApproveProof?: (orderId: string) => void;
  onSendWhatsApp?: (orderId: string, type: 'created' | 'confirmed' | 'cancelled') => void;
}

export const AdminOrderDetailModal: React.FC<AdminOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onCancelOrder,
  onApproveProof,
  onSendWhatsApp,
}) => {
  if (!isOpen || !order) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pago / Aprovado
          </span>
        );
      case 'pending':
      case 'pending_proof':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'cancelled':
      case 'failed':
      case 'refunded':
      default:
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" /> Cancelado
          </span>
        );
    }
  };

  const getPaymentLabel = (method?: string) => {
    if (method === 'credit_card') return 'Cartão de Crédito';
    if (method === 'pix' || method === 'pix_stripe') return 'Pix (Online)';
    if (method === 'pix_chave') return 'Pix (Chave / QR Code Próprio)';
    if (method === 'boleto') return 'Boleto';
    return method || 'Mercado Pago';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Pedido #{order.id.substring(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs text-indigo-200">Criado em {formatDate(order.created_at)}</p>
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Dados do Comprador e IP */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Dados do Comprador</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-semibold">{order.client_name || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{order.client_phone || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{order.client_email || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>IP: <strong className="text-indigo-900">{order.ip_address || '127.0.0.1'}</strong></span>
              </div>
              {order.client_document && (
                <div className="flex items-center gap-2 text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>CPF: <strong>{order.client_document}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Dados Financeiros */}
          <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Resumo Financeiro</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Lote</p>
                <p className="font-semibold text-gray-900">{order.batch_name || 'Lote Padrão'}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantidade</p>
                <p className="font-semibold text-gray-900">{order.quantity} ingresso(s)</p>
              </div>
              <div>
                <p className="text-gray-500">Forma</p>
                <p className="font-semibold text-gray-900">{getPaymentLabel(order.payment_method)}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Pago</p>
                <p className="font-extrabold text-indigo-700 text-sm">{formatPrice(order.amount_total)}</p>
              </div>
            </div>

            {order.cancellation_reason && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Motivo do cancelamento:</strong> {order.cancellation_reason}</span>
              </div>
            )}
          </div>

          {/* Ingressos Nominais e Portadores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Ingressos Emitidos ({order.tickets?.length || 0})
              </h3>
            </div>

            {order.tickets && order.tickets.length > 0 ? (
              <div className="space-y-2.5">
                {order.tickets.map((ticket, idx) => (
                  <div
                    key={ticket.id || idx}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200 flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          #{ticket.ticket_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ticket.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {ticket.status === 'valid' ? 'VÁLIDO' : ticket.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-xs">
                        {ticket.person?.nome || order.client_name || `Participante ${idx + 1}`}
                      </p>
                      {ticket.person?.documento && (
                        <p className="text-[11px] text-gray-500">CPF: {ticket.person.documento}</p>
                      )}
                    </div>

                    <div className="w-10 h-10 bg-gray-50 rounded-lg p-1 border border-gray-200 flex items-center justify-center shrink-0">
                      <QrCode className="w-full h-full text-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 text-center">
                {order.status === 'paid'
                  ? 'Ingressos vinculados a este pedido.'
                  : 'Os ingressos serão emitidos automaticamente assim que o pagamento for aprovado.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {order.client_phone && onSendWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  const notifType = (order.status === 'paid' || (order.status as string) === 'approved')
                    ? 'confirmed'
                    : order.status === 'cancelled'
                    ? 'cancelled'
                    : 'created';
                  onSendWhatsApp(order.id, notifType);
                }}
                className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reenviar notificação de WhatsApp para o comprador"
              >
                <MessageSquare className="w-4 h-4" />
                Reenviar WhatsApp
              </button>
            )}

            {order.status === 'pending' && onCancelOrder && (
              <button
                type="button"
                onClick={() => {
                  onCancelOrder(order.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar Pedido
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailModal;
