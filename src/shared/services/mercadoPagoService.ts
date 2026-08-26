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

/**
 * Carrega dinamicamente o SDK oficial v2 do Mercado Pago no cliente
 */
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

/**
 * Identifica a bandeira do cartão a partir dos primeiros dígitos
 */
export const getCardBrand = (cardNumber: string): string => {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'master';
  if (/^(636368|438935|504175|451416|6011|5067|5090|6504|6505|6507|6509|6516|6550)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  if (/^3[47]/.test(clean)) return 'amex';
  return '';
};

/**
 * Conclui um pedido gerando os ingressos digitais e disparando notificações
 */
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

/**
 * Criação Segura de Pagamento PIX via Edge Function do Supabase (Zero Trust Client)
 */
export const createMercadoPagoPixPayment = async (
  params: CreatePixPaymentParams
): Promise<PixPaymentResponse> => {
  try {
    const clientIp = await getClientIpAddress();

    // 1. Invocação da Edge Function segura do Supabase
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
      'process-mercadopago-payment',
      {
        body: {
          event_id: params.event_id,
          batch_index: params.batch_index,
          quantity: params.quantity,
          payment_method: 'pix',
          client_name: params.client_name,
          client_email: params.client_email,
          client_phone: params.client_phone,
          client_document: params.client_document,
          client_id: params.client_id,
          coupon_id: params.coupon_id,
          coupon_code: params.coupon_code,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          existing_order_id: params.existing_order_id,
          attendees: params.attendees,
          ip_address: clientIp,
        },
      }
    );

    if (!edgeError && edgeData && edgeData.success && edgeData.qrCode) {
      return {
        success: true,
        orderId: edgeData.orderId,
        paymentId: edgeData.paymentId,
        qrCode: edgeData.qrCode,
        qrCodeBase64: edgeData.qrCodeBase64,
        ticketUrl: edgeData.ticketUrl,
        expirationDate: edgeData.expirationDate,
      };
    }

    // Se houve erro na Edge Function
    const errorMessage = edgeData?.error || edgeError?.message || 'Não foi possível gerar a chave Pix.';
    return {
      success: false,
      orderId: edgeData?.orderId || '',
      paymentId: '',
      qrCode: '',
      error: errorMessage,
    };
  } catch (err: any) {
    console.error('Erro ao gerar pagamento PIX:', err);
    return {
      success: false,
      orderId: '',
      paymentId: '',
      qrCode: '',
      error: err.message || 'Erro inesperado ao gerar pagamento PIX.',
    };
  }
};

/**
 * Processamento Seguro de Pagamento com Cartão de Crédito via Edge Function do Supabase
 */
export const processMercadoPagoCardPayment = async (
  params: ProcessCardPaymentParams
): Promise<CardPaymentResponse> => {
  try {
    const clientIp = await getClientIpAddress();

    // 1. Invocar a Edge Function com validação de preços e token seguro
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
      'process-mercadopago-payment',
      {
        body: {
          event_id: params.event_id,
          batch_index: params.batch_index,
          quantity: params.quantity,
          payment_method: 'credit_card',
          card_token: params.cardToken,
          payment_method_id: params.paymentMethodId,
          installments: params.installments,
          issuer_id: params.issuerId,
          client_name: params.client_name,
          client_email: params.client_email,
          client_phone: params.client_phone,
          client_document: params.client_document,
          client_id: params.client_id,
          coupon_id: params.coupon_id,
          coupon_code: params.coupon_code,
          convenience_fee_percentage: params.convenience_fee_percentage || 0,
          existing_order_id: params.existing_order_id,
          attendees: params.attendees,
          ip_address: clientIp,
        },
      }
    );

    if (edgeError || !edgeData) {
      console.error('Erro retornado pela Edge Function de pagamento:', edgeError || edgeData);
      return {
        success: false,
        status: 'rejected',
        error: edgeData?.error || edgeError?.message || 'Falha ao processar pagamento com o servidor.',
      };
    }

    const orderId = edgeData.orderId;
    const paymentId = edgeData.paymentId;
    const status = edgeData.status as 'approved' | 'in_process' | 'rejected' | 'pending';

    if (edgeData.success && status === 'approved') {
      if (orderId && paymentId) {
        await completeMercadoPagoOrder(orderId, paymentId);
      }
      return {
        success: true,
        status: 'approved',
        statusDetail: edgeData.statusDetail,
        orderId: orderId || '',
        paymentId: paymentId || '',
        message: edgeData.message || 'Pagamento aprovado com sucesso! Seus ingressos foram emitidos! 🎉',
      };
    }

    if (status === 'in_process' || status === 'pending') {
      return {
        success: true,
        status,
        statusDetail: edgeData.statusDetail,
        orderId: orderId || '',
        paymentId: paymentId || '',
        message: edgeData.message || 'Seu pagamento está em análise pela operadora do cartão.',
      };
    }

    return {
      success: false,
      status: 'rejected',
      orderId: orderId || '',
      paymentId: paymentId || '',
      error: edgeData.error || edgeData.message || 'Pagamento recusado pela operadora.',
    };
  } catch (err: any) {
    console.error('Erro inesperado no processamento do cartão:', err);
    return {
      success: false,
      status: 'rejected',
      error: err.message || 'Erro inesperado ao processar cartão.',
    };
  }
};

