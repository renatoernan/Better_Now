/**
 * Serviço de Emissão de Ingressos Cortesia / Gratuitos (Valor R$ 0,00)
 * Processa a criação de ordens gratuitas, geração de ingressos/QR Codes e disparo de WhatsApp.
 */

import { supabase } from './lib/supabase';
import { getClientIpAddress } from '../utils/utils/ipUtils';
import { sendOrderWhatsAppNotification } from './orderNotificationService';
import { applyCouponOnOrder } from './couponService';

export interface CreateComplimentaryOrderParams {
  event_id: string;
  batch_index: number;
  batch_name?: string;
  unit_price?: number;
  quantity: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_document?: string;
  client_id?: string;
  coupon_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  notes?: string;
  attendees?: Array<{
    nome: string;
    whatsapp?: string;
    email?: string;
    cpf?: string;
    documento?: string;
  }>;
  send_whatsapp?: boolean;
}

export interface ComplimentaryOrderResponse {
  success: boolean;
  orderId?: string;
  order?: any;
  error?: string;
}

export const createComplimentaryOrder = async (
  params: CreateComplimentaryOrderParams
): Promise<ComplimentaryOrderResponse> => {
  try {
    const clientIp = await getClientIpAddress();
    const cleanDoc = params.client_document?.replace(/\D/g, '') || null;
    const originalSubtotal = (params.unit_price || 0) * params.quantity;
    const discount = params.discount_amount !== undefined ? params.discount_amount : originalSubtotal;

    // 1. Validar estoque restante do lote no evento
    const { data: eventRow } = await supabase
      .from('app_events')
      .select('price_batches, observations')
      .eq('id', params.event_id)
      .single();

    if (eventRow) {
      let batches: any[] = Array.isArray(eventRow.price_batches) ? eventRow.price_batches : [];
      if (batches.length === 0 && eventRow.observations) {
        try {
          const parsed = JSON.parse(eventRow.observations);
          if (Array.isArray(parsed.price_batches)) batches = parsed.price_batches;
        } catch {
          // Ignora erro de parse
        }
      }

      const targetBatch = batches[params.batch_index || 0];
      if (targetBatch && targetBatch.quantity && targetBatch.quantity > 0) {
        const { data: approvedOrders } = await supabase
          .from('app_event_orders')
          .select('quantity')
          .eq('event_id', params.event_id)
          .eq('batch_index', params.batch_index || 0)
          .in('status', ['approved', 'paid', 'completed']);

        const totalSold = (approvedOrders || []).reduce(
          (acc: number, curr: any) => acc + (Number(curr.quantity) || 1),
          0
        );
        const remaining = Math.max(0, targetBatch.quantity - totalSold);

        if (remaining <= 0) {
          return { success: false, error: `O lote "${targetBatch.name || 'selecionado'}" está esgotado.` };
        }

        if (params.quantity > remaining) {
          return {
            success: false,
            error: `Restam apenas ${remaining} ingressos disponíveis para o lote "${targetBatch.name}".`,
          };
        }
      }
    }

    // 2. Inserir a ordem com status 'paid' (R$ 0,00 / Cortesia)
    const { data: newOrder, error: orderErr } = await supabase
      .from('app_event_orders')
      .insert({
        event_id: params.event_id,
        client_id: params.client_id || null,
        client_name: params.client_name || 'Convidado VIP',
        client_email: params.client_email || '',
        client_phone: params.client_phone || '',
        client_document: cleanDoc,
        ip_address: clientIp,
        amount_total: 0,
        currency: 'brl',
        quantity: params.quantity,
        batch_index: params.batch_index || 0,
        batch_name: params.batch_name || 'Cortesia',
        status: 'paid',
        payment_method: 'cortesia',
        convenience_fee: 0,
        convenience_fee_percentage: 0,
        coupon_id: params.coupon_id || null,
        coupon_code: params.coupon_code || null,
        discount_amount: discount,
        cancellation_reason: params.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !newOrder) {
      console.error('Erro ao registrar ordem cortesia:', orderErr);
      return { success: false, error: orderErr?.message || 'Erro ao registrar inscrição cortesia.' };
    }

    const orderId = newOrder.id;

    // 3. Registrar utilização definitiva do cupom caso tenha sido utilizado
    if (params.coupon_code || params.coupon_id) {
      try {
        await applyCouponOnOrder({
          couponId: params.coupon_id || '',
          code: params.coupon_code || '',
          eventId: params.event_id,
          orderId: orderId,
          batchIndex: params.batch_index || 0,
          originalAmount: originalSubtotal,
          clientName: params.client_name,
          clientDocument: cleanDoc || undefined,
          clientPhone: params.client_phone,
          clientEmail: params.client_email,
        });
      } catch (couponErr) {
        console.warn('Aviso ao registrar uso do cupom cortesia:', couponErr);
      }
    }

    // 4. Emitir ingressos e QR Codes individuais na tabela app_event_tickets
    const qty = params.quantity || 1;
    const ticketsToInsert = [];
    const attendees = params.attendees || [];

    for (let i = 0; i < qty; i++) {
      const ticketNumber = `${orderId.substring(0, 6).toUpperCase()}-${i + 1}`;
      const qrHash = `VIP-${orderId.substring(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

      // Tentar associar pessoa/participante se fornecido
      const att = attendees[i] || {
        nome: params.client_name,
        whatsapp: params.client_phone,
        email: params.client_email,
        documento: cleanDoc,
      };

      ticketsToInsert.push({
        order_id: orderId,
        event_id: params.event_id,
        client_id: params.client_id || null,
        ticket_number: ticketNumber,
        qr_code_hash: qrHash,
        status: 'valid',
        created_at: new Date().toISOString(),
      });
    }

    const { error: ticketErr } = await supabase.from('app_event_tickets').insert(ticketsToInsert);
    if (ticketErr) {
      console.warn('Aviso ao emitir ingressos cortesia:', ticketErr);
    }

    // 5. Disparar notificação de confirmação no WhatsApp
    if (params.send_whatsapp !== false && params.client_phone) {
      sendOrderWhatsAppNotification({
        type: 'confirmed',
        orderId: orderId,
        orderData: newOrder,
      }).catch((wahaErr) => {
        console.warn('Aviso no envio de WhatsApp da cortesia:', wahaErr);
      });
    }

    return {
      success: true,
      orderId: orderId,
      order: newOrder,
    };
  } catch (err: any) {
    console.error('Erro ao emitir cortesia:', err);
    return { success: false, error: err.message || 'Erro inesperado ao emitir cortesia.' };
  }
};
