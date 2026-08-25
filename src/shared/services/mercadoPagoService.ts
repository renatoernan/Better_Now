import { supabase } from './lib/supabase';
import { getClientIpAddress } from '../utils/utils/ipUtils';
import { sendOrderNotifications } from './orderNotificationService';

export interface CreateMercadoPagoCheckoutParams {
  event_id: string;
  batch_index: number;
  batch_name?: string;
  unit_price: number;
  quantity: number;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  payment_method?: 'credit_card' | 'pix' | 'boleto' | string;
  installments?: number;
  max_installments?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  client_id?: string;
  ip_address?: string;
  existing_order_id?: string;
  coupon_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

export interface MercadoPagoCheckoutResponse {
  checkoutUrl?: string;
  preferenceId?: string;
  orderId?: string;
  error?: string;
}

export interface CreatePixPaymentParams {
  event_id: string;
  batch_index: number;
  batch_name?: string;
  unit_price: number;
  quantity: number;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  client_id?: string;
  existing_order_id?: string;
  coupon_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  attendees?: any[];
}

export interface PixPaymentResponse {
  success: boolean;
  orderId: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expirationDate?: string;
  error?: string;
}

export interface ProcessCardPaymentParams {
  event_id: string;
  batch_index: number;
  batch_name?: string;
  unit_price: number;
  quantity: number;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  client_id?: string;
  existing_order_id?: string;
  coupon_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  cardToken: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: number;
  attendees?: any[];
}

export interface CardPaymentResponse {
  success: boolean;
  status: 'approved' | 'in_process' | 'rejected' | 'pending';
  statusDetail?: string;
  orderId?: string;
  paymentId?: string;
  message?: string;
  error?: string;
}

export const loadMercadoPagoSDK = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).MercadoPago) {
      resolve((window as any).MercadoPago);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      resolve((window as any).MercadoPago);
    };
    script.onerror = () => {
      reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));
    };
    document.body.appendChild(script);
  });
};

export const getCardBrand = (cardNumber: string): string => {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'master';
  if (/^(636368|438935|504175|451416|6011|5067|5090|6504|6505|6507|6509|6516|6550)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  if (/^3[47]/.test(clean)) return 'amex';
  return '';
};

export const completeMercadoPagoOrder = async (
  orderId: string,
  paymentId: string
): Promise<boolean> => {
  try {
    const cleanOrderId = orderId.trim();

    const { data: currentOrder, error: orderErr } = await supabase
      .from('app_event_orders')
      .update({
        status: 'paid',
        stripe_session_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanOrderId)
      .select()
      .single();

    if (orderErr || !currentOrder) {
      console.error('Erro ao atualizar status do pedido para paid:', orderErr);
      return false;
    }

    const { data: existingTickets } = await supabase
      .from('app_event_tickets')
      .select('id')
      .eq('order_id', cleanOrderId);

    if (!existingTickets || existingTickets.length === 0) {
      const qty = currentOrder.quantity || 1;
      const ticketsToInsert = [];

      let attendees: any[] = [];
      if (currentOrder.cancellation_reason) {
        try {
          const parsed = JSON.parse(currentOrder.cancellation_reason);
          if (Array.isArray(parsed)) attendees = parsed;
        } catch {}
      }

      for (let i = 0; i < qty; i++) {
        const qrHash = `MP-${paymentId.slice(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;
        const att = attendees[i] || null;
        const attendeeClientId = att?.person_id || att?.client_id || (i === 0 ? currentOrder.client_id : null);

        ticketsToInsert.push({
          order_id: cleanOrderId,
          event_id: currentOrder.event_id,
          client_id: attendeeClientId || null,
          ticket_number: i + 1,
          qr_code_hash: qrHash,
          status: 'valid',
          created_at: new Date().toISOString(),
        });
      }

      await supabase.from('app_event_tickets').insert(ticketsToInsert);
    }

    if (currentOrder.coupon_code || currentOrder.coupon_id) {
      try {
        const { applyCouponOnOrder } = await import('./couponService');
        await applyCouponOnOrder({
          couponId: currentOrder.coupon_id || '',
          code: currentOrder.coupon_code || '',
          eventId: currentOrder.event_id,
          orderId: cleanOrderId,
          batchIndex: currentOrder.batch_index || 0,
          originalAmount: Number(currentOrder.amount_total || 0) + Number(currentOrder.discount_amount || 0),
          clientName: currentOrder.client_name || undefined,
          clientDocument: currentOrder.client_document || undefined,
          clientPhone: currentOrder.client_phone || undefined,
          clientEmail: currentOrder.client_email || undefined,
        });
      } catch (couponErr) {
        console.warn('Aviso ao registrar cupom de desconto:', couponErr);
      }
    }

    sendOrderNotifications({
      type: 'confirmed',
      orderId: cleanOrderId,
      orderData: { ...currentOrder, status: 'paid' },
    }).catch(() => {});

    return true;
  } catch (err) {
    console.error('Erro ao completar pedido do Mercado Pago:', err);
    return false;
  }
};

async function callMercadoPagoPaymentsApi(paymentBody: any, idempotencyKey?: string) {
  // 1. Tenta chamar o endpoint serverless /api/mercadopago-payment (evita CORS)
  try {
    const res = await fetch('/api/mercadopago-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentBody,
        idempotencyKey,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    if (errData && (errData.id || errData.message || errData.cause || errData.status)) {
      return errData;
    }
  } catch (backendErr) {
    console.warn('Tentativa via /api/mercadopago-payment falhou, tentando fallback direto:', backendErr);
  }

  // 2. Fallback direto se o endpoint serverless não estiver disponível
  const accessToken =
    (import.meta as any).env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
    (import.meta as any).env.MERCADOPAGO_ACCESS_TOKEN ||
    'APP_USR-1264360358076296-081717-ffb3d55789b1665111c7d2c6e33a856f-68352240';

  const directRes = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey || `mp-${Date.now()}`,
    },
    body: JSON.stringify(paymentBody),
  });

  return await directRes.json();
}

export const createMercadoPagoPixPayment = async (
  params: CreatePixPaymentParams
): Promise<PixPaymentResponse> => {
  try {
    const clientIp = await getClientIpAddress();
    const cleanDoc = params.client_document?.replace(/\D/g, '');

    const rawSubtotal = params.unit_price * params.quantity;
    const discount = params.discount_amount || 0;
    const subtotal = Math.max(0, rawSubtotal - discount);
    const fee = params.convenience_fee || (subtotal * ((params.convenience_fee_percentage || 0) / 100));
    const totalAmount = Number((subtotal + fee).toFixed(2));

    let orderId = params.existing_order_id;
    let order: any = null;

    if (orderId) {
      const { data: updatedOrder } = await supabase
        .from('app_event_orders')
        .update({
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          amount_total: totalAmount,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          payment_method: 'pix',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
          cancellation_reason: params.attendees ? JSON.stringify(params.attendees) : null,
          ip_address: clientIp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();
      order = updatedOrder;
    }

    if (!order) {
      const { data: newOrder, error: orderErr } = await supabase
        .from('app_event_orders')
        .insert({
          event_id: params.event_id,
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          ip_address: clientIp,
          amount_total: totalAmount,
          currency: 'brl',
          quantity: params.quantity,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          status: 'pending',
          payment_method: 'pix',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
          cancellation_reason: params.attendees ? JSON.stringify(params.attendees) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderErr) {
        console.error('Erro ao registrar ordem para Pix:', orderErr);
      }
      order = newOrder;
      orderId = newOrder?.id;
    }

    const nameParts = (params.client_name || 'Comprador').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Comprador';
    const lastName = nameParts.slice(1).join(' ') || 'Cliente';

    const mpData = await callMercadoPagoPaymentsApi(
      {
        transaction_amount: totalAmount,
        description: `Ingresso - ${params.batch_name || 'Evento'} (${params.quantity}x)`,
        payment_method_id: 'pix',
        payer: {
          email: params.client_email?.trim() || 'comprador@betternow.com.br',
          first_name: firstName,
          last_name: lastName,
          identification: cleanDoc && cleanDoc.length === 11 ? {
            type: 'CPF',
            number: cleanDoc,
          } : undefined,
        },
        external_reference: orderId,
        metadata: {
          order_id: orderId,
          event_id: params.event_id,
          client_id: params.client_id,
          quantity: params.quantity,
        },
      },
      `pix-${orderId}-${Date.now()}`
    );

    if (!mpData || !mpData.id) {
      console.error('Erro retornado pela API do Mercado Pago (Pix):', mpData);
      const errMsg = mpData?.message || mpData?.cause?.[0]?.description || 'Erro ao gerar Pix no Mercado Pago.';
      return {
        success: false,
        orderId: orderId || '',
        paymentId: '',
        qrCode: '',
        error: errMsg,
      };
    }

    const paymentId = String(mpData.id);
    const transactionData = mpData.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code || '';
    const qrCodeBase64 = transactionData?.qr_code_base64 || '';
    const ticketUrl = transactionData?.ticket_url || '';
    const expirationDate = mpData.date_of_expiration || '';

    if (orderId) {
      await supabase
        .from('app_event_orders')
        .update({
          stripe_session_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      sendOrderNotifications({
        type: 'created',
        orderId: orderId,
        orderData: { ...order, stripe_session_id: paymentId, pix_code: qrCode },
      }).catch(() => {});
    }

    return {
      success: true,
      orderId: orderId || '',
      paymentId,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expirationDate,
    };
  } catch (err: any) {
    console.error('Exceção ao criar Pix transparente:', err);
    return {
      success: false,
      orderId: '',
      paymentId: '',
      qrCode: '',
      error: err.message || 'Erro inesperado ao gerar pagamento Pix.',
    };
  }
};

export const processMercadoPagoCardPayment = async (
  params: ProcessCardPaymentParams
): Promise<CardPaymentResponse> => {
  try {
    const clientIp = await getClientIpAddress();
    const cleanDoc = params.client_document?.replace(/\D/g, '');

    const rawSubtotal = params.unit_price * params.quantity;
    const discount = params.discount_amount || 0;
    const subtotal = Math.max(0, rawSubtotal - discount);
    const fee = params.convenience_fee || (subtotal * ((params.convenience_fee_percentage || 0) / 100));
    const totalAmount = Number((subtotal + fee).toFixed(2));

    let orderId = params.existing_order_id;
    let order: any = null;

    if (orderId) {
      const { data: updatedOrder } = await supabase
        .from('app_event_orders')
        .update({
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          amount_total: totalAmount,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          payment_method: 'credit_card',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
          cancellation_reason: params.attendees ? JSON.stringify(params.attendees) : null,
          ip_address: clientIp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();
      order = updatedOrder;
    }

    if (!order) {
      const { data: newOrder, error: orderErr } = await supabase
        .from('app_event_orders')
        .insert({
          event_id: params.event_id,
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          ip_address: clientIp,
          amount_total: totalAmount,
          currency: 'brl',
          quantity: params.quantity,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          status: 'pending',
          payment_method: 'credit_card',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
          cancellation_reason: params.attendees ? JSON.stringify(params.attendees) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderErr) {
        console.error('Erro ao registrar ordem para Cartão:', orderErr);
      }
      order = newOrder;
      orderId = newOrder?.id;
    }

    const nameParts = (params.client_name || 'Comprador').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Comprador';
    const lastName = nameParts.slice(1).join(' ') || 'Cliente';

    const mpData = await callMercadoPagoPaymentsApi(
      {
        token: params.cardToken,
        transaction_amount: totalAmount,
        installments: Number(params.installments) || 1,
        payment_method_id: params.paymentMethodId,
        issuer_id: params.issuerId || undefined,
        description: `Ingresso - ${params.batch_name || 'Evento'} (${params.quantity}x)`,
        payer: {
          email: params.client_email?.trim() || 'comprador@betternow.com.br',
          first_name: firstName,
          last_name: lastName,
          identification: cleanDoc ? {
            type: 'CPF',
            number: cleanDoc,
          } : undefined,
        },
        external_reference: orderId,
        metadata: {
          order_id: orderId,
          event_id: params.event_id,
          client_id: params.client_id,
          quantity: params.quantity,
        },
      },
      `card-${orderId}-${Date.now()}`
    );

    if (!mpData || !mpData.id) {
      console.error('Erro na resposta do pagamento de cartão:', mpData);
      const errMsg = mpData?.message || mpData?.cause?.[0]?.description || 'Erro ao processar cartão.';
      return {
        success: false,
        status: 'rejected',
        orderId: orderId || '',
        paymentId: '',
        error: errMsg,
      };
    }

    const paymentId = String(mpData.id);
    const status = mpData.status as 'approved' | 'in_process' | 'rejected' | 'pending';
    const statusDetail = mpData.status_detail;

    if (orderId) {
      await supabase
        .from('app_event_orders')
        .update({
          stripe_session_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    if (status === 'approved') {
      await completeMercadoPagoOrder(orderId || '', paymentId);
      return {
        success: true,
        status: 'approved',
        statusDetail,
        orderId: orderId || '',
        paymentId,
        message: 'Pagamento aprovado com sucesso! Seus ingressos foram emitidos! 🎉',
      };
    }

    if (status === 'in_process') {
      return {
        success: true,
        status: 'in_process',
        statusDetail,
        orderId: orderId || '',
        paymentId,
        message: 'Seu pagamento está sendo analisado pela operadora.',
      };
    }

    const rejectionMessages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade incorreta.',
      cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
      cc_rejected_bad_filled_other: 'Dados do cartão incorretos. Verifique e tente novamente.',
      cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente no cartão.',
      cc_rejected_call_for_authorize: 'Pagamento não autorizado pelo seu banco. Ligue para a operadora ou tente outro cartão.',
      cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com seu banco para ativá-lo.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado. Você já realizou uma compra deste valor recentemente.',
      cc_rejected_high_risk: 'Pagamento recusado pela análise de risco. Tente com Pix ou outro cartão.',
      cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente novamente mais tarde ou use outro método.',
    };

    const friendlyError = rejectionMessages[statusDetail] || 'Pagamento recusado pelo banco emissor. Verifique os dados ou tente outro cartão.';

    return {
      success: false,
      status: 'rejected',
      statusDetail,
      orderId: orderId || '',
      paymentId,
      message: friendlyError,
      error: friendlyError,
    };
  } catch (err: any) {
    console.error('Exceção ao processar cartão transparente:', err);
    return {
      success: false,
      status: 'rejected',
      error: err.message || 'Erro inesperado ao processar pagamento com cartão.',
    };
  }
};

export const findPendingOrderForClient = async (params: {
  event_id: string;
  client_document?: string;
  client_phone?: string;
  ip_address?: string;
}): Promise<any | null> => {
  try {
    if (!params.event_id) return null;

    const cleanDoc = params.client_document?.replace(/\D/g, '');
    const cleanPhone = params.client_phone?.replace(/\D/g, '');

    // Apenas pedidos gerados nos últimos 20 minutos (janela ativa de expiração)
    const recentThreshold = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    let query = supabase
      .from('app_event_orders')
      .select('*')
      .eq('event_id', params.event_id)
      .eq('status', 'pending')
      .gte('created_at', recentThreshold)
      .order('created_at', { ascending: false })
      .limit(1);

    if (cleanDoc && cleanPhone) {
      query = query.or(`client_document.eq.${cleanDoc},client_phone.ilike.%${cleanPhone}%`);
    } else if (cleanDoc) {
      query = query.eq('client_document', cleanDoc);
    } else if (cleanPhone) {
      query = query.ilike('client_phone', `%${cleanPhone}%`);
    } else if (params.ip_address && params.ip_address !== '127.0.0.1') {
      query = query.eq('ip_address', params.ip_address);
    } else {
      return null;
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    const order = data[0];
    // Garantia estrita: se a ordem não for 'pending' (ex: 'paid', 'approved', etc.), ignora completamente
    if (order.status !== 'pending' || ['paid', 'approved', 'completed', 'cancelled', 'canceled'].includes(order.status)) {
      return null;
    }

    return order;
  } catch (err) {
    console.warn('Erro ao buscar ordem pendente:', err);
    return null;
  }
};

export const cancelPendingOrder = async (orderId: string, reason: string = 'cancelado_pelo_usuario'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_event_orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending');

    if (!error) {
      sendOrderNotifications({ type: 'cancelled', orderId }).catch(() => {});
    }

    return !error;
  } catch (err) {
    console.warn('Erro ao cancelar ordem pendente:', err);
    return false;
  }
};

export const createMercadoPagoCheckout = async (
  params: CreateMercadoPagoCheckoutParams
): Promise<MercadoPagoCheckoutResponse> => {
  try {
    const origin = window.location.origin;
    const defaultSuccessUrl = `${origin}/eventos/${params.event_id}?payment=success`;
    const defaultFailureUrl = `${origin}/eventos/${params.event_id}?payment=failure`;
    const defaultPendingUrl = `${origin}/eventos/${params.event_id}?payment=pending`;

    const clientIp = params.ip_address || await getClientIpAddress();
    const cleanDoc = params.client_document?.replace(/\D/g, '');

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
        } catch {}
      }

      const targetBatch = batches[params.batch_index || 0];
      if (targetBatch && targetBatch.quantity && targetBatch.quantity > 0) {
        const { data: approvedOrders } = await supabase
          .from('app_event_orders')
          .select('quantity')
          .eq('event_id', params.event_id)
          .eq('batch_index', params.batch_index || 0)
          .in('status', ['approved', 'paid', 'completed']);

        const totalSold = (approvedOrders || []).reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 1), 0);
        const remaining = Math.max(0, targetBatch.quantity - totalSold);

        if (remaining <= 0) {
          return { error: `O lote "${targetBatch.name || 'selecionado'}" está esgotado.` };
        }

        if (params.quantity > remaining) {
          return { error: `Restam apenas ${remaining} ingressos disponíveis para o lote "${targetBatch.name}". Por favor, ajuste a quantidade.` };
        }
      }
    }

    const rawSubtotal = params.unit_price * params.quantity;
    const discount = params.discount_amount || 0;
    const subtotal = Math.max(0, rawSubtotal - discount);
    const fee = params.convenience_fee || (subtotal * ((params.convenience_fee_percentage || 0) / 100));
    const totalAmount = subtotal + fee;
    const itemUnitPrice = Number((totalAmount / params.quantity).toFixed(2));

    let orderId = params.existing_order_id;
    let order: any = null;

    if (orderId) {
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('app_event_orders')
        .update({
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          amount_total: totalAmount,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          payment_method: params.payment_method || 'mercadopago',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
          ip_address: clientIp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (!updateErr && updatedOrder) {
        order = updatedOrder;
      }
    }

    if (!order) {
      const { data: newOrder, error: orderErr } = await supabase
        .from('app_event_orders')
        .insert({
          event_id: params.event_id,
          client_id: params.client_id || null,
          client_name: params.client_name || '',
          client_email: params.client_email || '',
          client_phone: params.client_phone || '',
          client_document: cleanDoc || null,
          ip_address: clientIp,
          amount_total: totalAmount,
          currency: 'brl',
          quantity: params.quantity,
          batch_index: params.batch_index || 0,
          batch_name: params.batch_name || 'Lote Padrão',
          status: 'pending',
          payment_method: params.payment_method || 'mercadopago',
          convenience_fee: fee,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          coupon_id: params.coupon_id || null,
          coupon_code: params.coupon_code || null,
          discount_amount: discount,
        })
        .select()
        .single();

      if (orderErr) {
        console.error('Erro ao registrar pedido:', orderErr);
      }
      order = newOrder;
      orderId = newOrder?.id;
    }

    const accessToken =
      (import.meta as any).env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
      (import.meta as any).env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return { error: 'Token do Mercado Pago não configurado. Verifique o arquivo .env (VITE_MERCADOPAGO_ACCESS_TOKEN).' };
    }

    const isHttpsPublic = defaultSuccessUrl.startsWith('https://') && 
                          !defaultSuccessUrl.includes('localhost') && 
                          !defaultSuccessUrl.includes('127.0.0.1');

    const mpPreferenceBody: any = {
      items: [
        {
          id: `${params.event_id}-${params.batch_index}`,
          title: `Ingresso - ${params.batch_name || 'Evento'} (${params.quantity}x)`,
          description: `Ingresso para evento`,
          quantity: params.quantity,
          currency_id: 'BRL',
          unit_price: itemUnitPrice,
        },
      ],
      payer: {
        name: params.client_name?.trim() || 'Comprador',
        email: params.client_email?.trim() || 'comprador@betternow.com.br',
      },
      back_urls: {
        success: `${defaultSuccessUrl}&order_id=${order?.id || ''}`,
        failure: `${defaultFailureUrl}&order_id=${order?.id || ''}`,
        pending: `${defaultPendingUrl}&order_id=${order?.id || ''}`,
      },
      payment_methods: {
        excluded_payment_methods: [
          { id: 'account_money' }
        ],
        excluded_payment_types: (() => {
          if (params.payment_method === 'credit_card') {
            return [
              { id: 'ticket' },
              { id: 'bank_transfer' },
              { id: 'debit_card' },
              { id: 'prepaid_card' },
              { id: 'atm' },
            ];
          }
          if (params.payment_method === 'pix' || params.payment_method === 'pix_stripe') {
            return [
              { id: 'credit_card' },
              { id: 'debit_card' },
              { id: 'prepaid_card' },
              { id: 'ticket' },
              { id: 'atm' },
            ];
          }
          if (params.payment_method === 'boleto') {
            return [
              { id: 'credit_card' },
              { id: 'debit_card' },
              { id: 'prepaid_card' },
              { id: 'bank_transfer' },
              { id: 'atm' },
            ];
          }
          return undefined;
        })(),
        installments: params.installments ? Number(params.installments) : (params.max_installments || 12),
        default_installments: params.installments ? Number(params.installments) : 1,
      },
      external_reference: order?.id || `${params.event_id}-${Date.now()}`,
      metadata: {
        order_id: order?.id,
        event_id: params.event_id,
        client_id: params.client_id,
        quantity: params.quantity,
      },
    };

    if (isHttpsPublic) {
      mpPreferenceBody.auto_return = 'approved';
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(mpPreferenceBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Erro retornado pela API do Mercado Pago:', mpData);
      return {
        error: mpData.message || 'Erro ao processar checkout no Mercado Pago.',
      };
    }

    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;

    if (order?.id && mpData.id) {
      await supabase
        .from('app_event_orders')
        .update({
          stripe_session_id: mpData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      sendOrderNotifications({
        type: 'created',
        orderId: order.id,
        orderData: { ...order, stripe_session_id: mpData.id, payment_url: checkoutUrl },
      }).catch(() => {});
    }

    return {
      checkoutUrl,
      preferenceId: mpData.id,
      orderId: order?.id,
    };
  } catch (err: any) {
    console.error('Erro no checkout do Mercado Pago:', err);
    return {
      error: err.message || 'Erro inesperado ao gerar pagamento.',
    };
  }
};

export const checkMercadoPagoPaymentStatus = async (
  orderId: string
): Promise<{ paid: boolean; paymentId?: string; status?: string }> => {
  try {
    const accessToken =
      (import.meta as any).env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
      (import.meta as any).env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken || !orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return { paid: false, status: 'missing_token_or_order' };
    }

    const cleanOrderId = orderId.trim();

    const { data: currentOrder } = await supabase
      .from('app_event_orders')
      .select('*')
      .eq('id', cleanOrderId)
      .maybeSingle();

    if (currentOrder && (currentOrder.status === 'paid' || currentOrder.status === 'approved')) {
      return { paid: true, paymentId: currentOrder.stripe_session_id || currentOrder.payment_id, status: 'approved' };
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(cleanOrderId)}&sort=date_created&criteria=desc`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpRes.ok) return { paid: false, status: 'api_error' };

    const mpData = await mpRes.json();
    const paymentsList: any[] = Array.isArray(mpData.results) ? mpData.results : [];

    const matchingPayments = paymentsList.filter((p: any) => 
      p && String(p.external_reference || '').trim() === cleanOrderId
    );

    const approvedPayment = matchingPayments.find((p: any) => 
      p.status === 'approved' || p.status_detail === 'accredited'
    );
    const latestPayment = matchingPayments[0] || paymentsList[0];

    if (approvedPayment && currentOrder) {
      const paymentId = String(approvedPayment.id);
      await completeMercadoPagoOrder(cleanOrderId, paymentId);
      return { paid: true, paymentId, status: 'approved' };
    }

    return { paid: false, status: latestPayment?.status || 'pending' };
  } catch (err) {
    console.warn('Erro ao consultar status no Mercado Pago:', err);
    return { paid: false, status: 'error' };
  }
};
