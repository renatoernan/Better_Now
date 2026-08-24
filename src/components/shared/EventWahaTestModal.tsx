import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Smartphone,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { sendWahaTextMessage, formatMessageTemplate } from '../../shared/services/wahaService';
import { formatBrazilDate } from '../../shared/utils/utils/eventUtils';

export type TemplateType = 'created' | 'confirmed' | 'cancelled';

interface EventWahaTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  wahaMsgCreated?: string;
  wahaMsgConfirmed?: string;
  wahaMsgCancelled?: string;
}

const DEFAULT_TEMPLATES = {
  created: 'Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!',
  confirmed: '🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}',
  cancelled: 'Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco.',
};

export const EventWahaTestModal: React.FC<EventWahaTestModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  eventLocation,
  wahaMsgCreated,
  wahaMsgConfirmed,
  wahaMsgCancelled,
}) => {
  const [selectedType, setSelectedType] = useState<TemplateType>('confirmed');
  const [phone, setPhone] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [wahaConfig, setWahaConfig] = useState<{
    apiUrl: string;
    sessionName: string;
    apiKey: string;
    enabled: boolean;
  } | null>(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Carregar configurações do WAHA ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      return;
    }

    const fetchWahaSettings = async () => {
      setLoadingConfig(true);
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'waha_api_url',
            'waha_session_name',
            'waha_api_key',
            'waha_enabled',
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

        setWahaConfig({
          apiUrl: settings.waha_api_url || '',
          sessionName: settings.waha_session_name || 'default',
          apiKey: settings.waha_api_key || '',
          enabled: settings.waha_enabled !== false,
        });
      } catch (err) {
        console.warn('Erro ao carregar configurações do WAHA:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchWahaSettings();
  }, [isOpen]);

  // Formatação de telefone
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return match;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
    if (result) setResult(null);
  };

  // Obter template selecionado (do formulário ou fallback default)
  const currentTemplate = useMemo(() => {
    if (selectedType === 'created') {
      return wahaMsgCreated && wahaMsgCreated.trim() !== '' ? wahaMsgCreated : DEFAULT_TEMPLATES.created;
    }
    if (selectedType === 'confirmed') {
      return wahaMsgConfirmed && wahaMsgConfirmed.trim() !== '' ? wahaMsgConfirmed : DEFAULT_TEMPLATES.confirmed;
    }
    return wahaMsgCancelled && wahaMsgCancelled.trim() !== '' ? wahaMsgCancelled : DEFAULT_TEMPLATES.cancelled;
  }, [selectedType, wahaMsgCreated, wahaMsgConfirmed, wahaMsgCancelled]);

  // Mensagem formatada com variáveis de teste
  const formattedMessage = useMemo(() => {
    const formattedDate = eventDate ? formatBrazilDate(eventDate) : '25/12/2026 às 20:00';
    const variables = {
      cliente: 'João da Silva (Teste)',
      evento: eventTitle || 'Nome do Evento',
      total: 'R$ 150,00',
      quantidade: '2 ingressos',
      data_evento: formattedDate,
      local_evento: eventLocation || 'Espaço de Eventos',
      numero_pedido: 'BN-84920',
      link_acesso: `${window.location.origin}/meus-pedidos?code=DEMO-123`,
    };
    return formatMessageTemplate(currentTemplate, variables);
  }, [currentTemplate, eventTitle, eventDate, eventLocation]);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');

    if (!cleanDigits || cleanDigits.length < 10) {
      setResult({
        success: false,
        message: 'Por favor, informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).',
      });
      return;
    }

    if (!wahaConfig?.apiUrl) {
      setResult({
        success: false,
        message: 'O servidor WAHA não está configurado nas Configurações Gerais do sistema.',
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const sendRes = await sendWahaTextMessage({
        apiUrl: wahaConfig.apiUrl,
        sessionName: wahaConfig.sessionName || 'default',
        apiKey: wahaConfig.apiKey,
        phone: cleanDigits,
        text: formattedMessage,
      });

      setResult({
        success: sendRes.success,
        message: sendRes.success
          ? `Mensagem de teste enviada com sucesso para ${phone}!`
          : sendRes.message || 'Falha ao enviar mensagem pelo WAHA.',
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Erro de conexão ao tentar enviar mensagem de teste.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-xs">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Testar Envio de Mensagem WhatsApp
              </h3>
              <p className="text-xs text-emerald-100">
                Dispare uma mensagem real para validar a formatação do seu evento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleSendTest} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Seletor de Tipo de Mensagem */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Selecione a Mensagem a ser Testada:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedType('created');
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === 'created'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <span className="text-xs font-bold block">1. Pedido Criado</span>
                <span className="text-[11px] text-gray-500 font-normal">Aguardando Pagamento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedType('confirmed');
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === 'confirmed'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <span className="text-xs font-bold block">2. Confirmado</span>
                <span className="text-[11px] text-gray-500 font-normal">Ingressos Emitidos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedType('cancelled');
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === 'cancelled'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <span className="text-xs font-bold block">3. Cancelado</span>
                <span className="text-[11px] text-gray-500 font-normal">Pedido Recusado</span>
              </button>
            </div>
          </div>

          {/* Campo de Telefone do Destinatário */}
          <div>
            <label htmlFor="test_phone" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Número de WhatsApp do Destinatário (com DDD) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                id="test_phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-gray-900 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={sending}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Informe o número onde deseja receber a mensagem de teste em tempo real.
            </p>
          </div>

          {/* Prévia da Mensagem (Balão do WhatsApp) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Prévia da Mensagem (com Dados Simulados):
              </label>
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" /> Visualização em Tempo Real
              </span>
            </div>
            <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-gray-300/80 shadow-inner">
              <div className="bg-[#DCF8C6] text-gray-900 p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs whitespace-pre-wrap leading-relaxed max-w-sm ml-auto border border-emerald-200/50">
                {formattedMessage}
                <div className="text-[10px] text-gray-500 text-right mt-1.5 flex items-center justify-end gap-1">
                  <span>12:00</span>
                  <span className="text-emerald-700 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações da Conexão WAHA */}
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 p-3 bg-gray-50 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              Carregando configurações do WAHA...
            </div>
          ) : !wahaConfig?.apiUrl ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> O servidor WAHA ainda não foi configurado nas Configurações Gerais do sistema. O envio falhará até que a URL seja informada.
              </div>
            </div>
          ) : null}

          {/* Feedback de Resultado */}
          {result && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{result.message}</div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-xs cursor-pointer disabled:opacity-50"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={sending || !phone.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Disparar Mensagem de Teste
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventWahaTestModal;