/**
 * Criação Segura de Checkout Pro (Redirecionamento / Modal) via Edge Function
 */
export const createMercadoPagoCheckout = async (
  params: CreateMercadoPagoCheckoutParams
): Promise<MercadoPagoCheckoutResponse> => {
  try {
    const origin = window.location.origin;
    const defaultSuccessUrl = `${origin}/eventos/${params.event_id}?payment=success`;
    const defaultFailureUrl = `${origin}/eventos/${params.event_id}?payment=failure`;
    const defaultPendingUrl = `${origin}/eventos/${params.event_id}?payment=pending`;

    const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
      'create-mercadopago-preference',
      {
        body: {
          event_id: params.event_id,
          batch_index: params.batch_index,
          quantity: params.quantity,
          client_name: params.client_name,
          client_email: params.client_email,
          client_phone: params.client_phone,
          client_id: params.client_id,
          payment_method: params.payment_method,
          convenience_fee: params.convenience_fee,
          convenience_fee_percentage: params.convenience_fee_percentage,
          success_url: defaultSuccessUrl,
          failure_url: defaultFailureUrl,
          pending_url: defaultPendingUrl,
        },
      }
    );

    if (edgeError || !edgeData) {
      console.error('Erro na Edge Function create-mercadopago-preference:', edgeError);
      return {
        error: edgeData?.error || edgeError?.message || 'Erro ao gerar checkout seguro no Mercado Pago.',
      };
    }

    return {
      checkoutUrl: edgeData.checkoutUrl,
      preferenceId: edgeData.preferenceId,
      orderId: edgeData.orderId,
    };
  } catch (err: any) {
    console.error('Erro ao criar checkout do Mercado Pago:', err);
    return {
      error: err.message || 'Erro inesperado ao iniciar checkout.',
    };
  }
};

/**
 * Consulta de Status Segura em Tempo Real
 * Consulta o status oficial gravado no banco de dados Supabase (alimentado pelo Webhook e Edge Functions)
 */
export const checkMercadoPagoPaymentStatus = async (
  orderId: string
): Promise<{ paid: boolean; paymentId?: string; status?: string }> => {
  try {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return { paid: false, status: 'missing_order_id' };
    }

    const cleanOrderId = orderId.trim();

    // 1. Consulta rápida no banco de dados
    const { data: currentOrder } = await supabase
      .from('app_event_orders')
      .select('id, status, stripe_session_id, stripe_payment_intent_id')
      .eq('id', cleanOrderId)
      .maybeSingle();

    if (currentOrder && (currentOrder.status === 'paid' || currentOrder.status === 'approved')) {
      return {
        paid: true,
        paymentId: currentOrder.stripe_session_id || currentOrder.stripe_payment_intent_id,
        status: 'approved',
      };
    }

    // 2. Sincronização segura via Edge Function do Supabase
    const { data: edgeData } = await supabase.functions.invoke(
      'process-mercadopago-payment',
      {
        body: {
          action: 'check_status',
          order_id: cleanOrderId,
        },
      }
    );

    if (edgeData && edgeData.paid) {
      return {
        paid: true,
        paymentId: edgeData.paymentId || currentOrder?.stripe_session_id,
        status: 'approved',
      };
    }

    return { paid: false, status: edgeData?.status || currentOrder?.status || 'pending' };
  } catch (err) {
    console.warn('Aviso ao consultar status do pedido:', err);
    return { paid: false, status: 'error' };
  }
};

/**
 * Busca ordens pendentes recentes para o comprador (evita duplicação)
 */
export const findPendingOrderForClient = async (params: {
  event_id: string;
  client_document?: string;
  client_phone?: string;
  ip_address?: string;
}): Promise<any | null> => {
  try {
    const cleanDoc = params.client_document?.replace(/\D/g, '');
    const cleanPhone = params.client_phone?.replace(/\D/g, '');

    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('app_event_orders')
      .select('*')
      .eq('event_id', params.event_id)
      .eq('status', 'pending')
      .gte('created_at', sixtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (cleanDoc && cleanDoc.length >= 11) {
      query = query.eq('client_document', cleanDoc);
    } else if (cleanPhone && cleanPhone.length >= 10) {
      query = query.eq('client_phone', cleanPhone);
    } else if (params.ip_address) {
      query = query.eq('ip_address', params.ip_address);
    } else {
      return null;
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (err) {
    console.warn('Aviso ao buscar ordem pendente:', err);
    return null;
  }
};

/**
 * Cancela uma ordem pendente anterior
 */
export const cancelPendingOrder = async (
  orderId: string,
  reason?: string
): Promise<boolean> => {
  try {
    if (!orderId) return false;
    const { error } = await supabase
      .from('app_event_orders')
      .update({
        status: 'canceled',
        cancellation_reason: reason || 'Cancelado pelo usuário',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending');

    return !error;
  } catch (err) {
    console.warn('Aviso ao cancelar ordem pendente:', err);
    return false;
  }
};

