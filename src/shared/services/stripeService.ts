import { supabase } from './lib/supabase';
import { loadStripe } from '@stripe/stripe-js';

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
  stripe_session_id: string;
  stripe_payment_intent_id?: string;
  amount_total: number;
  currency: string;
  quantity: number;
  batch_index: number;
  batch_name?: string;
  status: 'pending' | 'paid' | 'canceled' | 'failed';
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
 * Busca os detalhes do pedido pelo stripe_session_id
 */
export const getOrderBySessionId = async (sessionId: string): Promise<EventOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('event_orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error) {
      console.error('Erro ao buscar pedido por session_id:', error);
      return null;
    }

    return data as EventOrder;
  } catch (err) {
    console.error('Erro ao consultar pedido:', err);
    return null;
  }
};

/**
 * Busca os ingressos gerados para um pedido
 */
export const getTicketsByOrderId = async (orderId: string): Promise<EventTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('event_tickets')
      .select('*')
      .eq('order_id', orderId)
      .order('ticket_number', { ascending: true });

    if (error) {
      console.error('Erro ao buscar ingressos por order_id:', error);
      return [];
    }

    return data as EventTicket[];
  } catch (err) {
    console.error('Erro ao consultar ingressos:', err);
    return [];
  }
};
