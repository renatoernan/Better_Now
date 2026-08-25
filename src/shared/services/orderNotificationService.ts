/**
 * Serviço de Notificações Automáticas de Pedidos (Multicanal: WhatsApp + E-mail)
 * Gerencia o envio de mensagens para Criação, Confirmação e Cancelamento de pedidos.
 */

import { supabase } from './lib/supabase';
import { sendWahaTextMessage, formatMessageTemplate } from './wahaService';
import { sendSmtpEmail } from './emailService';
import { formatBrazilDate, formatPrice } from '../utils/utils/eventUtils';

export type OrderNotificationType = 'created' | 'confirmed' | 'cancelled';

export interface SendOrderNotificationParams {
  type: OrderNotificationType;
  orderId: string;
  orderData?: any;
}

const DEFAULT_WAHA_TEMPLATES = {
  created: 'Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\n💳 *Link para Pagamento:* {link_pagamento}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!',
  confirmed: '🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}',
  cancelled: 'Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco.',
};

const DEFAULT_EMAIL_TEMPLATES = {
  created: {
    subject: 'Pedido Recebido #{numero_pedido} - {evento}',
    body: 'Olá, {cliente}!\n\nRecebemos o seu pedido #{numero_pedido} para o evento {evento}.\n\nValor Total: {total}\nQuantidade de Ingressos: {quantidade}\n\nPara efetuar ou concluir o pagamento, acesse o link abaixo:\n{link_pagamento}\n\nAssim que o pagamento for confirmado, você receberá seus ingressos com QR Code por aqui!',
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

/**
 * Busca configurações do WAHA salvas no banco de dados
 */
const getWahaSettings = async () => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'waha_api_url',
        'waha_session_name',
        'waha_api_key',
        'waha_enabled',
        'waha_msg_order_created',
        'waha_msg_order_confirmed',
        'waha_msg_order_cancelled',
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

    return {
      apiUrl: settings.waha_api_url || '',
      sessionName: settings.waha_session_name || 'default',
      apiKey: settings.waha_api_key || '',
      enabled: settings.waha_enabled !== false,
      templates: {
        created: settings.waha_msg_order_created || DEFAULT_WAHA_TEMPLATES.created,
        confirmed: settings.waha_msg_order_confirmed || DEFAULT_WAHA_TEMPLATES.confirmed,
        cancelled: settings.waha_msg_order_cancelled || DEFAULT_WAHA_TEMPLATES.cancelled,
      },
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações do WAHA:', err);
    return {
      apiUrl: '',
      sessionName: 'default',
      apiKey: '',
      enabled: true,
      templates: DEFAULT_WAHA_TEMPLATES,
    };
  }
};

/**
 * Busca configurações do Servidor de E-mail salvas no banco de dados
 */
const getEmailSettings = async () => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'email_smtp_user',
        'email_smtp_password',
        'email_incoming_host',
        'email_imap_port',
        'email_pop3_port',
        'email_outgoing_host',
        'email_smtp_port',
        'email_from_name',
        'email_from_address',
        'email_security',
        'email_auth_required',
        'email_enabled',
        'email_msg_order_created_subject',
        'email_msg_order_created_body',
        'email_msg_order_confirmed_subject',
        'email_msg_order_confirmed_body',
        'email_msg_order_cancelled_subject',
        'email_msg_order_cancelled_body',
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

    return {
      smtpUser: settings.email_smtp_user || 'betternow@cesire.com.br',
      smtpPassword: settings.email_smtp_password || '',
      outgoingHost: settings.email_outgoing_host || 'mail.cesire.com.br',
      smtpPort: Number(settings.email_smtp_port) || 465,
      fromName: settings.email_from_name || 'Better Now',
      fromAddress: settings.email_from_address || settings.email_smtp_user || 'betternow@cesire.com.br',
      security: settings.email_security || 'ssl_tls',
      authRequired: settings.email_auth_required !== false,
      enabled: settings.email_enabled !== false,
      templates: {
        created: {
          subject: settings.email_msg_order_created_subject || DEFAULT_EMAIL_TEMPLATES.created.subject,
          body: settings.email_msg_order_created_body || DEFAULT_EMAIL_TEMPLATES.created.body,
        },
        confirmed: {
          subject: settings.email_msg_order_confirmed_subject || DEFAULT_EMAIL_TEMPLATES.confirmed.subject,
          body: settings.email_msg_order_confirmed_body || DEFAULT_EMAIL_TEMPLATES.confirmed.body,
        },
        cancelled: {
          subject: settings.email_msg_order_cancelled_subject || DEFAULT_EMAIL_TEMPLATES.cancelled.subject,
          body: settings.email_msg_order_cancelled_body || DEFAULT_EMAIL_TEMPLATES.cancelled.body,
        },
      },
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações de e-mail:', err);
    return {
      smtpUser: 'betternow@cesire.com.br',
      smtpPassword: '',
      outgoingHost: 'mail.cesire.com.br',
      smtpPort: 465,
      fromName: 'Better Now',
      fromAddress: 'betternow@cesire.com.br',
      security: 'ssl_tls',
      authRequired: true,
      enabled: true,
      templates: DEFAULT_EMAIL_TEMPLATES,
    };
  }
};

