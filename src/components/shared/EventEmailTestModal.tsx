import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { sendSmtpEmail } from '../../shared/services/emailService';
import { formatBrazilDate, formatPrice } from '../../shared/utils/utils/eventUtils';
import { formatMessageTemplate } from '../../shared/services/wahaService';
import { generateEmailHtml } from '../../shared/services/orderNotificationService';

export type EmailTemplateType = 'created' | 'confirmed' | 'cancelled';

interface EventEmailTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  emailMsgCreatedSubj?: string;
  emailMsgCreatedBody?: string;
  emailMsgConfirmedSubj?: string;
  emailMsgConfirmedBody?: string;
  emailMsgCancelledSubj?: string;
  emailMsgCancelledBody?: string;
}

const DEFAULT_TEMPLATES = {
  created: {
    subject: 'Pedido Recebido #{numero_pedido} - {evento}',
    body: 'Olá, {cliente}!\n\nRecebemos o seu pedido #{numero_pedido} para o evento {evento}.\n\nValor Total: {total}\nQuantidade de Ingressos: {quantidade}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos com QR Code por aqui!',
  },
  confirmed: {
    subject: '🎉 Ingressos Confirmados! Pedido #{numero_pedido} - {evento}',
    body: 'Parabéns, {cliente}!\n\nSeu pagamento para o evento {evento} foi confirmado com sucesso!\n\nDetalhes do Evento:\n- Data: {data_evento}\n- Local: {local_evento}\n- Quantidade de Ingressos: {quantidade}\n\nVocê pode visualizar seus ingressos e QR Codes no link abaixo:\n{link_acesso}',
  },
  cancelled: {
    subject: 'Pedido Cancelado #{numero_pedido} - {evento}',
    body: 'Olá, {cliente}.\n\nInformamos que seu pedido #{numero_pedido} para o evento {evento} foi cancelado.\n\nSe tiver alguma dúvida, entre em contato conosco.',
  },
};

