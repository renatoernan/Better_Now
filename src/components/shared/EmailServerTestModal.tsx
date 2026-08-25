import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, XCircle, Loader2, Mail, Server, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import { sendSmtpEmail } from '../../shared/services/emailService';

interface EmailServerTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  smtpUser: string;
  smtpPassword?: string;
  incomingHost: string;
  imapPort: number;
  pop3Port: number;
  outgoingHost: string;
  smtpPort: number;
  fromName?: string;
  fromAddress?: string;
  security?: string;
  authRequired?: boolean;
}

export const EmailServerTestModal: React.FC<EmailServerTestModalProps> = ({
  isOpen,
  onClose,
  smtpUser,
  smtpPassword,
  incomingHost,
  imapPort,
  pop3Port,
  outgoingHost,
  smtpPort,
  fromName,
  fromAddress,
  security = 'ssl_tls',
  authRequired = true,
}) => {
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    success: boolean;
    status: 'ONLINE' | 'FAILED' | 'CONFIG_WARNING';
    message: string;
    details?: string[];
  } | null>(null);

  const [testRecipient, setTestRecipient] = useState(smtpUser || '');
  const [testSubject, setTestSubject] = useState('Teste de Conexão - Servidor de E-mail Better Now');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setCheckingConfig(true);
    setDiagnosticResult(null);

    // Validação estrutural dos parâmetros de conexão
    await new Promise((resolve) => setTimeout(resolve, 500));

    const errors: string[] = [];

    if (!outgoingHost || outgoingHost.trim() === '') {
      errors.push('Servidor de saída (SMTP Host) não foi informado.');
    }
    if (!smtpPort || smtpPort <= 0) {
      errors.push('Porta SMTP inválida.');
    }
    if (!smtpUser || smtpUser.trim() === '') {
      errors.push('Nome de usuário / e-mail não informado.');
    }
    if (authRequired && (!smtpPassword || smtpPassword.trim() === '')) {
      errors.push('A autenticação está ativa, mas nenhuma senha foi informada.');
    }
    if (!incomingHost || incomingHost.trim() === '') {
      errors.push('Servidor de entrada (IMAP/POP3 Host) não foi informado.');
    }

    if (errors.length > 0) {
      setDiagnosticResult({
        success: false,
        status: 'CONFIG_WARNING',
        message: 'Foram identificadas inconsistências nas configurações:',
        details: errors,
      });
    } else {
      setDiagnosticResult({
        success: true,
        status: 'ONLINE',
        message: 'Parâmetros de configuração validados com sucesso!',
        details: [
          `SMTP: ${outgoingHost}:${smtpPort} (Segurança: ${security.toUpperCase()})`,
          `IMAP: ${incomingHost}:${imapPort} | POP3: ${incomingHost}:${pop3Port}`,
          `Autenticação: ${authRequired ? 'Habilitada (Usuário e Senha)' : 'Desabilitada'}`,
        ],
      });
    }

    setCheckingConfig(false);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      setSendResult({
        success: false,
        message: 'Por favor, informe o e-mail de destino para o teste.',
      });
      return;
    }

    if (!smtpPassword && authRequired) {
      setSendResult({
        success: false,
        message: 'Por favor, informe a senha da conta de e-mail antes de disparar o teste.',
      });
      return;
    }

    if (!outgoingHost || !smtpPort || !smtpUser) {
      setSendResult({
        success: false,
        message: 'Por favor, preencha o servidor de saída (SMTP), a porta e o usuário.',
      });
      return;
    }

    setSendingTest(true);
    setSendResult(null);

    try {
      const result = await sendSmtpEmail({
        smtpHost: outgoingHost,
        smtpPort: smtpPort,
        smtpUser: smtpUser,
        smtpPassword: smtpPassword,
        fromName: fromName,
        fromAddress: fromAddress,
        to: testRecipient.trim(),
        subject: testSubject.trim(),
        security: security,
        authRequired: authRequired,
      });

      if (result.success) {
        setSendResult({
          success: true,
          message: result.message || `E-mail enviado com sucesso para ${testRecipient}!`,
          details: result.messageId ? `ID da Mensagem: ${result.messageId}` : undefined,
        });
      } else {
        setSendResult({
          success: false,
          message: result.message || 'Erro ao enviar e-mail pelo servidor SMTP.',
          details: result.error,
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Erro inesperado ao conectar ao serviço de e-mail.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Teste do Servidor de E-mail</h3>
              <p className="text-xs text-blue-100">Valide os parâmetros SSL/TLS e teste o envio de mensagens</p>
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
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-3.5 h-3.5 text-blue-600" /> Servidor de Saída (SMTP):
              </span>
              <span className="font-mono text-slate-800 font-semibold">
                {outgoingHost ? `${outgoingHost}:${smtpPort}` : '(Não configurado)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-3.5 h-3.5 text-indigo-600" /> Servidor de Entrada:
              </span>
              <span className="font-mono text-slate-800 font-semibold">
                {incomingHost ? `${incomingHost} (IMAP: ${imapPort} | POP3: ${pop3Port})` : '(Não configurado)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> Usuário:
              </span>
              <span className="font-mono text-slate-800 font-semibold">{smtpUser || '(Não informado)'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Senha:
              </span>
              <span className="font-mono text-slate-800">
                {smtpPassword ? '••••••••••••' : '(Nenhuma senha informada)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Autenticação SSL/TLS:
              </span>
              <span className="font-mono text-slate-800 font-semibold">
                {authRequired ? 'Ativa (SSL/TLS Recomendado)' : 'Desativada'}
              </span>
            </div>
          </div>

          {/* Diagnóstico das Configurações */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">1. Diagnóstico de Parâmetros</h4>
                <p className="text-xs text-gray-500">Analisa a consistência das portas, hosts e credenciais.</p>
              </div>
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={checkingConfig}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300 font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {checkingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {checkingConfig ? 'Analisando...' : 'Diagnosticar'}
              </button>
            </div>

            {diagnosticResult && (
              <div
                className={`p-3.5 rounded-lg text-xs space-y-1.5 ${
                  diagnosticResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {diagnosticResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{diagnosticResult.message}</span>
                </div>
                {diagnosticResult.details && (
                  <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90 pl-1 font-mono">
                    {diagnosticResult.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Teste 2: Disparo de E-mail de Teste */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-white">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">2. Envio de E-mail de Teste</h4>
              <p className="text-xs text-gray-500">Envie uma mensagem de teste para verificar a entrega.</p>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E-mail de Destino
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="exemplo@dominio.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assunto
                </label>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {sendResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex flex-col gap-1.5 ${
                    sendResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {sendResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-semibold">{sendResult.message}</span>
                  </div>
                  {sendResult.details && (
                    <div className="pl-6 font-mono text-[11px] opacity-80 break-all">
                      {sendResult.details}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={sendingTest || !testRecipient}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingTest ? 'Enviando...' : 'Enviar E-mail de Teste'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