/**
 * Gera o template HTML responsivo e elegante para o e-mail do pedido
 */
export const generateEmailHtml = (params: {
  type: OrderNotificationType;
  clientName: string;
  orderNumber: string;
  eventTitle: string;
  total: string;
  quantity: number;
  eventDate: string;
  eventLocation: string;
  accessLink: string;
  paymentLink?: string;
  contentBody: string;
}): string => {
  const { type, clientName, orderNumber, eventTitle, total, quantity, eventDate, eventLocation, accessLink, paymentLink, contentBody } = params;

  let statusBadge = {
    text: 'Aguardando Pagamento',
    bg: '#fef3c7',
    color: '#92400e',
    borderColor: '#fde68a',
  };

  let actionButtonText = '💳 Efetuar Pagamento no Mercado Pago';
  let headerColor = '#0284c7';
  let targetLink = paymentLink || accessLink;

  if (type === 'created') {
    statusBadge = {
      text: 'Aguardando Pagamento',
      bg: '#fef3c7',
      color: '#92400e',
      borderColor: '#fde68a',
    };
    actionButtonText = '💳 Efetuar Pagamento no Mercado Pago';
    headerColor = '#0284c7';
    targetLink = paymentLink || accessLink;
  } else if (type === 'confirmed') {
    statusBadge = {
      text: 'Pagamento Confirmado',
      bg: '#dcfce7',
      color: '#166534',
      borderColor: '#bbf7d0',
    };
    actionButtonText = '🎟️ Visualizar Ingressos e QR Code';
    headerColor = '#059669';
    targetLink = accessLink;
  } else if (type === 'cancelled') {
    statusBadge = {
      text: 'Pedido Cancelado',
      bg: '#fee2e2',
      color: '#991b1b',
      borderColor: '#fecaca',
    };
    actionButtonText = 'Ver Outros Eventos';
    headerColor = '#dc2626';
    targetLink = accessLink;
  }

  const formatTextToHtml = (text: string) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/\*([^\*\n]+)\*/g, '<strong>$1</strong>');
  };

  const formattedParagraphs = contentBody
    .split('\n')
    .filter(p => p.trim() !== '')
    .map(p => `<p style="margin: 0 0 12px 0; color: #334155; line-height: 1.6; font-size: 14px;">${formatTextToHtml(p)}</p>`)
    .join('');

  const isLocalhost = targetLink.includes('localhost') || targetLink.includes('127.0.0.1');
  const safeTargetLink = isLocalhost
    ? targetLink.replace(/^http:\/\/localhost(:\d+)?/, 'https://betternow.cesire.com.br')
    : targetLink;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Cabeçalho -->
          <tr>
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Better Now</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">Gestão de Eventos e Ingressos</p>
            </td>
          </tr>

          <!-- Corpo Principal -->
          <tr>
            <td style="padding: 32px 24px;">
              
              <!-- Badge de Status e Número do Pedido -->
              <table role="presentation" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Pedido #${orderNumber}</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background-color: ${statusBadge.bg}; color: ${statusBadge.color}; border: 1px solid ${statusBadge.borderColor}; border-radius: 9999px;">
                      ${statusBadge.text}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Mensagem formatada -->
              <div style="margin-bottom: 24px;">
                ${formattedParagraphs}
              </div>

              <!-- Card com Resumo do Evento -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 700;">📍 ${eventTitle}</h3>
                    <table role="presentation" width="100%" style="font-size: 13px; color: #475569;">
                      <tr>
                        <td style="padding: 4px 0; width: 120px; font-weight: 600;">📅 Data / Hora:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${eventDate || 'A definir'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">🏢 Local:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${eventLocation}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">🎟️ Ingressos:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${quantity} ${quantity === 1 ? 'ingresso' : 'ingressos'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: 600;">💰 Total:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botão de Ação -->
              <table role="presentation" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${safeTargetLink}" target="_blank" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center;">
                      ${actionButtonText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; text-align: center; font-size: 12px; color: #94a3b8;">
                Caso o botão acima não funcione, copie e cole este link no seu navegador:<br>
                <a href="${safeTargetLink}" style="color: #0284c7; word-break: break-all;">${safeTargetLink}</a>
              </p>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Este é um e-mail automático do sistema Better Now.<br>
                Em caso de dúvidas, responda a este e-mail ou entre em contato com nossa equipe.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Envia notificação de E-mail para um pedido específico
 */
export const sendOrderEmailNotification = async ({
  type,
  orderId,
  orderData,
}: SendOrderNotificationParams): Promise<{ success: boolean; message: string }> => {
  try {
    if (!orderId && !orderData?.id) {
      return { success: false, message: 'ID do pedido não informado.' };
    }

    const currentOrderId = orderId || orderData?.id;

    // 1. Obter dados completos da ordem se não fornecidos
    let order = orderData;
    if (!order || !order.client_email || !order.event_id) {
      const { data: fetchedOrder, error: orderError } = await supabase
        .from('app_event_orders')
        .select('*')
        .eq('id', currentOrderId)
        .maybeSingle();

      if (orderError || !fetchedOrder) {
        console.warn('Ordem não encontrada para envio de E-mail:', currentOrderId);
        return { success: false, message: 'Ordem não encontrada.' };
      }
      order = fetchedOrder;
    }

    const recipientEmail = order.client_email || order.email;
    if (!recipientEmail) {
      return { success: false, message: 'E-mail do cliente não encontrado no pedido.' };
    }

    // 2. Carregar configurações do Servidor de E-mail
    const emailConfig = await getEmailSettings();
    if (!emailConfig.enabled) {
      return { success: false, message: 'Envio automático de e-mails está desativado nas configurações.' };
    }

    if (!emailConfig.outgoingHost || !emailConfig.smtpUser) {
      return { success: false, message: 'Servidor de e-mail não configurado.' };
    }

    // 3. Buscar dados do evento correspondente
    const { data: eventRow } = await supabase
      .from('app_events')
      .select('*')
      .eq('id', order.event_id)
      .maybeSingle();

    let eventTitle = eventRow?.title || eventRow?.name || 'Evento';
    let eventDate = eventRow?.event_date ? formatBrazilDate(eventRow.event_date) : '';
    if (eventRow?.start_time) {
      eventDate = eventDate ? `${eventDate} às ${eventRow.start_time}` : eventRow.start_time;
    }
    let eventLocation = eventRow?.location || 'Local a definir';

    // 4. Montar variáveis dinâmicas
    const origin = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
      ? window.location.origin 
      : 'https://betternow.cesire.com.br';
    const accessLink = `${origin}/eventos/${order.event_id}?payment=success&order_id=${currentOrderId}`;
    const paymentLink = order.payment_url || 
      order.checkout_url || 
      (order.stripe_session_id && order.stripe_session_id.startsWith('http') ? order.stripe_session_id : '') ||
      `${origin}/eventos/${order.event_id}?payment=awaiting&order_id=${currentOrderId}`;
    const orderNumber = currentOrderId.substring(0, 8).toUpperCase();
    const formattedTotal = formatPrice(Number(order.amount_total) || 0);

    const templateData = {
      cliente: order.client_name || 'Cliente',
      numero_pedido: orderNumber,
      evento: eventTitle,
      total: formattedTotal,
      quantidade: order.quantity || 1,
      data_evento: eventDate || 'A definir',
      local_evento: eventLocation,
      link_acesso: accessLink,
      link_pagamento: paymentLink,
    };

    // Templates customizados do evento
    let customSubject = '';
    let customBody = '';

    if (eventRow) {
      if (type === 'created') {
        customSubject = eventRow.email_msg_order_created_subject;
        customBody = eventRow.email_msg_order_created_body;
      } else if (type === 'confirmed') {
        customSubject = eventRow.email_msg_order_confirmed_subject;
        customBody = eventRow.email_msg_order_confirmed_body;
      } else if (type === 'cancelled') {
        customSubject = eventRow.email_msg_order_cancelled_subject;
        customBody = eventRow.email_msg_order_cancelled_body;
      }

      // Fallback em observations JSON
      if ((!customSubject || !customBody) && eventRow.observations) {
        try {
          const parsed = JSON.parse(eventRow.observations);
          if (type === 'created') {
            customSubject = customSubject || parsed.email_msg_order_created_subject;
            customBody = customBody || parsed.email_msg_order_created_body;
          } else if (type === 'confirmed') {
            customSubject = customSubject || parsed.email_msg_order_confirmed_subject;
            customBody = customBody || parsed.email_msg_order_confirmed_body;
          } else if (type === 'cancelled') {
            customSubject = customSubject || parsed.email_msg_order_cancelled_subject;
            customBody = customBody || parsed.email_msg_order_cancelled_body;
          }
        } catch {
          // Ignora
        }
      }
    }

    const fallbackTemplate = emailConfig.templates[type] || DEFAULT_EMAIL_TEMPLATES[type];
    const finalSubject = customSubject || fallbackTemplate.subject;
    const finalBody = customBody || fallbackTemplate.body;

    const formattedSubject = formatMessageTemplate(finalSubject, templateData);
    const formattedBody = formatMessageTemplate(finalBody, templateData);

    const emailHtml = generateEmailHtml({
      type,
      clientName: order.client_name || 'Cliente',
      orderNumber,
      eventTitle,
      total: formattedTotal,
      quantity: order.quantity || 1,
      eventDate,
      eventLocation,
      accessLink,
      paymentLink,
      contentBody: formattedBody,
    });

    // 5. Disparar via Edge Function send-email
    const sendResult = await sendSmtpEmail({
      smtpHost: emailConfig.outgoingHost,
      smtpPort: emailConfig.smtpPort,
      smtpUser: emailConfig.smtpUser,
      smtpPassword: emailConfig.smtpPassword,
      fromName: emailConfig.fromName,
      fromAddress: emailConfig.fromAddress,
      to: recipientEmail,
      subject: formattedSubject,
      text: formattedBody,
      html: emailHtml,
      security: emailConfig.security,
      authRequired: emailConfig.authRequired,
    });

    if (sendResult.success) {
      console.log(`[E-mail] Notificação "${type}" enviada com sucesso para ${recipientEmail} (Pedido: ${currentOrderId})`);
    } else {
      console.warn(`[E-mail] Falha ao enviar notificação "${type}" para ${recipientEmail}:`, sendResult.message);
    }

    return sendResult;
  } catch (err: any) {
    console.error(`[E-mail] Erro inesperado ao enviar notificação "${type}":`, err);
    return { success: false, message: err.message || 'Erro inesperado ao enviar e-mail.' };
  }
};

/**
 * Envia notificação de WhatsApp para um pedido específico de forma assíncrona
 */
export const sendOrderWhatsAppNotification = async ({
  type,
  orderId,
  orderData,
}: SendOrderNotificationParams): Promise<{ success: boolean; message: string }> => {
  try {
    if (!orderId && !orderData?.id) {
      return { success: false, message: 'ID do pedido não informado.' };
    }

    const currentOrderId = orderId || orderData?.id;

    // 1. Obter dados completos da ordem se não fornecidos
    let order = orderData;
    if (!order || !order.client_phone || !order.event_id) {
      const { data: fetchedOrder, error: orderError } = await supabase
        .from('app_event_orders')
        .select('*')
        .eq('id', currentOrderId)
        .maybeSingle();

      if (orderError || !fetchedOrder) {
        console.warn('Ordem não encontrada para envio de WhatsApp:', currentOrderId);
        return { success: false, message: 'Ordem não encontrada.' };
      }
      order = fetchedOrder;
    }

    const recipientPhone = order.client_phone || order.phone;
    if (!recipientPhone) {
      return { success: false, message: 'Telefone do cliente não encontrado no pedido.' };
    }

    // 2. Carregar configurações do WAHA
    const wahaConfig = await getWahaSettings();
    if (!wahaConfig.enabled || !wahaConfig.apiUrl) {
      return { success: false, message: 'Serviço de WhatsApp (WAHA) não está ativo ou configurado.' };
    }

    // 3. Buscar dados do evento correspondente
    const { data: eventRow } = await supabase
      .from('app_events')
      .select('*')
      .eq('id', order.event_id)
      .maybeSingle();

    let eventTitle = eventRow?.title || eventRow?.name || 'Evento';
    let eventDate = eventRow?.event_date ? formatBrazilDate(eventRow.event_date) : '';
    if (eventRow?.start_time) {
      eventDate = eventDate ? `${eventDate} às ${eventRow.start_time}` : eventRow.start_time;
    }
    let eventLocation = eventRow?.location || 'Local a definir';

    // Templates customizados do evento
    let customTemplate = '';
    if (eventRow) {
      if (type === 'created') customTemplate = eventRow.waha_msg_order_created;
      if (type === 'confirmed') customTemplate = eventRow.waha_msg_order_confirmed;
      if (type === 'cancelled') customTemplate = eventRow.waha_msg_order_cancelled;

      // Fallback em observations JSON
      if (!customTemplate && eventRow.observations) {
        try {
          const parsed = JSON.parse(eventRow.observations);
          if (type === 'created') customTemplate = parsed.waha_msg_order_created;
          if (type === 'confirmed') customTemplate = parsed.waha_msg_order_confirmed;
          if (type === 'cancelled') customTemplate = parsed.waha_msg_order_cancelled;
        } catch {
          // Ignora
        }
      }
    }

    // Template final
    const rawTemplate = customTemplate || wahaConfig.templates[type] || DEFAULT_WAHA_TEMPLATES[type];

    // 4. Montar variáveis dinâmicas
    const origin = (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
      ? window.location.origin 
      : 'https://betternow.cesire.com.br';
    const accessLink = `${origin}/eventos/${order.event_id}?payment=success&order_id=${currentOrderId}`;
    const paymentLink = order.payment_url || 
      order.checkout_url || 
      (order.stripe_session_id && order.stripe_session_id.startsWith('http') ? order.stripe_session_id : '') ||
      `${origin}/eventos/${order.event_id}?payment=awaiting&order_id=${currentOrderId}`;

    const formattedMessage = formatMessageTemplate(rawTemplate, {
      cliente: order.client_name || 'Cliente',
      numero_pedido: currentOrderId.substring(0, 8).toUpperCase(),
      evento: eventTitle,
      total: formatPrice(Number(order.amount_total) || 0),
      quantidade: order.quantity || 1,
      data_evento: eventDate || 'A definir',
      local_evento: eventLocation,
      link_acesso: accessLink,
      link_pagamento: paymentLink,
    });

    // 5. Disparar via WAHA
    const sendResult = await sendWahaTextMessage({
      apiUrl: wahaConfig.apiUrl,
      sessionName: wahaConfig.sessionName,
      apiKey: wahaConfig.apiKey,
      phone: recipientPhone,
      text: formattedMessage,
    });

    if (sendResult.success) {
      console.log(`[WhatsApp] Notificação "${type}" enviada com sucesso para ${recipientPhone} (Pedido: ${currentOrderId})`);
    } else {
      console.warn(`[WhatsApp] Falha ao enviar notificação "${type}" para ${recipientPhone}:`, sendResult.message);
    }

    return sendResult;
  } catch (err: any) {
    console.error(`[WhatsApp] Erro inesperado ao enviar notificação "${type}":`, err);
    return { success: false, message: err.message || 'Erro inesperado ao enviar notificação.' };
  }
};

// Cache em memória para deduplicação de disparos (janela de 10s para o mesmo tipo e pedido)
const notificationCooldownMap = new Map<string, number>();

const isDuplicateNotification = (type: string, orderId?: string | null): boolean => {
  if (!orderId) return false;
  const key = `${type}:${orderId}`;
  const now = Date.now();
  const lastTime = notificationCooldownMap.get(key);
  
  if (lastTime && now - lastTime < 10000) {
    return true;
  }
  
  notificationCooldownMap.set(key, now);
  // Limpeza automática após 30 segundos
  setTimeout(() => {
    notificationCooldownMap.delete(key);
  }, 30000);
  
  return false;
};

/**
 * Dispara notificações em todos os canais configurados (WhatsApp + E-mail) em paralelo com proteção anti-duplicação
 */
export const sendOrderNotifications = async (
  params: SendOrderNotificationParams
): Promise<{ whatsapp: { success: boolean; message: string }; email: { success: boolean; message: string } }> => {
  const currentOrderId = params.orderId || params.orderData?.id;
  if (currentOrderId && isDuplicateNotification(params.type, currentOrderId)) {
    console.warn(`[Notificações] Disparo duplicado prevenido para o pedido ${currentOrderId} (tipo: ${params.type})`);
    return {
      whatsapp: { success: true, message: 'Notificação já enviada recentemente (duplicação evitada).' },
      email: { success: true, message: 'Notificação já enviada recentemente (duplicação evitada).' },
    };
  }

  const [whatsappResult, emailResult] = await Promise.allSettled([
    sendOrderWhatsAppNotification(params),
    sendOrderEmailNotification(params),
  ]);

  return {
    whatsapp:
      whatsappResult.status === 'fulfilled'
        ? whatsappResult.value
        : { success: false, message: 'Falha na execução da notificação de WhatsApp.' },
    email:
      emailResult.status === 'fulfilled'
        ? emailResult.value
        : { success: false, message: 'Falha na execução da notificação de E-mail.' },
  };
};

/**
 * Alias de conveniência para disparo unificado
 */
export const sendOrderNotification = sendOrderNotifications;
