import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Smartphone,
  Loader2,
  ArrowLeft,
  X,
  Send,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  UserCheck,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { formatCPF, validateCPF } from '../../shared/utils/utils/cpfUtils';
import { formatBrazilDate } from '../../shared/utils/utils/eventUtils';
import {
  rescueTicketsByCpf,
  fetchEventForRescue,
  RescueResult,
  RescueTicketItem,
  RescueEventInfo,
  formatRescueWhatsAppMessage,
  sendRescueNotification,
  buildWhatsAppDirectUrl,
  formatDisplayPhone,
  cleanCpfDigits,
} from '../../shared/services/ticketRescueService';

export const PublicEventTicketRescue: React.FC = () => {
  const { id: routeEventId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [eventId, setEventId] = useState<string>(routeEventId || '');
  const [eventInfo, setEventInfo] = useState<RescueEventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState<boolean>(true);

  // Formulário de busca por CPF
  const [cpfInput, setCpfInput] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<RescueResult | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Estados de modais e ações
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [enlargedTicket, setEnlargedTicket] = useState<RescueTicketItem | null>(null);
  
  // Modal de Envio para WhatsApp
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState<boolean>(false);
  const [whatsAppSuccessMessage, setWhatsAppSuccessMessage] = useState<string | null>(null);
  const [singleTicketToShare, setSingleTicketToShare] = useState<RescueTicketItem | null>(null);

  // Carrega informações básicas do evento
  useEffect(() => {
    const currentId = routeEventId || searchParams.get('evento') || '';
    (async () => {
      setLoadingEvent(true);
      const data = await fetchEventForRescue(currentId || null);
      if (data) {
        setEventInfo(data);
        setEventId(data.id);
      }
      setLoadingEvent(false);
    })();
  }, [routeEventId, searchParams]);

  // Executa busca por CPF
  const handlePerformSearch = useCallback(
    async (cpfToSearch: string) => {
      const clean = cleanCpfDigits(cpfToSearch);
      if (!clean || clean.length !== 11) {
        setCpfError('Por favor, informe os 11 dígitos do CPF.');
        return;
      }
      if (!validateCPF(clean)) {
        setCpfError('CPF com formato ou dígitos verificadores inválidos.');
        return;
      }

      setCpfError(null);
      setSearching(true);
      setHasSearched(true);

      try {
        const targetId = eventId || eventInfo?.id || '';
        const result = await rescueTicketsByCpf(targetId, clean);
        setSearchResult(result);

        if (result.ok && result.found && result.buyer?.phone) {
          setWhatsAppPhone(formatDisplayPhone(result.buyer.phone));
        }

        if (result.ok && result.event && !eventInfo) {
          setEventInfo(result.event);
          setEventId(result.event.id);
        }

        // Atualiza URL com o CPF sem recarregar
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('cpf', clean);
        setSearchParams(nextParams, { replace: true });
      } catch (err: any) {
        console.error('Erro ao buscar ingressos por CPF:', err);
        setSearchResult({
          ok: false,
          found: false,
          error: 'Ocorreu um erro ao consultar os ingressos. Tente novamente.',
        });
      } finally {
        setSearching(false);
      }
    },
    [eventId, eventInfo, searchParams, setSearchParams]
  );

  // Se a URL já contiver ?cpf=..., inicia a busca automaticamente
  useEffect(() => {
    const urlCpf = searchParams.get('cpf');
    if (urlCpf && eventId && !hasSearched && !searching) {
      const formatted = formatCPF(urlCpf);
      setCpfInput(formatted);
      handlePerformSearch(urlCpf);
    }
  }, [searchParams, eventId, hasSearched, searching, handlePerformSearch]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfInput(formatted);
    if (cpfError) setCpfError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSearch(cpfInput);
  };

  const handleCopyCode = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('Código do check-in copiado com sucesso!');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Verifica se a busca localizou ingressos com sucesso
  const hasFoundTickets = Boolean(
    searchResult?.ok && searchResult?.found && searchResult.tickets && searchResult.tickets.length > 0
  );

  // Reseta para a tela de busca com novo CPF
  const handleResetToSearch = useCallback(() => {
    setSearchResult(null);
    setHasSearched(false);
    setCpfError(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('cpf');
    setSearchParams(nextParams, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  // Posiciona a rolagem no topo da tela sempre que a tela exclusiva de ingressos for ativada
  useEffect(() => {
    if (hasFoundTickets) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [hasFoundTickets]);

  // Abre modal para enviar todos os ingressos para o WhatsApp do comprador
  const handleOpenSendAllWhatsApp = () => {
    if (!searchResult?.tickets || searchResult.tickets.length === 0) return;
    setSingleTicketToShare(null);
    setWhatsAppSuccessMessage(null);
    if (searchResult.buyer?.phone && !whatsAppPhone) {
      setWhatsAppPhone(formatDisplayPhone(searchResult.buyer.phone));
    }
    setWhatsAppModalOpen(true);
  };

  // Abre modal para enviar um ingresso específico
  const handleOpenSendSingleTicket = (ticket: RescueTicketItem) => {
    setSingleTicketToShare(ticket);
    setWhatsAppSuccessMessage(null);
    if (ticket.holder_whatsapp) {
      setWhatsAppPhone(formatDisplayPhone(ticket.holder_whatsapp));
    } else if (searchResult?.buyer?.phone) {
      setWhatsAppPhone(formatDisplayPhone(searchResult.buyer.phone));
    }
    setWhatsAppModalOpen(true);
  };

  // Disparo da mensagem de WhatsApp
  const handleConfirmSendWhatsApp = async () => {
    if (!searchResult?.tickets || searchResult.tickets.length === 0) return;

    const ticketsToSend = singleTicketToShare ? [singleTicketToShare] : searchResult.tickets;
    const origin = window.location.origin;
    const cleanCpf = cleanCpfDigits(cpfInput);
    const directUrl = `${origin}/eventos/${eventId}/resgate?cpf=${cleanCpf}`;

    const text = formatRescueWhatsAppMessage({
      eventTitle: eventInfo?.title || searchResult.event?.title || 'Evento Better Now',
      eventDate: eventInfo?.event_date || searchResult.event?.event_date,
      eventLocation: eventInfo?.location || searchResult.event?.location,
      buyerName: singleTicketToShare ? singleTicketToShare.holder_name : (searchResult.buyer?.name || 'Cliente'),
      tickets: ticketsToSend,
      rescueUrl: directUrl,
    });

    setSendingWhatsApp(true);
    try {
      const res = await sendRescueNotification({
        phone: whatsAppPhone || searchResult.buyer?.phone || '',
        message: text,
      });

      if (res.viaWaha) {
        setWhatsAppSuccessMessage('Ingressos enviados com sucesso pelo canal oficial do evento!');
        toast.success('Ingressos enviados para seu WhatsApp!');
      } else {
        // Fallback: abre no WhatsApp direto
        window.open(res.directUrl, '_blank');
        setWhatsAppSuccessMessage('Abrindo o WhatsApp com todos os seus ingressos e QR Codes...');
        toast.success('Mensagem preparada no WhatsApp!');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem no WhatsApp:', err);
      // Fallback garantido
      const directUrl = buildWhatsAppDirectUrl(whatsAppPhone, text);
      window.open(directUrl, '_blank');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Formatação de data do evento
  const formattedEventDate = useMemo(() => {
    if (!eventInfo?.event_date) return null;
    let str = formatBrazilDate(eventInfo.event_date);
    if (eventInfo.start_time) {
      str += ` às ${eventInfo.start_time}`;
    }
    return str;
  }, [eventInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col">
      {/* Barra superior de navegação */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (eventId) {
                navigate(`/eventos/${eventId}`);
              } else {
                navigate('/eventos');
              }
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Evento</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Portal Seguro de Resgate</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {hasFoundTickets && searchResult ? (
          /* ========================================================
             TELA EXCLUSIVA DE INGRESSOS LOCALIZADOS (Foco imediato no mobile)
             ======================================================== */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Barra de Ações Superior & Navegação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/80 border border-white/10 rounded-2xl p-4 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={handleResetToSearch}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Buscar Outro CPF</span>
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                <span className="text-slate-400">CPF Consultado:</span>
                <span className="font-mono font-bold text-indigo-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10 select-all">
                  {formatCPF(cpfInput)}
                </span>
              </div>
            </div>

            {/* Cabeçalho Compacto do Evento */}
            <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {eventInfo?.title || searchResult.event?.title || 'Evento'}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                  {formattedEventDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {formattedEventDate}
                    </span>
                  )}
                  {(eventInfo?.location || searchResult.event?.location) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {eventInfo?.location || searchResult.event?.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{searchResult.total_tickets} {searchResult.total_tickets === 1 ? 'Ingresso Disponível' : 'Ingressos Disponíveis'}</span>
              </div>
            </div>

            {/* Banner de Boas-vindas ao Comprador & CTA Principal (WhatsApp) */}
            <div className="bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-slate-900/80 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ingressos Localizados com Sucesso</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Olá, {searchResult.buyer?.name}! 👋
                </h2>

                <p className="text-xs sm:text-sm text-slate-300">
                  Encontramos <strong>{searchResult.total_tickets}</strong> {searchResult.total_tickets === 1 ? 'ingresso / cortesia emitido' : 'ingressos / cortesias emitidos'} vinculados ao seu CPF.
                </p>
              </div>

              {/* Botão em Destaque: "Enviar pro meu WhatsApp" */}
              <button
                type="button"
                onClick={handleOpenSendAllWhatsApp}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none shrink-0"
              >
                <MessageSquare className="w-5 h-5 fill-white" />
                <span>Enviar pro meu WhatsApp</span>
              </button>
            </div>

            {/* Lista de Cards de Ingressos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {(searchResult.tickets || []).map((ticket) => {
                const isUsed = ticket.status === 'used';
                const isCortesia =
                  ticket.batch_name?.toLowerCase().includes('cortesia') ||
                  ticket.batch_name?.toLowerCase().includes('vip') ||
                  ticket.qr_code_hash?.startsWith('VIP-');

                return (
                  <div
                    key={ticket.id}
                    className={`rounded-3xl p-5 sm:p-6 border flex flex-col justify-between transition-all duration-200 ${
                      isUsed
                        ? 'bg-slate-900/90 border-slate-700/60 opacity-90'
                        : isCortesia
                        ? 'bg-slate-800/90 border-amber-500/30 hover:border-amber-400/60 shadow-xl'
                        : 'bg-slate-800/90 border-white/10 hover:border-indigo-400/50 shadow-xl'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Cabeçalho do Card */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-indigo-400" />
                            Ingresso #{ticket.ticket_number}
                          </span>
                          {isCortesia && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Cortesia VIP
                            </span>
                          )}
                        </div>

                        {isUsed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                            Check-in Realizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Válido para Entrada
                          </span>
                        )}
                      </div>

                      {/* Dados do Titular e Lote */}
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Titular do Ingresso
                        </p>
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">
                          {ticket.holder_name}
                        </h3>
                        <p className="text-xs text-indigo-300 font-medium">
                          Lote: {ticket.batch_name || (isCortesia ? 'Cortesia VIP' : 'Geral')}
                        </p>
                      </div>

                      {/* Área do QR Code com opção de Ampliar */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-white/5">
                        <div
                          onClick={() => setEnlargedTicket(ticket)}
                          className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-md cursor-pointer hover:scale-105 transition-transform flex flex-col items-center shrink-0 group"
                          title="Clique para ampliar o QR Code na tela inteira"
                        >
                          <QRCodeSVG
                            value={ticket.qr_code_hash}
                            size={110}
                            level="M"
                            includeMargin={false}
                          />
                          <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 mt-1.5 flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" /> Ampliar
                          </span>
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left w-full min-w-0">
                          <p className="text-[11px] text-slate-400 font-medium">
                            Código do Check-in:
                          </p>
                          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-white/10">
                            <span className="font-mono text-xs text-indigo-300 truncate select-all flex-1">
                              {ticket.qr_code_hash}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(ticket.qr_code_hash)}
                              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Copiar Código"
                            >
                              {copiedHash === ticket.qr_code_hash ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <p className="text-[10px] text-slate-500 leading-tight">
                            Apresente este QR Code no celular na portaria do evento.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ações Individuais do Ingresso */}
                    <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEnlargedTicket(ticket)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ver em Tela Cheia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSendSingleTicket(ticket)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        title="Encaminhar este ingresso individual no WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé da tela exclusiva para facilitar nova consulta */}
            <div className="pt-4 pb-2 text-center">
              <button
                type="button"
                onClick={handleResetToSearch}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <span>Fazer Consulta com Outro CPF</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             TELA DE BUSCA (Formulário do CPF)
             ======================================================== */
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Banner e Cabeçalho do Evento */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-800/80 border border-white/10 shadow-2xl backdrop-blur-xl">
              {eventInfo?.image_url && (
                <div className="h-44 sm:h-56 w-full relative overflow-hidden">
                  <img
                    src={eventInfo.image_url}
                    alt={eventInfo.title}
                    className="w-full h-full object-cover filter brightness-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-4 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Resgate de Ingressos & QR Code</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {loadingEvent ? 'Carregando evento...' : eventInfo?.title || 'Resgate de Ingressos do Evento'}
                </h1>

                {/* Informações de Data e Local */}
                <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-300 pt-1">
                  {formattedEventDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{formattedEventDate}</span>
                    </div>
                  )}
                  {eventInfo?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{eventInfo.location}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl pt-1">
                  Perdeu seu ingresso ou o QR Code de entrada? Digite o <strong>CPF do comprador ou convidado VIP</strong> utilizado
                  no momento da compra ou emissão para resgatar todos os seus ingressos e cortesias com QR Code para check-in e enviá-los
                  diretamente para o seu WhatsApp.
                </p>
              </div>
            </div>

            {/* Card do Formulário de Busca por CPF */}
            <div className="bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl backdrop-blur-xl space-y-5">
              <div className="space-y-1">
                <label htmlFor="cpf-input" className="block text-sm font-bold text-white">
                  CPF do Comprador ou Convidado
                </label>
                <p className="text-xs text-slate-400">
                  Informe o CPF cadastrado na compra paga ou na cortesia VIP para localizar todos os ingressos vinculados deste evento.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    id="cpf-input"
                    type="text"
                    inputMode="numeric"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    autoFocus
                    className={`w-full bg-slate-900/90 text-white placeholder-slate-500 text-lg sm:text-xl font-mono tracking-wider px-4 py-3.5 sm:py-4 rounded-2xl border transition-all outline-none focus:ring-2 ${
                      cpfError
                        ? 'border-rose-500 focus:ring-rose-500/40'
                        : 'border-white/20 focus:border-indigo-400 focus:ring-indigo-500/40'
                    }`}
                  />

                  {cpfInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setCpfInput('');
                        setSearchResult(null);
                        setHasSearched(false);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Limpar CPF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {cpfError && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs sm:text-sm font-medium animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cpfError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={searching || !cpfInput}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer select-none"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Buscando Ingressos & Cortesias...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Buscar Meus Ingressos</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Caso: Nenhum ingresso encontrado para o CPF */}
            {hasSearched && !searching && searchResult && !searchResult.found && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400">
                  <AlertCircle className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Nenhum ingresso ou cortesia encontrado</h3>
                  <p className="text-xs sm:text-sm text-rose-200/80 max-w-md mx-auto leading-relaxed">
                    Não encontramos compras aprovadas ou cortesias vinculadas ao CPF <strong>{formatCPF(cpfInput)}</strong> para este evento.
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-2xl p-4 max-w-lg mx-auto text-left text-xs text-slate-300 space-y-2 border border-white/5">
                  <p className="font-semibold text-slate-200">💡 Dicas para encontrar seus ingressos:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li><strong>Ingressos Pagos & Cortesias:</strong> Ambos são resgatados por este formulário com o CPF cadastrado.</li>
                    <li>Verifique se o pedido foi concluído com o CPF de outra pessoa ou amigo.</li>
                    <li>Se o pagamento foi feito por Pix recentemente, pode levar alguns segundos para conciliação.</li>
                    <li>Caso precise de suporte, contate a organização do evento pelo grupo do WhatsApp.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Enviar para o WhatsApp (Sem alert() nem confirm(), modal visual completo) */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Enviar Ingressos no WhatsApp</h3>
                  <p className="text-xs text-emerald-100">
                    {singleTicketToShare
                      ? `Ingresso #${singleTicketToShare.ticket_number} - ${singleTicketToShare.holder_name}`
                      : `Todos os ${searchResult?.total_tickets || 0} ingressos resgatados`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWhatsAppModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-4">
              {whatsAppSuccessMessage ? (
                <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">{whatsAppSuccessMessage}</p>
                  <button
                    type="button"
                    onClick={() => setWhatsAppModalOpen(false)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  {/* Destinatário Oficial Cadastrado (Bloqueado para edição por segurança) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-slate-300">
                        Destinatário Oficial do WhatsApp
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        Número Cadastrado
                      </span>
                    </div>

                    {whatsAppPhone ? (
                      <div className="flex items-center gap-3 bg-slate-950 border border-emerald-500/40 rounded-2xl px-4 py-3.5 shadow-inner">
                        <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-white text-base sm:text-lg font-mono font-bold tracking-wider flex-1 select-all">
                          {whatsAppPhone}
                        </span>
                        <span title="Número verificado do comprador" className="flex items-center text-emerald-400 shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </span>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          Nenhum número de WhatsApp foi vinculado a este pedido. Por gentileza, apresente o QR Code na tela ou entre em contato com a organização.
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        Por segurança e proteção contra destinatários indesejados, o envio é restrito <strong>exclusivamente ao número oficial cadastrado</strong> no pedido.
                      </span>
                    </p>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-white/5 space-y-1.5 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">A mensagem inclui:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                      <li>Título, data e local do evento</li>
                      <li>Código de check-in de cada participante</li>
                      <li>Link direto para abrir os QR Codes no celular</li>
                      <li>Dicas e orientações de entrada na portaria</li>
                    </ul>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setWhatsAppModalOpen(false)}
                      className="flex-1 py-3 px-4 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmSendWhatsApp}
                      disabled={sendingWhatsApp || !whatsAppPhone}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingWhatsApp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Code em Tela Cheia para Portaria */}
      {enlargedTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedTicket(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-slate-900 shadow-2xl flex flex-col items-center space-y-4 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEnlargedTicket(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Ingresso #{enlargedTicket.ticket_number}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                {enlargedTicket.holder_name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {eventInfo?.title || 'Evento'}
              </p>
            </div>

            {/* QR Code com alto contraste para leitura rápida */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-inner">
              <QRCodeSVG
                value={enlargedTicket.qr_code_hash}
                size={230}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1 w-full">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Código de Check-in
              </p>
              <div className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg select-all">
                {enlargedTicket.qr_code_hash}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnlargedTicket(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Pronto / Fechar
            </button>
          </div>
        </div>
      )}

      {/* Rodapé simples e limpo */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <p>Better Now • Gestão de Eventos e Ingressos Digitais</p>
      </footer>
    </div>
  );
};

export default PublicEventTicketRescue;
