/**
 * Serviço de Envio de E-mails via Servidor SMTP (Supabase Edge Function)
 */

import { supabase } from './lib/supabase';

export interface SendEmailParams {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  fromName?: string;
  fromAddress?: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  security?: string;
  authRequired?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

/**
 * Dispara envio real de e-mail via SMTP utilizando a Edge Function do Supabase
 */
export const sendSmtpEmail = async (params: SendEmailParams): Promise<SendEmailResult> => {
  try {
    const payload = {
      smtp_host: params.smtpHost,
      smtp_port: params.smtpPort,
      smtp_user: params.smtpUser,
      smtp_password: params.smtpPassword,
      from_name: params.fromName,
      from_address: params.fromAddress,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      security: params.security || 'ssl_tls',
      auth_required: params.authRequired ?? true,
    };

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload,
    });

    if (error) {
      console.error('Erro ao invocar Edge Function send-email:', error);
      return {
        success: false,
        message: error.message || 'Falha ao conectar com a Edge Function de envio de e-mail.',
        error: error.message,
      };
    }

    if (data && !data.success) {
      return {
        success: false,
        message: data.error || 'O servidor SMTP recusou a conexão ou autenticação.',
        error: data.error,
      };
    }

    return {
      success: true,
      message: data?.message || `E-mail enviado com sucesso para ${params.to}!`,
      messageId: data?.messageId,
    };
  } catch (err: any) {
    console.error('Erro inesperado em sendSmtpEmail:', err);
    return {
      success: false,
      message: err.message || 'Erro inesperado ao tentar disparar o e-mail.',
      error: err.message,
    };
  }
};
