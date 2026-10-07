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
  Check,
  ArrowRightLeft,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import {
  OrderNotificationType,
  OrderTicketTransfer,
  getOrderTicketTransfers,
  sendTicketTransferNotifications,
} from '../../shared/services/orderNotificationService';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { formatPhone } from '../../shared/utils/utils/phoneUtils';
import { supabase } from '../../shared/services/lib/supabase';

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
  const [notificationType, setNotificationType] = useState<OrderNotificationType | 'transfer'>('confirmed');
  // Reenvio da mensagem de transferência
  const [transfers, setTransfers] = useState<OrderTicketTransfer[]>([]);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<'from' | 'to' | 'both'>('both');
  const [copyBackstage, setCopyBackstage] = useState<boolean>(false);
  const [enableWhatsApp, setEnableWhatsApp] = useState<boolean>(true);
  const [enableEmail, setEnableEmail] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<{
    phone: string;
    email: string;
    name: string;
  }>({
    phone: '',
    email: '',
    name: ''
  });

  // Inicializa com base no status do pedido e sincroniza com o cadastro mais recente de app_people
  useEffect(() => {
    if (order && isOpen) {
      const isPaid = order.status === 'paid' || (order.status as string) === 'approved';
      if (isPaid) {
        setNotificationType('confirmed');
      } else if (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'failed') {
        setNotificationType('cancelled');
      } else {
        setNotificationType('created');
      }

      const initialPhone = order.client_phone || '';
      const initialEmail = order.client_email || '';
      const initialName = order.client_name || '';

      setRecipient({
        phone: initialPhone,
        email: initialEmail,
        name: initialName,
      });

      setEnableWhatsApp(!!initialPhone.trim());
      setEnableEmail(!!initialEmail.trim());

      // Buscar dados mais atualizados do cadastro em app_people
      const syncPerson = async () => {
        try {
          let personData: any = null;
          if (order.client_id) {
            const { data } = await supabase
              .from('app_people')
              .select('id, nome, whatsapp, telefone, email')
              .eq('id', order.client_id)
              .maybeSingle();
            if (data) personData = data;
          }

          if (!personData && (order.client_document || (order as any).documento || (order as any).cpf)) {
            const cleanDoc = (order.client_document || (order as any).documento || (order as any).cpf).replace(/\D/g, '');
            if (cleanDoc) {
              const { data } = await supabase
                .from('app_people')
                .select('id, nome, whatsapp, telefone, email')
                .eq('documento', cleanDoc)
                .maybeSingle();
              if (data) personData = data;
            }
          }

          if (personData) {
            const updatedPhone = personData.whatsapp || personData.telefone || initialPhone;
            const updatedEmail = personData.email || initialEmail;
            const updatedName = personData.nome || initialName;

            setRecipient({
              phone: updatedPhone,
              email: updatedEmail,
              name: updatedName,
            });

            setEnableWhatsApp(!!updatedPhone?.trim());
            setEnableEmail(!!updatedEmail?.trim());
          }
        } catch (err) {
          console.warn('Erro ao sincronizar dados da pessoa no modal:', err);
        }
      };

      syncPerson();

      // Transferências registradas do pedido, para o reenvio
      setTransfers([]);
      setSelectedTransferId(null);
      setTransferTarget('both');
      setCopyBackstage(false);
      getOrderTicketTransfers(order)
        .then((list) => {
          setTransfers(list);
          setSelectedTransferId(list[0]?.id || null);
        })
        .catch(() => setTransfers([]));
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const currentPhone = recipient.phone || order.client_phone || '';
  const currentEmail = recipient.email || order.client_email || '';
  const currentName = recipient.name || order.client_name || 'Comprador não identificado';

  const hasPhone = !!currentPhone.trim();
  const hasEmail = !!currentEmail.trim();
  const isPaid = order.status === 'paid' || (order.status as string) === 'approved';

  const orderNumber = order.id.substring(0, 8).toUpperCase();
  const formattedTotal = formatPrice(Number(order.amount_total) || 0);

  const isTransferMode = notificationType === 'transfer';
  const selectedTransfer = transfers.find(t => t.id === selectedTransferId) || null;
  const fromHasPhone = !!selectedTransfer?.from.phone;
  const toHasPhone = !!selectedTransfer?.to.phone;
  const sendToFrom = (transferTarget === 'from' || transferTarget === 'both') && fromHasPhone;
  const sendToTo = (transferTarget === 'to' || transferTarget === 'both') && toHasPhone;
  const transferRecipientsCount = (sendToFrom ? 1 : 0) + (sendToTo ? 1 : 0);

  const handleResendTransfer = async () => {
    if (!selectedTransfer || transferRecipientsCount === 0) return;
    setLoading(true);
    try {
      const { from, to, backstage } = await sendTicketTransferNotifications({
        ticketId: selectedTransfer.ticketId,
        orderId: order.id,
        eventId: (order as any).event_id,
        ticketNumber: selectedTransfer.ticketNumber,
        from: selectedTransfer.from,
        to: selectedTransfer.to,
        targets: { from: sendToFrom, to: sendToTo, backstage: copyBackstage },
        isResend: true,
      });

      const results = [
        from && { who: selectedTransfer.from.name, ...from },
        to && { who: selectedTransfer.to.name, ...to },
        backstage && { who: 'Backstage', ...backstage },
      ].filter(Boolean) as { who: string; success: boolean; message: string }[];

      const ok = results.filter(r => r.success).map(r => r.who);
      const ko = results.filter(r => !r.success).map(r => `${r.who} (${r.message})`);
      if (ok.length) toast.success(`Mensagem de transferência reenviada para ${ok.join(', ')}.`);
      if (ko.length) toast.error(`Não enviada para ${ko.join(', ')}.`);
      if (ok.length && !ko.length) onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTransferMode) {
      await handleResendTransfer();
      return;
    }
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
                <span className="text-sm font-semibold text-slate-800">{currentName}</span>
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
            <div className={`grid gap-2 ${transfers.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
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

              {transfers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNotificationType('transfer')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isTransferMode
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowRightLeft className={`w-4 h-4 ${isTransferMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Transferência</span>
                </button>
              )}
            </div>
          </div>

          {isTransferMode && (
            <div className="space-y-4">
              {transfers.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Qual transferência
                  </label>
                  <div className="space-y-1.5">
                    {transfers.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTransferId(t.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          selectedTransferId === t.id
                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-slate-800">Ingresso #{t.ticketNumber ?? '?'}</span>
                        <span className="text-slate-600"> · {t.from.name} → {t.to.name}</span>
                        {t.transferredAt && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {new Date(t.transferredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransfer && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Enviar para
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'from', label: 'Quem transferiu', sub: selectedTransfer.from.name, enabled: fromHasPhone },
                      { key: 'to', label: 'Quem recebeu', sub: selectedTransfer.to.name, enabled: toHasPhone },
                      { key: 'both', label: 'Ambos', sub: 'As duas pontas', enabled: fromHasPhone || toHasPhone },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={!opt.enabled || loading}
                        onClick={() => setTransferTarget(opt.key)}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col items-center gap-0.5 text-center transition-all ${
                          !opt.enabled
                            ? 'bg-slate-100/60 border-slate-200 text-slate-400 cursor-not-allowed'
                            : transferTarget === opt.key
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-1 ring-indigo-500/30 cursor-pointer'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] opacity-80 truncate max-w-full">{opt.sub}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {[
                      { label: 'Quem transferiu', person: selectedTransfer.from, active: sendToFrom },
                      { label: 'Quem recebeu', person: selectedTransfer.to, active: sendToTo },
                    ].map(row => (
                      <div key={row.label} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${row.active ? '' : 'opacity-50'}`}>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{row.label}</p>
                          <p className="font-semibold text-slate-800 truncate">{row.person.name}</p>
                        </div>
                        <span className="text-slate-500 shrink-0">
                          {row.person.phone ? formatPhone(row.person.phone) : 'Sem WhatsApp cadastrado'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={copyBackstage}
                      onChange={(e) => setCopyBackstage(e.target.checked)}
                      disabled={loading}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Enviar cópia ao Backstage do evento (identificada como reenvio)
                  </label>
                </div>
              )}

              {selectedTransfer && transferRecipientsCount === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>A pessoa selecionada não tem WhatsApp cadastrado.</span>
                </div>
              )}
            </div>
          )}

          {/* Seleção dos Canais de Envio (Switches Independentes) */}
          {!isTransferMode && (
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
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {hasPhone ? formatPhone(currentPhone) : 'Telefone não cadastrado no pedido'}
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
                      {hasEmail ? currentEmail : 'E-mail não cadastrado no pedido'}
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

          )}

          {/* Aviso se nenhum canal estiver selecionado */}
          {!isTransferMode && selectedChannelsCount === 0 && (
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
              disabled={loading || (isTransferMode ? transferRecipientsCount === 0 : selectedChannelsCount === 0)}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                loading || (isTransferMode ? transferRecipientsCount === 0 : selectedChannelsCount === 0)
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
                  <span>
                    {isTransferMode
                      ? `Reenviar (${transferRecipientsCount} ${transferRecipientsCount === 1 ? 'pessoa' : 'pessoas'})`
                      : `Disparar (${selectedChannelsCount} ${selectedChannelsCount === 1 ? 'canal' : 'canais'})`}
                  </span>
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
