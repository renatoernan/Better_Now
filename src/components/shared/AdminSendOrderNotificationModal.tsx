import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Ban, 
  User, 
  Ticket, 
  Loader2, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { OrderNotificationType } from '../../shared/services/orderNotificationService';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminSendOrderNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  eventTitle?: string;
  onSend: (
    orderId: string, 
    type: OrderNotificationType, 
    channels: { whatsapp: boolean; email: boolean }
  ) => Promise<boolean>;
}

export const AdminSendOrderNotificationModal: React.FC<AdminSendOrderNotificationModalProps> = ({
  isOpen,
  onClose,
  order,
  eventTitle = 'Evento',
  onSend,
}) => {
  const [notificationType, setNotificationType] = useState<OrderNotificationType>('confirmed');
  const [enableWhatsApp, setEnableWhatsApp] = useState<boolean>(true);
  const [enableEmail, setEnableEmail] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Inicializa com base no status do pedido e disponibilidade de dados
  useEffect(() => {
    if (order) {
      const isPaid = order.status === 'paid' || (order.status as string) === 'approved';
      if (isPaid) {
        setNotificationType('confirmed');
      } else if (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'failed') {
        setNotificationType('cancelled');
      } else {
        setNotificationType('created');
      }

      setEnableWhatsApp(!!order.client_phone);
      setEnableEmail(!!order.client_email);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const hasPhone = !!order.client_phone?.trim();
  const hasEmail = !!order.client_email?.trim();
  const isPaid = order.status === 'paid' || (order.status as string) === 'approved';

  const orderNumber = order.id.substring(0, 8).toUpperCase();
  const formattedTotal = formatPrice(Number(order.amount_total) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enableWhatsApp && !enableEmail) return;

    setLoading(true);
    try {
      const success = await onSend(order.id, notificationType, {
        whatsapp: enableWhatsApp && hasPhone,
        email: enableEmail && hasEmail,
      });
      if (success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedChannelsCount = (enableWhatsApp && hasPhone ? 1 : 0) + (enableEmail && hasEmail ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Superior com Identidade Visual do Better Now */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 text-white p-6 relative border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Enviar Notificação</h2>
              <p className="text-xs text-indigo-200/90">
                Pedido #{orderNumber} &bull; {eventTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário / Corpo */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Card Resumo do Pedido */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">{order.client_name || 'Comprador não identificado'}</span>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                isPaid 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isPaid ? 'Pago' : order.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block font-medium">Lote / Ingressos:</span>
                <span className="font-semibold text-slate-700">
                  {order.batch_name || 'Lote Padrão'} ({order.quantity || 1} {order.quantity === 1 ? 'ingresso' : 'ingressos'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Valor Total:</span>
                <span className="font-bold text-slate-900 text-sm">{formattedTotal}</span>
              </div>
            </div>
          </div>

          {/* Seleção do Tipo de Mensagem */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Tipo da Mensagem
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNotificationType('confirmed')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  notificationType === 'confirmed'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${notificationType === 'confirmed' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Confirmado</span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationType('created')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  notificationType === 'created'
                    ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-sm ring-1 ring-sky-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className={`w-4 h-4 ${notificationType === 'created' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>Aguardando</span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationType('cancelled')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  notificationType === 'cancelled'
                    ? 'bg-red-50 border-red-500 text-red-800 shadow-sm ring-1 ring-red-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Ban className={`w-4 h-4 ${notificationType === 'cancelled' ? 'text-red-600' : 'text-slate-400'}`} />
                <span>Cancelado</span>
              </button>
            </div>
          </div>

          {/* Seleção dos Canais de Envio (Switches Independentes) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Canais de Envio
            </label>

            {/* Switch 1: WhatsApp (WAHA) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasPhone
                ? enableWhatsApp
                  ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-400/20'
                  : 'bg-white border-slate-200'
                : 'bg-slate-100/60 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    hasPhone && enableWhatsApp
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">WhatsApp (WAHA)</span>
                      {hasPhone && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Disponível
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasPhone ? order.client_phone : 'Telefone não cadastrado no pedido'}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  disabled={!hasPhone || loading}
                  onClick={() => setEnableWhatsApp(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !hasPhone 
                      ? 'bg-slate-200 cursor-not-allowed' 
                      : enableWhatsApp 
                      ? 'bg-emerald-600' 
                      : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={enableWhatsApp && hasPhone}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enableWhatsApp && hasPhone ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Switch 2: E-mail (SMTP) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasEmail
                ? enableEmail
                  ? 'bg-sky-50/60 border-sky-200 ring-1 ring-sky-400/20'
                  : 'bg-white border-slate-200'
                : 'bg-slate-100/60 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    hasEmail && enableEmail
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">E-mail (SMTP)</span>
                      {hasEmail && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full">
                          Disponível
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
                      {hasEmail ? order.client_email : 'E-mail não cadastrado no pedido'}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  disabled={!hasEmail || loading}
                  onClick={() => setEnableEmail(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !hasEmail 
                      ? 'bg-slate-200 cursor-not-allowed' 
                      : enableEmail 
                      ? 'bg-sky-600' 
                      : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={enableEmail && hasEmail}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enableEmail && hasEmail ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Aviso se nenhum canal estiver selecionado */}
          {selectedChannelsCount === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Ative pelo menos um canal (WhatsApp ou E-mail) para efetuar o disparo.</span>
            </div>
          )}

          {/* Rodapé / Ações */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || selectedChannelsCount === 0}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                loading || selectedChannelsCount === 0
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 cursor-pointer active:scale-98'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar ({selectedChannelsCount} {selectedChannelsCount === 1 ? 'canal' : 'canais'})</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdminSendOrderNotificationModal;
