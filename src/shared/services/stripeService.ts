import { supabase } from './lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { sendOrderWhatsAppNotification } from './orderNotificationService';

// Chave pública do Stripe obtida das variáveis de ambiente
// @ts-ignore
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export interface CreateCheckoutParams {
  event_id: string;
  batch_index: number;
  quantity: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_id?: string;
  payment_method?: string;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutResponse {
  sessionId?: string;
  url?: string;
  orderId?: string;
  error?: string;
}

export interface EventOrder {
  id: string;
  event_id: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  amount_total: number;
  currency: string;
  quantity: number;
  batch_index: number;
  batch_name?: string;
  payment_method?: string;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  payment_proof_url?: string;
  status: 'pending' | 'paid' | 'canceled' | 'failed' | 'pending_proof';
  created_at: string;
}

export interface EventTicket {
  id: string;
  order_id: string;
  event_id: string;
  client_id?: string;
  ticket_number: number;
  qr_code_hash: string;
  status: 'valid' | 'used' | 'canceled';
  used_at?: string;
  created_at: string;
}

/**
 * Cria a sessão do Stripe Checkout via Supabase Edge Function e inicia o redirecionamento.
 */
export const createCheckoutSession = async (params: CreateCheckoutParams): Promise<CheckoutResponse> => {
  try {
    // 1. Invocar a Edge Function no Supabase
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: params,
    });

    if (error) {
      console.error('Erro ao invocar Edge Function create-checkout-session:', error);
      return { error: error.message || 'Falha ao conectar com o serviço de pagamento.' };
    }

    if (data?.error) {
      return { error: data.error };
    }

    // 2. Se a Edge Function retornou a URL direta do Checkout, redireciona o usuário
    if (data?.url) {
      window.location.href = data.url;
      return data;
    }

    // 3. Fallback: Se retornou sessionId e a chave pública está configurada
    if (data?.sessionId && stripePromise) {
      const stripe = await stripePromise;
      if (stripe) {
        // @ts-ignore
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (stripeError) {
          return { error: stripeError.message };
        }
      }
    }

    return data || { error: 'Não foi possível redirecionar para a página de checkout.' };
  } catch (err: any) {
    console.error('Erro no stripeService:', err);
    return { error: err.message || 'Erro inesperado no checkout.' };
  }
};

/**
 * Busca os detalhes do pedido pelo id ou stripe_session_id ou mercadopago_preference_id
 */
export const getOrderBySessionId = async (idOrSessionId: string): Promise<EventOrder | null> => {
  try {
    if (!idOrSessionId) return null;
    const cleanId = idOrSessionId.trim();

    // 1. Tenta buscar diretamente por ID (UUID da ordem)
    let { data, error } = await supabase
      .from('app_event_orders')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    // 2. Se não achou por ID, tenta pelos campos de sessão / preferência / pagamento
    if (!data) {
      const fallbackQuery = await supabase
        .from('app_event_orders')
        .select('*')
        .or(`stripe_session_id.eq.${cleanId},mercadopago_preference_id.eq.${cleanId},mercadopago_payment_id.eq.${cleanId}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fallbackQuery.data && fallbackQuery.data.length > 0) {
        data = fallbackQuery.data[0];
      }
    }

    if (!data) {
      console.warn('Pedido não encontrado por ID ou SessionId:', cleanId);
      return null;
    }

    return data as EventOrder;
  } catch (err) {
    console.error('Erro ao consultar pedido:', err);
    return null;
  }
};

/**
 * Busca os ingressos gerados para um pedido (e gera caso ainda não existam)
 */
export const getTicketsByOrderId = async (orderId: string, orderFallbackData?: EventOrder): Promise<EventTicket[]> => {
  try {
    if (!orderId) return [];

    // 1. Busca os tickets já cadastrados
    const { data: tickets, error } = await supabase
      .from('app_event_tickets')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!error && tickets && tickets.length > 0) {
      return tickets as EventTicket[];
    }

    // 2. Se ainda não existirem tickets, busca a ordem e gera automaticamente os ingressos
    let order = orderFallbackData;
    if (!order) {
      const { data: ord } = await supabase
        .from('app_event_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      order = ord as EventOrder;
    }

    if (order) {
      const qty = order.quantity || 1;
      const ticketsToInsert = [];

      for (let i = 0; i < qty; i++) {
        const ticketNumber = `${order.id.slice(0, 6).toUpperCase()}-${i + 1}`;
        const qrHash = `BN-${order.event_id?.slice(0, 8) || 'EV'}-${order.id.slice(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

        ticketsToInsert.push({
          order_id: order.id,
          event_id: order.event_id,
          client_id: order.client_id || null,
          ticket_number: ticketNumber as any,
          qr_code_hash: qrHash,
          status: 'valid',
          created_at: new Date().toISOString(),
        });
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('app_event_tickets')
        .insert(ticketsToInsert)
        .select();

      if (!insertErr && inserted) {
        return inserted as EventTicket[];
      }
    }

    return [];
  } catch (err) {
    console.error('Erro ao consultar/gerar ingressos:', err);
    return [];
  }
};

/**
 * Cria um pedido via Pix Chave e salva com status 'pending_proof'
 */
export const createPixChaveOrder = async (orderData: {
  event_id: string;
  batch_index: number;
  batch_name?: string;
  quantity: number;
  amount_total: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_id?: string;
  payment_proof_url?: string;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
}): Promise<{ data?: EventOrder; error?: string }> => {
  try {
    const payload = {
      event_id: orderData.event_id,
      client_id: orderData.client_id || null,
      client_name: orderData.client_name || null,
      client_email: orderData.client_email || null,
      client_phone: orderData.client_phone || null,
      amount_total: orderData.amount_total,
      currency: 'brl',
      quantity: orderData.quantity,
      batch_index: orderData.batch_index,
      batch_name: orderData.batch_name || null,
      status: 'pending_proof',
      payment_method: 'pix_chave',
      payment_proof_url: orderData.payment_proof_url || null,
      convenience_fee: orderData.convenience_fee || 0,
      convenience_fee_percentage: orderData.convenience_fee_percentage || 0
    };

    const { data, error } = await supabase
      .from('app_event_orders')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao registrar pedido Pix Chave:', error);
      return { error: error.message || 'Erro ao registrar pedido.' };
    }

    if (data?.id) {
      // Disparar notificação automática de Pedido Criado (Aguardando Pagamento/Aprovação)
      sendOrderWhatsAppNotification({
        type: 'created',
        orderId: data.id,
        orderData: data,
      }).catch(() => {});
    }

    return { data: data as EventOrder };
  } catch (err: any) {
    console.error('Erro ao criar pedido Pix Chave:', err);
    return { error: err.message || 'Erro inesperado ao salvar pedido.' };
  }
};

/**
 * Upload de comprovante de pagamento Pix para o Supabase Storage
 */
export const uploadPaymentProof = async (file: File, eventId: string): Promise<{ url?: string; error?: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `proofs/${eventId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      // Se der erro no bucket 'events', tentar converter para dataURL como fallback
      console.warn('Falha no upload para storage, usando conversão local:', uploadError);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string });
        reader.onerror = () => resolve({ error: 'Erro ao processar imagem do comprovante' });
        reader.readAsDataURL(file);
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('events')
      .getPublicUrl(fileName);

    return { url: publicUrl };
  } catch (err: any) {
    console.error('Erro no upload do comprovante:', err);
    return { error: err.message || 'Erro ao enviar comprovante.' };
  }
};

