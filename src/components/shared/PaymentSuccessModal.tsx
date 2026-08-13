import React, { useEffect, useState } from 'react';
import { CheckCircle2, Ticket, QrCode, X, Loader2, ArrowRight, Calendar, User } from 'lucide-react';
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header de Sucesso */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 text-center relative overflow-hidden">
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

          <h2 className="text-2xl font-extrabold text-white">Pagamento Confirmado!</h2>
          <p className="text-emerald-100 text-sm mt-1">Seus ingressos foram emitidos com sucesso</p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Carregando detalhes do pedido...</p>
            </div>
          ) : (
            <>
              {/* Resumo do Pedido */}
              {order && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-3">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">Evento</p>
                      <h3 className="font-bold text-gray-900 text-lg">{eventTitle || order.batch_name || 'Ingresso Better Now'}</h3>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      PAGO
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm pt-1">
                    <div>
                      <p className="text-xs text-gray-500">Comprador</p>
                      <p className="font-medium text-gray-800">{order.client_name || 'Cliente'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lote</p>
                      <p className="font-medium text-gray-800">{order.batch_name || 'Lote Padrão'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantidade</p>
                      <p className="font-medium text-gray-800">{order.quantity} ingresso(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Pago</p>
                      <p className="font-bold text-emerald-700">{formatPrice(order.amount_total)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ingressos Emitidos (QR Code Cards) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-gray-900 text-base">Seus Ingressos Emitidos</h4>
                </div>

                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-2xl p-4 flex items-center justify-between border border-gray-800 shadow-md"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 font-medium rounded-md border border-amber-500/30">
                              Ingresso #{t.ticket_number}
                            </span>
                            <span className="text-xs text-emerald-400 font-semibold uppercase">VÁLIDO</span>
                          </div>
                          <p className="font-mono text-sm tracking-wider text-amber-200">{t.qr_code_hash}</p>
                          <p className="text-[11px] text-gray-400">Apresente este código na entrada do evento</p>
                        </div>

                        <div className="w-14 h-14 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                          <QrCode className="w-full h-full text-gray-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    Seus ingressos foram processados e também foram enviados para confirmação no WhatsApp/Email.
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
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <span>Concluído</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;
