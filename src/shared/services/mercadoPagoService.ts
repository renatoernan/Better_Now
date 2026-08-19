import { supabase } from './lib/supabase';
import { EventOrder } from './stripeService';
import { getClientIpAddress } from '../utils/utils/ipUtils';

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

/**
 * Busca se já existe uma ordem pendente para o mesmo comprador/IP no mesmo evento
 */
export const findPendingOrderForClient = async (params: {
  event_id: string;
  client_document?: string;
  client_phone?: string;
  ip_address?: string;
}): Promise<any | null> => {
  try {
    if (!params.event_id) return null;

    // Criar filtros OR para CPF, WhatsApp e IP
    const cleanDoc = params.client_document?.replace(/\D/g, '');
    const cleanPhone = params.client_phone?.replace(/\D/g, '');

    let query = supabase
      .from('app_event_orders')
      .select('*')
      .eq('event_id', params.event_id)
      .eq('status', 'pending')
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

    return data[0];
  } catch (err) {
    console.warn('Erro ao buscar ordem pendente:', err);
    return null;
  }
};

/**
 * Cancela uma ordem pendente registrando o motivo
 */
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

    return !error;
  } catch (err) {
    console.warn('Erro ao cancelar ordem pendente:', err);
    return false;
  }
};

/**
 * Cria a sessão de Checkout do Mercado Pago com suporte a parcelamento em até 12x
 */
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

    const subtotal = params.unit_price * params.quantity;
    const fee = params.convenience_fee || (subtotal * ((params.convenience_fee_percentage || 0) / 100));
    const totalAmount = subtotal + fee;
    const itemUnitPrice = Number((totalAmount / params.quantity).toFixed(2));

    let orderId = params.existing_order_id;
    let order: any = null;

    if (orderId) {
      // Reutilizar e atualizar a ordem pendente existente
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('app_event_orders')
        .update({
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

    // Se não há ordem existente para reutilizar, criar uma nova
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
        })
        .select()
        .single();

      if (orderErr) {
        console.error('Erro ao registrar pedido:', orderErr);
      }
      order = newOrder;
      orderId = newOrder?.id;
    }

    // 2. Fallback direto usando o token configurado no ambiente (.env com prefixo VITE_)
    const accessToken =
      (import.meta as any).env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
      (import.meta as any).env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return { error: 'Token do Mercado Pago não configurado. Verifique o arquivo .env (VITE_MERCADOPAGO_ACCESS_TOKEN).' };
    }

    // Criar a preferência na API oficial do Mercado Pago
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
        installments: params.installments ? Number(params.installments) : (params.max_installments || 12), // Trava no parcelamento selecionado no site
        default_installments: params.installments ? Number(params.installments) : 1, // Pré-seleciona a parcela exata
      },
      external_reference: order?.id || `${params.event_id}-${Date.now()}`,
      metadata: {
        order_id: order?.id,
        event_id: params.event_id,
        client_id: params.client_id,
        quantity: params.quantity,
      },
    };

    // Mercado Pago exige HTTPS público para auto_return
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

    // Salvar preference ID no pedido
    if (order?.id && mpData.id) {
      await supabase
        .from('app_event_orders')
        .update({
          stripe_session_id: mpData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;

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

    if (!accessToken || !orderId) return { paid: false, status: 'missing_token' };

    // 1. Primeiro verificar se o pedido já foi marcado como pago no Supabase
    const { data: currentOrder } = await supabase
      .from('app_event_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (currentOrder && (currentOrder.status === 'paid' || currentOrder.status === 'approved')) {
      return { paid: true, paymentId: currentOrder.stripe_session_id || currentOrder.payment_id, status: 'approved' };
    }

    // 2. Consultar pagamentos por external_reference na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpRes.ok) return { paid: false, status: 'api_error' };

    const mpData = await mpRes.json();
    const paymentsList = mpData.results || [];
    const approvedPayment = paymentsList.find((p: any) => p.status === 'approved');
    const latestPayment = paymentsList[0];

    if (approvedPayment && currentOrder) {
      const paymentId = String(approvedPayment.id);

      // Atualizar o status do pedido para 'paid'
      await supabase
        .from('app_event_orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Gerar ingressos na tabela app_event_tickets se ainda não existirem
      const { data: existingTickets } = await supabase
        .from('app_event_tickets')
        .select('id')
        .eq('order_id', orderId);

      if (!existingTickets || existingTickets.length === 0) {
        const qty = currentOrder.quantity || 1;
        const ticketsToInsert = [];

        for (let i = 0; i < qty; i++) {
          const ticketNumber = `${orderId.substring(0, 6).toUpperCase()}-${i + 1}`;
          const qrHash = `MP-${paymentId}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

          ticketsToInsert.push({
            order_id: orderId,
            event_id: currentOrder.event_id,
            client_id: currentOrder.client_id || null,
            ticket_number: ticketNumber,
            qr_code_hash: qrHash,
            status: 'valid',
            created_at: new Date().toISOString(),
          });
        }

        await supabase.from('app_event_tickets').insert(ticketsToInsert);
      }

      return { paid: true, paymentId, status: 'approved' };
    }

    return { paid: false, status: latestPayment?.status || 'pending' };
  } catch (err) {
    console.warn('Erro ao consultar status no Mercado Pago:', err);
    return { paid: false, status: 'error' };
  }
};