export const EventEmailTestModal: React.FC<EventEmailTestModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  eventLocation,
  emailMsgCreatedSubj,
  emailMsgCreatedBody,
  emailMsgConfirmedSubj,
  emailMsgConfirmedBody,
  emailMsgCancelledSubj,
  emailMsgCancelledBody,
}) => {
  const [selectedType, setSelectedType] = useState<EmailTemplateType>('confirmed');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [emailConfig, setEmailConfig] = useState<{
    outgoingHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword?: string;
    fromName?: string;
    fromAddress?: string;
    security?: string;
    authRequired?: boolean;
    enabled: boolean;
  } | null>(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  // Carregar configurações de e-mail ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      return;
    }

    const fetchEmailSettings = async () => {
      setLoadingConfig(true);
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'email_outgoing_host',
            'email_smtp_port',
            'email_smtp_user',
            'email_smtp_password',
            'email_from_name',
            'email_from_address',
            'email_security',
            'email_auth_required',
            'email_enabled',
          ]);

        const settings: Record<string, any> = {};
        (data || []).forEach(item => {
          let val = item.value;
          if (typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch {
              // Mantém valor original
            }
          }
          settings[item.key] = val;
        });

        const cfg = {
          outgoingHost: settings.email_outgoing_host || '',
          smtpPort: Number(settings.email_smtp_port) || 465,
          smtpUser: settings.email_smtp_user || '',
          smtpPassword: settings.email_smtp_password || '',
          fromName: settings.email_from_name || 'Better Now',
          fromAddress: settings.email_from_address || settings.email_smtp_user || '',
          security: settings.email_security || 'ssl_tls',
          authRequired: settings.email_auth_required !== false,
          enabled: settings.email_enabled !== false,
        };

        setEmailConfig(cfg);
        if (!recipientEmail && cfg.smtpUser) {
          setRecipientEmail(cfg.smtpUser);
        }
      } catch (err) {
        console.warn('Erro ao carregar configurações de e-mail para teste:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchEmailSettings();
  }, [isOpen]);

  // Mensagem bruta e assunto selecionados
  const { rawSubject, rawBody } = useMemo(() => {
    if (selectedType === 'created') {
      return {
        rawSubject: emailMsgCreatedSubj || DEFAULT_TEMPLATES.created.subject,
        rawBody: emailMsgCreatedBody || DEFAULT_TEMPLATES.created.body,
      };
    }
    if (selectedType === 'cancelled') {
      return {
        rawSubject: emailMsgCancelledSubj || DEFAULT_TEMPLATES.cancelled.subject,
        rawBody: emailMsgCancelledBody || DEFAULT_TEMPLATES.cancelled.body,
      };
    }
    return {
      rawSubject: emailMsgConfirmedSubj || DEFAULT_TEMPLATES.confirmed.subject,
      rawBody: emailMsgConfirmedBody || DEFAULT_TEMPLATES.confirmed.body,
    };
  }, [
    selectedType,
    emailMsgCreatedSubj,
    emailMsgCreatedBody,
    emailMsgConfirmedSubj,
    emailMsgConfirmedBody,
    emailMsgCancelledSubj,
    emailMsgCancelledBody,
  ]);

  // Pré-visualização com dados simulados
  const { previewSubject, previewBody } = useMemo(() => {
    const formattedDate = eventDate ? formatBrazilDate(eventDate) : '20/12/2026 às 20:00';
    const mockData = {
      cliente: 'Renato Ernan (Exemplo)',
      numero_pedido: 'BN98F2A1',
      evento: eventTitle || 'Show Especial Better Now',
      total: formatPrice(150),
      quantidade: 2,
      data_evento: formattedDate,
      local_evento: eventLocation || 'Espaço de Eventos Central',
      link_acesso: `${typeof window !== 'undefined' ? window.location.origin : ''}/eventos/exemplo?payment=success&order_id=mock-123`,
    };

    return {
      previewSubject: formatMessageTemplate(rawSubject, mockData),
      previewBody: formatMessageTemplate(rawBody, mockData),
    };
  }, [rawSubject, rawBody, eventTitle, eventDate, eventLocation]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      setResult({ success: false, message: 'Informe o e-mail de destino para o teste.' });
      return;
    }

    if (!emailConfig || !emailConfig.outgoingHost || !emailConfig.smtpUser) {
      setResult({
        success: false,
        message: 'Servidor de E-mail não configurado em "Configurações > Servidor de E-mail".',
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const formattedDate = eventDate ? formatBrazilDate(eventDate) : '20/12/2026 às 20:00';
      const emailHtml = generateEmailHtml({
        type: selectedType,
        clientName: 'Renato Ernan (Exemplo)',
        orderNumber: 'BN98F2A1',
        eventTitle: eventTitle || 'Show Especial Better Now',
        total: formatPrice(150),
        quantity: 2,
        eventDate: formattedDate,
        eventLocation: eventLocation || 'Espaço de Eventos Central',
        accessLink: `${origin}/eventos/exemplo?payment=success&order_id=mock-123`,
        contentBody: previewBody,
      });

      const res = await sendSmtpEmail({
        smtpHost: emailConfig.outgoingHost,
        smtpPort: emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser,
        smtpPassword: emailConfig.smtpPassword,
        fromName: emailConfig.fromName,
        fromAddress: emailConfig.fromAddress,
        to: recipientEmail.trim(),
        subject: previewSubject,
        text: previewBody,
        html: emailHtml,
        security: emailConfig.security,
        authRequired: emailConfig.authRequired,
      });

      if (res.success) {
        setResult({
          success: true,
          message: `E-mail de teste enviado com sucesso para ${recipientEmail}!`,
          details: res.messageId ? `ID: ${res.messageId}` : undefined,
        });
      } else {
        setResult({
          success: false,
          message: res.message || 'Falha ao disparar e-mail de teste.',
          details: res.error,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Erro inesperado ao disparar teste de e-mail.',
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Teste de E-mail do Evento</h3>
              <p className="text-xs text-sky-100">Dispare um e-mail com as tags reais substituídas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSendTest} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Seletor de Modelo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Selecione o Modelo para Testar:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'created', label: '1. Pedido Criado', color: 'amber' },
                { id: 'confirmed', label: '2. Confirmado', color: 'emerald' },
                { id: 'cancelled', label: '3. Cancelado', color: 'rose' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(item.id as EmailTemplateType);
                    setResult(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedType === item.id
                      ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs ring-1 ring-sky-500'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pré-visualização do Assunto e Mensagem */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Pré-visualização do E-mail (Tags Preenchidas):
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Assunto:</div>
              <div className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg p-2 mt-0.5">
                {previewSubject}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Corpo da Mensagem:</div>
              <div className="text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-3 mt-0.5 whitespace-pre-wrap leading-relaxed">
                {previewBody}
              </div>
            </div>
          </div>

          {/* Campo Destinatário */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              E-mail de Destino do Teste:
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="seuemail@dominio.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* Feedback de Resultado */}
          {result && (
            <div
              className={`p-3.5 rounded-xl text-xs flex flex-col gap-1 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="font-semibold">{result.message}</span>
              </div>
              {result.details && (
                <div className="pl-6 font-mono text-[11px] opacity-80 break-all">
                  {result.details}
                </div>
              )}
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={sending || loadingConfig || !recipientEmail}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Disparando E-mail...' : 'Enviar E-mail de Teste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventEmailTestModal;
