import React, { useState } from 'react';
import { X, Play, Send, CheckCircle2, AlertTriangle, XCircle, Loader2, Smartphone, Globe, ShieldCheck, RefreshCw } from 'lucide-react';
import { checkWahaSession, sendWahaTextMessage, WahaSessionStatus } from '../../shared/services/wahaService';

interface WahaTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  sessionName: string;
  apiKey?: string;
}

export const WahaTestModal: React.FC<WahaTestModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  sessionName,
  apiKey,
}) => {
  const [checkingSession, setCheckingSession] = useState(false);
  const [sessionResult, setSessionResult] = useState<WahaSessionStatus | null>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('👋 Olá! Esta é uma mensagem de teste do sistema Better Now enviada com sucesso pelo WAHA.');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCheckSession = async () => {
    setCheckingSession(true);
    setSessionResult(null);
    try {
      const result = await checkWahaSession(apiUrl, sessionName, apiKey);
      setSessionResult(result);
    } catch (err: any) {
      setSessionResult({
        success: false,
        status: 'FAILED',
        message: err.message || 'Erro ao conectar ao servidor WAHA',
      });
    } finally {
      setCheckingSession(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setSendResult({
        success: false,
        message: 'Por favor, informe o número de WhatsApp para teste com DDD.',
      });
      return;
    }

    setSendingMessage(true);
    setSendResult(null);
    try {
      const result = await sendWahaTextMessage({
        apiUrl,
        sessionName,
        apiKey,
        phone: testPhone,
        text: testMessage,
      });
      setSendResult(result);
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Erro inesperado ao enviar mensagem.',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-5 h-5 text-white fill-white/30" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Teste de Conexão WhatsApp (WAHA)</h3>
              <p className="text-xs text-emerald-100">Valide o status da sessão e envie mensagens em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Dados Atuais */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-emerald-600" /> Servidor:
              </span>
              <span className="font-mono text-slate-800 font-semibold">{apiUrl || '(Não configurado)'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Sessão:
              </span>
              <span className="font-mono text-slate-800 font-semibold">{sessionName || 'default'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> API Key:
              </span>
              <span className="font-mono text-slate-800">{apiKey ? '••••••••' : '(Nenhuma)'}</span>
            </div>
          </div>

          {/* Teste 1: Checar Status da Sessão */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">1. Diagnóstico da Sessão</h4>
                <p className="text-xs text-gray-500">Verifica se o servidor WAHA está acessível e com a sessão conectada.</p>
              </div>
              <button
                type="button"
                onClick={handleCheckSession}
                disabled={checkingSession || !apiUrl}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {checkingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {checkingSession ? 'Verificando...' : 'Verificar Status'}
              </button>
            </div>

            {sessionResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                  sessionResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {sessionResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{sessionResult.message}</p>
                  {sessionResult.status && (
                    <p className="text-[11px] opacity-80 mt-0.5 font-mono">Status: {sessionResult.status}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Teste 2: Envio de Mensagem de Teste */}
          <form onSubmit={handleSendMessage} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">2. Disparo de Mensagem de Teste</h4>
              <p className="text-xs text-gray-500">Envie uma mensagem real para o seu WhatsApp para validar o recebimento.</p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de WhatsApp com DDD
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="(11) 99999-9999 ou 5511999999999"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto da Mensagem
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingMessage || !apiUrl || !testPhone.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {sendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingMessage ? 'Enviando Mensagem...' : 'Enviar Mensagem de Teste'}
                </button>
              </div>

              {sendResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                    sendResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {sendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{sendResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
