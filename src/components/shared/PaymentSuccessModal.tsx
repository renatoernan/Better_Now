import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2,
  Ticket,
  QrCode,
  X,
  Loader2,
  ArrowRight,
  MessageSquare,
  Mail,
  Sparkles,
  Check,
  Share2,
  Copy,
  Maximize2,
  Smartphone,
  Calendar,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getOrderBySessionId, getTicketsByOrderId, EventOrder, EventTicket } from '../../shared/services/stripeService';
import { checkMercadoPagoPaymentStatus } from '../../shared/services/mercadoPagoService';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { formatCPF } from '../../shared/utils/utils/cpfUtils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [rechecking, setRechecking] = useState<boolean>(false);
  const [order, setOrder] = useState<EventOrder | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [enlargedTicket, setEnlargedTicket] = useState<EventTicket | null>(null);

  const attendeesParsed = useMemo(() => {
    const rawReason = (order as any)?.cancellation_reason;
    if (rawReason && typeof rawReason === 'string' && rawReason.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(rawReason);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }, [(order as any)?.cancellation_reason]);

  const fetchPaymentResult = async () => {
    if (!sessionId || !isOpen) return;

    setLoading(true);
    try {
      let orderData = await getOrderBySessionId(sessionId);
      
      // Se a ordem estiver pendente, faz uma checagem em tempo real no Mercado Pago
      if (orderData && orderData.status !== 'paid' && orderData.status !== 'approved') {
        const mpCheck = await checkMercadoPagoPaymentStatus(orderData.id);
        if (mpCheck.paid) {
          orderData = await getOrderBySessionId(sessionId);
        }
      }

      if (orderData) {
        setOrder(orderData);
        if (orderData.status === 'paid' || orderData.status === 'approved') {
          const ticketsData = await getTicketsByOrderId(orderData.id, orderData);
          const map = new Map<string, EventTicket>();
          (ticketsData || []).forEach((t) => {
            const key = String(t.ticket_number || t.id);
            if (!map.has(key)) map.set(key, t);
          });
          const uniqueList = Array.from(map.values()).sort(
            (a, b) => Number(a.ticket_number || 0) - Number(b.ticket_number || 0)
          );
          setTickets(uniqueList);
        } else {
          setTickets([]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentResult();
  }, [sessionId, isOpen]);

  const handleRecheckStatus = async () => {
    if (!order?.id || rechecking) return;
    setRechecking(true);
    toast.info('Verificando status do pagamento com o banco...');
    try {
      const mpCheck = await checkMercadoPagoPaymentStatus(order.id);
      if (mpCheck.paid) {
        toast.success('Pagamento confirmado com sucesso! 🎉');
        await fetchPaymentResult();
      } else {
        toast.info('O pagamento ainda consta como pendente no banco.');
      }
    } catch {
      toast.error('Erro ao verificar status.');
    } finally {
      setRechecking(false);
    }
  };

  if (!isOpen) return null;

  const isOrderPaid = order?.status === 'paid' || order?.status === 'approved';

  const handleCopyCode = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('Código do ingresso copiado!');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleShareWhatsApp = (ticket: EventTicket, index: number) => {
    const title = eventTitle || order?.batch_name || 'Evento Better Now';
    const client = attendeesParsed[index]?.nome || ((ticket.client as any)?.id !== order?.client_id || index === 0 ? ticket.client?.nome : null) || (index === 0 ? order?.client_name : '') || `Participante ${index + 1}`;
    const rawDoc = attendeesParsed[index]?.documento || attendeesParsed[index]?.cpf || ((ticket.client as any)?.id !== order?.client_id || index === 0 ? ticket.client?.documento : null) || (index === 0 ? order?.client_document : '');
    const doc = rawDoc ? formatCPF(rawDoc) : '';
    const hash = ticket.qr_code_hash;
    const ticketNum = ticket.ticket_number || `${index + 1}`;

    const text = `🎟️ *Ingresso Confirmado - ${title}*\n\n` +
      `👤 *Participante:* ${client}${doc ? `\n📄 *Documento:* ${doc}` : ''}\n` +
      `🏷️ *Lote:* ${order?.batch_name || 'Geral'}\n` +
      `🔢 *Ingresso:* #${ticketNum}\n` +
      `🔑 *Código de Check-in:* ${hash}\n\n` +
      `📲 *Apresente este código ou QR Code na portaria no dia do evento!*`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFinish = () => {
    onClose();
    if (isOrderPaid) {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header (Diferenciado para Pago vs Pendente vs Loading) */}
        {loading ? (
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-indigo-200 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3.5 border border-white/30 shadow-inner">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Carregando Pedido...</h2>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1">Buscando os detalhes e QR Codes dos ingressos</p>
          </div>
        ) : isOrderPaid ? (
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-emerald-200 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3.5 border border-white/30 shadow-inner">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Pagamento Confirmado! 🎉</h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1">Seus ingressos e QR Codes foram emitidos com sucesso</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-amber-200 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3.5 border border-white/30 shadow-inner">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Aguardando Confirmação ⏳</h2>
            <p className="text-amber-100 text-xs sm:text-sm mt-1">Recebemos seu pedido e estamos aguardando a compensação do pagamento</p>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Card de Aviso WhatsApp & E-mail */}
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-2xs space-y-3 ${
            isOrderPaid 
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-200/90' 
              : 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 border-amber-200/90'
          }`}>
            <div className={`flex items-center gap-2 font-bold text-xs sm:text-sm ${
              isOrderPaid ? 'text-emerald-900' : 'text-amber-900'
            }`}>
              <Sparkles className={`w-4 h-4 shrink-0 ${isOrderPaid ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>{isOrderPaid ? 'Acompanhe pelo WhatsApp e E-mail' : 'Confirmação do Pedido'}</span>
            </div>
            
            <p className={`text-xs leading-relaxed ${isOrderPaid ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isOrderPaid 
                ? 'Enviamos a confirmação detalhada do seu pedido e os seus ingressos para os seus contatos cadastrados:'
                : 'Seu pedido foi registrado. Assim que o pagamento for aprovado pelo banco, você receberá a confirmação e os ingressos por aqui:'
              }
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className={`flex items-center gap-2.5 p-2.5 bg-white/90 rounded-xl border text-xs font-medium shadow-2xs ${
                isOrderPaid ? 'border-emerald-200/70 text-emerald-900' : 'border-amber-200/70 text-amber-900'
              }`}>
                <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 ${
                  isOrderPaid ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className={`text-[10px] font-semibold uppercase ${isOrderPaid ? 'text-emerald-700' : 'text-amber-700'}`}>WhatsApp</p>
                  <p className="truncate font-semibold">{order?.client_phone || 'Seu WhatsApp'}</p>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 p-2.5 bg-white/90 rounded-xl border text-xs font-medium shadow-2xs ${
                isOrderPaid ? 'border-emerald-200/70 text-emerald-900' : 'border-amber-200/70 text-amber-900'
              }`}>
                <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 ${
                  isOrderPaid ? 'bg-teal-600' : 'bg-orange-600'
                }`}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className={`text-[10px] font-semibold uppercase ${isOrderPaid ? 'text-teal-700' : 'text-orange-700'}`}>E-mail</p>
                  <p className="truncate font-semibold">{order?.client_email || 'Seu E-mail'}</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3 text-gray-500">
              <Loader2 className={`w-8 h-8 animate-spin ${isOrderPaid ? 'text-emerald-600' : 'text-amber-600'}`} />
              <p className="text-xs font-semibold">Carregando detalhes do pedido...</p>
            </div>
          ) : (
            <>
              {/* Resumo do Pedido */}
              {order && (
                <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-3">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Evento</p>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">{eventTitle || order.batch_name || 'Ingresso Better Now'}</h3>
                    </div>
                    <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full ${
                      isOrderPaid 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isOrderPaid ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-gray-500 text-[11px]">Comprador</p>
                      <p className="font-semibold text-gray-800">{order.client_name || 'Cliente'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">Lote</p>
                      <p className="font-semibold text-gray-800">{order.batch_name || 'Lote Padrão'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">Quantidade</p>
                      <p className="font-semibold text-gray-800">{order.quantity} ingresso(s)</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">{isOrderPaid ? 'Total Pago' : 'Valor Total'}</p>
                      <p className={`font-extrabold text-sm ${isOrderPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {formatPrice(order.amount_total)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Se o pedido estiver PAGO: Ingressos Emitidos com QR Code */}
              {isOrderPaid ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-gray-900 text-sm">QR Code dos Ingressos para Check-in</h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {tickets.length} {tickets.length === 1 ? 'ingresso emitido' : 'ingressos emitidos'}
                    </span>
                  </div>

                  {tickets.length > 0 ? (
                    <div className="space-y-3">
                      {tickets.map((t, idx) => (
                        <div
                          key={t.id || idx}
                          className="bg-white border-2 border-indigo-100 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200">
                                  Ingresso #{t.ticket_number || idx + 1}
                                </span>
                                <span className={`text-[11px] font-bold uppercase flex items-center gap-1 ${
                                  t.status === 'used' ? 'text-gray-500' : 'text-emerald-600'
                                }`}>
                                  <Check className="w-3.5 h-3.5" />
                                  {t.status === 'used' ? 'Já Utilizado' : 'Válido para Entrada'}
                                </span>
                              </div>

                              <div className="space-y-0.5">
                                <p className="text-xs text-gray-900 font-bold truncate">
                                  Titular: <span className="text-indigo-950 font-extrabold">
                                    {attendeesParsed[idx]?.nome || ((t.client as any)?.id !== order?.client_id || idx === 0 ? t.client?.nome : null) || (idx === 0 ? order?.client_name : '') || `Participante ${idx + 1}`}
                                  </span>
                                </p>
                                {(attendeesParsed[idx]?.documento || attendeesParsed[idx]?.cpf || ((t.client as any)?.id !== order?.client_id || idx === 0 ? t.client?.documento : null) || (idx === 0 && order?.client_document)) && (
                                  <p className="text-[11px] text-gray-500 font-medium">
                                    CPF: {formatCPF(attendeesParsed[idx]?.documento || attendeesParsed[idx]?.cpf || ((t.client as any)?.id !== order?.client_id || idx === 0 ? t.client?.documento : null) || order?.client_document || '')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-0.5">
                                <code className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px] sm:max-w-xs">
                                  {t.qr_code_hash}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(t.qr_code_hash)}
                                  className="text-gray-500 hover:text-indigo-600 p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                                  title="Copiar código de validação"
                                >
                                  {copiedHash === t.qr_code_hash ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* QR Code SVG Individual */}
                            <div
                              onClick={() => setEnlargedTicket(t)}
                              className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform flex flex-col items-center shrink-0 group"
                              title="Clique para ampliar o QR Code"
                            >
                              <QRCodeSVG
                                value={t.qr_code_hash}
                                size={85}
                                level="M"
                                includeMargin={false}
                              />
                              <span className="text-[9px] font-semibold text-gray-400 group-hover:text-indigo-600 mt-1 flex items-center gap-0.5">
                                <Maximize2 className="w-2.5 h-2.5" /> Ampliar
                              </span>
                            </div>
                          </div>

                          {/* Botões de Ação do Ingresso (WhatsApp e Compartilhar) */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                              Apresente este QR Code na portaria
                            </p>

                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(t, idx)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Enviar no WhatsApp
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Ingressos gerados com sucesso!</p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          Os comprovantes e códigos de entrada foram enviados para o seu WhatsApp e E-mail.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Se o pedido estiver PENDENTE: Bloco informativo sem QR Code */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Aguardando aprovação do pagamento</span>
                    </div>
                    <p className="leading-relaxed text-amber-700">
                      Assim que o pagamento for confirmado pela instituição financeira, seus ingressos válidos e QR Codes serão emitidos automaticamente e enviados para o seu WhatsApp.
                    </p>
                  </div>

                  {/* Botão para Acessar / Continuar Pagamento no Mercado Pago */}
                  {(order?.payment_url || order?.checkout_url || (order?.stripe_session_id && order.stripe_session_id.startsWith('http'))) && (
                    <a
                      href={order.payment_url || order.checkout_url || order.stripe_session_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer no-underline text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Tela de Pagamento do Mercado Pago</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleRecheckStatus}
                    disabled={rechecking}
                    className="w-full py-3 px-4 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin text-amber-600' : ''}`} />
                    <span>{rechecking ? 'Consultando status...' : 'Verificar Pagamento Novamente'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleFinish}
            className={`w-full sm:w-auto px-6 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isOrderPaid 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                : 'bg-gray-800 hover:bg-gray-900 shadow-gray-800/20'
            }`}
          >
            <span>{isOrderPaid ? 'Entendi e Concluir' : 'Fechar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de QR Code em Tela Cheia / Ampliado */}
      {enlargedTicket && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedTicket(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Ingresso #{enlargedTicket.ticket_number}
              </span>
              <button
                type="button"
                onClick={() => setEnlargedTicket(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 flex items-center justify-center">
              <QRCodeSVG
                value={enlargedTicket.qr_code_hash}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div>
              <p className="font-bold text-gray-900 text-sm">{eventTitle || order?.batch_name || 'Evento'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Titular: {order?.client_name || 'Participante'}</p>
              <code className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg block mt-2">
                {enlargedTicket.qr_code_hash}
              </code>
            </div>

            <button
              type="button"
              onClick={() => setEnlargedTicket(null)}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccessModal;
