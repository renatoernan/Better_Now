import React, { useEffect, useState } from 'react';
import { CheckCircle2, Ticket, QrCode, X, Loader2, ArrowRight, MessageSquare, Mail, Sparkles, Check } from 'lucide-react';
import { getOrderBySessionId, getTicketsByOrderId, EventOrder, EventTicket } from '../../shared/services/stripeService';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  eventTitle?: string;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  eventTitle,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<EventOrder | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchPaymentResult = async () => {
      if (!sessionId || !isOpen) return;

      setLoading(true);
      try {
        const orderData = await getOrderBySessionId(sessionId);
        if (isMounted && orderData) {
          setOrder(orderData);
          const ticketsData = await getTicketsByOrderId(orderData.id);
          if (isMounted) {
            setTickets(ticketsData);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do pagamento:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPaymentResult();

    return () => {
      isMounted = false;
    };
  }, [sessionId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header de Sucesso */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white p-8 text-center relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-emerald-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-extrabold text-white">Pagamento Confirmado! 🎉</h2>
          <p className="text-emerald-100 text-sm mt-1">Seus ingressos foram emitidos com sucesso</p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Card de Aviso WhatsApp & E-mail */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 p-5 rounded-2xl border border-emerald-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Acompanhe pelo WhatsApp e E-mail</span>
            </div>
            
            <p className="text-xs text-emerald-800 leading-relaxed">
              Enviamos a confirmação detalhada do seu pedido e o voucher dos seus ingressos para os seus canais de contato cadastrados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2 p-2.5 bg-white/80 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 font-medium shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] text-emerald-700 font-semibold uppercase">WhatsApp</p>
                  <p className="truncate font-semibold">{order?.client_phone || 'Seu WhatsApp'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-white/80 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 font-medium shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] text-teal-700 font-semibold uppercase">E-mail</p>
                  <p className="truncate font-semibold">{order?.client_email || 'Seu E-mail'}</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs">Atualizando detalhes do pedido...</p>
            </div>
          ) : (
            <>
              {/* Resumo do Pedido */}
              {order && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-3">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">Evento</p>
                      <h3 className="font-bold text-gray-900 text-base">{eventTitle || order.batch_name || 'Ingresso Better Now'}</h3>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      PAGO
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-gray-500">Comprador</p>
                      <p className="font-semibold text-gray-800">{order.client_name || 'Cliente'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lote</p>
                      <p className="font-semibold text-gray-800">{order.batch_name || 'Lote Padrão'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quantidade</p>
                      <p className="font-semibold text-gray-800">{order.quantity} ingresso(s)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Pago</p>
                      <p className="font-extrabold text-emerald-700 text-sm">{formatPrice(order.amount_total)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ingressos Emitidos (QR Code Cards) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-gray-900 text-sm">Seus Ingressos Emitidos</h4>
                </div>

                {tickets.length > 0 ? (
                  <div className="space-y-2.5">
                    {tickets.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 flex items-center justify-between border border-gray-800 shadow-md"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-semibold rounded-md border border-amber-500/30">
                              Ingresso #{t.ticket_number}
                            </span>
                            <span className="text-[11px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" /> Válido
                            </span>
                          </div>
                          <p className="font-mono text-xs tracking-wider text-amber-200">{t.qr_code_hash}</p>
                          <p className="text-[10px] text-gray-400">Apresente este código na entrada do evento</p>
                        </div>

                        <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shrink-0 shadow-inner">
                          <QrCode className="w-full h-full text-gray-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Seus ingressos foram emitidos e também foram enviados para confirmação no WhatsApp e E-mail.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Entendi e Concluir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;
