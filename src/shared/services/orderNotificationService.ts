/**
 * Serviço de Notificações Automáticas de Pedidos via WhatsApp (WAHA)
 * Gerencia o envio de mensagens para Criação, Confirmação e Cancelamento de pedidos.
 */

import { supabase } from './lib/supabase';
import { sendWahaTextMessage, formatMessageTemplate } from './wahaService';
import { formatBrazilDate, formatPrice } from '../utils/utils/eventUtils';

export type OrderNotificationType = 'created' | 'confirmed' | 'cancelled';

export interface SendOrderNotificationParams {
  type: OrderNotificationType;
  orderId: string;
  orderData?: any;
}

const DEFAULT_TEMPLATES = {
  created: 'Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!',
  confirmed: '🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}',
  cancelled: 'Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco.',
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
        created: settings.waha_msg_order_created || DEFAULT_TEMPLATES.created,
        confirmed: settings.waha_msg_order_confirmed || DEFAULT_TEMPLATES.confirmed,
        cancelled: settings.waha_msg_order_cancelled || DEFAULT_TEMPLATES.cancelled,
      },
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações do WAHA:', err);
    return {
      apiUrl: '',
      sessionName: 'default',
      apiKey: '',
      enabled: true,
      templates: DEFAULT_TEMPLATES,
    };
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
    const rawTemplate = customTemplate || wahaConfig.templates[type] || DEFAULT_TEMPLATES[type];

    // 4. Montar variáveis dinâmicas
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const accessLink = `${origin}/eventos/${order.event_id}?payment=success&order_id=${currentOrderId}`;

    const formattedMessage = formatMessageTemplate(rawTemplate, {
      cliente: order.client_name || 'Cliente',
      numero_pedido: currentOrderId.substring(0, 8).toUpperCase(),
      evento: eventTitle,
      total: formatPrice(Number(order.amount_total) || 0),
      quantidade: order.quantity || 1,
      data_evento: eventDate || 'A definir',
      local_evento: eventLocation,
      link_acesso: accessLink,
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
