import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { checkMercadoPagoPaymentStatus } from '../../services/mercadoPagoService';
import { sendOrderWhatsAppNotification, OrderNotificationType } from '../../services/orderNotificationService';
import { toast } from 'sonner';

export interface EventOrderRecord {
  id: string;
  event_id: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  ip_address?: string;
  amount_total: number;
  currency: string;
  quantity: number;
  batch_index: number;
  batch_name?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed' | 'pending_proof';
  payment_method?: string;
  convenience_fee?: number;
  convenience_fee_percentage?: number;
  payment_proof_url?: string;
  cancellation_reason?: string;
  stripe_session_id?: string;
  coupon_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  created_at: string;
  updated_at?: string;
  tickets?: EventTicketRecord[];
}

export interface EventTicketRecord {
  id: string;
  order_id: string;
  event_id: string;
  client_id?: string;
  ticket_number: string;
  qr_code_hash: string;
  status: 'valid' | 'used' | 'cancelled';
  checked_in_at?: string;
  created_at: string;
  person?: {
    nome: string;
    documento?: string;
    whatsapp?: string;
    email?: string;
  };
}

export interface EventOrderKPIs {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalTicketsSold: number;
}

export const useEventOrders = (eventId?: string) => {
  const [orders, setOrders] = useState<EventOrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [kpis, setKpis] = useState<EventOrderKPIs>({
    totalRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    totalTicketsSold: 0,
  });

  const fetchOrders = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      // 1. Buscar todas as ordens do evento
      const { data: ordersData, error: ordersError } = await supabase
        .from('app_event_orders')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // 2. Buscar tickets vinculados ao evento
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('app_event_tickets')
        .select(`
          *,
          person:app_people(nome, documento, whatsapp, email)
        `)
        .eq('event_id', eventId);

      if (ticketsError) {
        console.warn('Erro ao buscar tickets:', ticketsError);
      }

      // Mapear tickets por order_id
      const ticketsByOrder = (ticketsData || []).reduce((acc: Record<string, EventTicketRecord[]>, ticket: any) => {
        if (!acc[ticket.order_id]) {
          acc[ticket.order_id] = [];
        }
        acc[ticket.order_id].push(ticket);
        return acc;
      }, {});

      const combinedOrders: EventOrderRecord[] = (ordersData || []).map((order) => ({
        ...order,
        tickets: ticketsByOrder[order.id] || [],
      }));

      setOrders(combinedOrders);

      // Calcular KPIs
      let revenue = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let cancelledCount = 0;
      let ticketsSold = 0;

      combinedOrders.forEach((o) => {
        if (o.status === 'paid' || (o.status as string) === 'approved') {
          revenue += Number(o.amount_total || 0);
          paidCount += 1;
          ticketsSold += Number(o.quantity || 1);
        } else if (o.status === 'pending' || o.status === 'pending_proof') {
          pendingCount += 1;
        } else if (o.status === 'cancelled' || o.status === 'refunded' || o.status === 'failed') {
          cancelledCount += 1;
        }
      });

      setKpis({
        totalRevenue: revenue,
        totalOrders: combinedOrders.length,
        paidOrders: paidCount,
        pendingOrders: pendingCount,
        cancelledOrders: cancelledCount,
        totalTicketsSold: ticketsSold,
      });
    } catch (err: any) {
      console.error('Erro ao carregar ordens do evento:', err);
      toast.error('Erro ao carregar ordens do evento.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Sincroniza status de um pedido específico no Mercado Pago
  const syncOrderWithMercadoPago = async (orderId: string): Promise<boolean> => {
    try {
      toast.info('Verificando status no Mercado Pago...');
      const result = await checkMercadoPagoPaymentStatus(orderId);

      if (result.paid) {
        toast.success('Pagamento identificado e confirmado no Mercado Pago! 🎉');
        await fetchOrders();
        return true;
      } else {
        toast.info(result.status ? `Status no Mercado Pago: ${result.status}` : 'Nenhum pagamento aprovado localizado no Mercado Pago para este pedido.');
        return false;
      }
    } catch (err: any) {
      console.error('Erro ao consultar Mercado Pago:', err);
      toast.error('Erro ao consultar o Mercado Pago.');
      return false;
    }
  };

  // Sincroniza todos os pedidos pendentes do evento no Mercado Pago
  const syncAllPendingWithMercadoPago = async (): Promise<number> => {
    const pendingOrdersList = orders.filter(o => o.status === 'pending');
    if (pendingOrdersList.length === 0) {
      toast.info('Não há pedidos pendentes para sincronizar.');
      return 0;
    }

    setSyncing(true);
    let updatedCount = 0;

    try {
      toast.info(`Consultando ${pendingOrdersList.length} pedido(s) pendente(s) no Mercado Pago...`);

      for (const ord of pendingOrdersList) {
        try {
          const res = await checkMercadoPagoPaymentStatus(ord.id);
          if (res.paid) {
            updatedCount += 1;
          }
        } catch {
          // Continua para o próximo
        }
      }

      if (updatedCount > 0) {
        toast.success(`${updatedCount} pedido(s) identificado(s) e atualizado(s) para PAGO com sucesso! 🎉`);
      } else {
        toast.info('Nenhum novo pagamento aprovado foi encontrado no Mercado Pago.');
      }

      await fetchOrders();
      return updatedCount;
    } catch (err: any) {
      console.error('Erro ao sincronizar pedidos pendentes:', err);
      toast.error('Erro ao sincronizar com o Mercado Pago.');
      return updatedCount;
    } finally {
      setSyncing(false);
    }
  };

  // Aprovar comprovante Pix Chave manualmente
  const approvePixProof = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return false;

      // 1. Atualizar ordem para 'paid'
      const { error: orderError } = await supabase
        .from('app_event_orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Gerar tickets se ainda não existirem
      const { data: existing } = await supabase
        .from('app_event_tickets')
        .select('id')
        .eq('order_id', orderId);

      if (!existing || existing.length === 0) {
        const qty = order.quantity || 1;
        const ticketsToInsert = [];

        for (let i = 0; i < qty; i++) {
          const ticketNumber = `${orderId.substring(0, 6).toUpperCase()}-${i + 1}`;
          const qrHash = `PIX-${orderId.substring(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

          ticketsToInsert.push({
            order_id: orderId,
            event_id: order.event_id,
            client_id: order.client_id || null,
            ticket_number: ticketNumber,
            qr_code_hash: qrHash,
            status: 'valid',
            created_at: new Date().toISOString(),
          });
        }

        await supabase.from('app_event_tickets').insert(ticketsToInsert);
      }

      // Se a ordem possuir cupom de desconto, registrar uso definitivo
      if (order.coupon_code || order.coupon_id) {
        try {
          const { applyCouponOnOrder } = await import('../../services/couponService');
          await applyCouponOnOrder({
            couponId: order.coupon_id || '',
            code: order.coupon_code || '',
            eventId: order.event_id,
            orderId: orderId,
            batchIndex: order.batch_index || 0,
            originalAmount: Number(order.amount_total || 0) + Number(order.discount_amount || 0),
            clientName: order.client_name || undefined,
            clientDocument: order.client_document || undefined,
            clientPhone: order.client_phone || undefined,
            clientEmail: order.client_email || undefined,
          });
        } catch (couponErr) {
          console.warn('Aviso ao registrar uso do cupom na aprovação Pix:', couponErr);
        }
      }

      // Disparar notificação automática de Pagamento Confirmado (Ingressos Emitidos)
      sendOrderWhatsAppNotification({
        type: 'confirmed',
        orderId: orderId,
        orderData: { ...order, status: 'paid' },
      }).catch(() => {});

      toast.success('Comprovante aprovado e ingressos emitidos com sucesso!');
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao aprovar comprovante:', err);
      toast.error('Erro ao aprovar comprovante.');
      return false;
    }
  };

  // Recusar comprovante Pix Chave
  const rejectPixProof = async (orderId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('app_event_orders')
        .update({
          status: 'cancelled',
          cancellation_reason: `Comprovante recusado: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Disparar notificação automática de Pedido Cancelado
      sendOrderWhatsAppNotification({
        type: 'cancelled',
        orderId: orderId,
      }).catch(() => {});

      toast.success('Comprovante recusado e pedido cancelado.');
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao recusar comprovante:', err);
      toast.error('Erro ao recusar comprovante.');
      return false;
    }
  };

  // Cancelar pedido manualmente
  const cancelOrder = async (orderId: string, reason: string = 'cancelado_pelo_admin') => {
    try {
      const { error } = await supabase
        .from('app_event_orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Cancelar tickets vinculados
      await supabase
        .from('app_event_tickets')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId);

      // Disparar notificação automática de Pedido Cancelado
      sendOrderWhatsAppNotification({
        type: 'cancelled',
        orderId: orderId,
      }).catch(() => {});

      toast.success('Pedido cancelado com sucesso.');
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao cancelar pedido:', err);
      toast.error('Erro ao cancelar pedido.');
      return false;
    }
  };

  // Reenviar notificação de WhatsApp manualmente
  const sendManualOrderNotification = async (orderId: string, type: OrderNotificationType) => {
    try {
      const typeLabel = type === 'created' ? 'Pedido Criado' : type === 'confirmed' ? 'Pagamento Confirmado' : 'Pedido Cancelado';
      toast.info(`Enviando mensagem de ${typeLabel} via WhatsApp...`);
      const res = await sendOrderWhatsAppNotification({ type, orderId });
      if (res.success) {
        toast.success(`Mensagem de ${typeLabel} enviada no WhatsApp com sucesso! 📱`);
        return true;
      } else {
        toast.error(`Falha no envio do WhatsApp: ${res.message}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Erro ao enviar mensagem: ${err.message || 'Erro inesperado'}`);
      return false;
    }
  };

  // Reativar / Recuperar pedido cancelado
  const restoreOrder = async (orderId: string, targetStatus: 'pending' | 'paid' = 'pending') => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return false;

      const { error } = await supabase
        .from('app_event_orders')
        .update({
          status: targetStatus,
          cancellation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Se reativado para 'paid', revalidar ou emitir tickets
      if (targetStatus === 'paid') {
        const { data: existing } = await supabase
          .from('app_event_tickets')
          .select('id')
          .eq('order_id', orderId);

        if (existing && existing.length > 0) {
          await supabase
            .from('app_event_tickets')
            .update({ status: 'valid' })
            .eq('order_id', orderId);
        } else {
          const qty = order.quantity || 1;
          const ticketsToInsert = [];

          for (let i = 0; i < qty; i++) {
            const ticketNumber = `${orderId.substring(0, 6).toUpperCase()}-${i + 1}`;
            const qrHash = `RESTORED-${orderId.substring(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

            ticketsToInsert.push({
              order_id: orderId,
              event_id: order.event_id,
              client_id: order.client_id || null,
              ticket_number: ticketNumber,
              qr_code_hash: qrHash,
              status: 'valid',
              created_at: new Date().toISOString(),
            });
          }

          await supabase.from('app_event_tickets').insert(ticketsToInsert);
        }
      } else {
        // Se reativado para 'pending', tickets continuam cancelados ou aguardando
        await supabase
          .from('app_event_tickets')
          .update({ status: 'cancelled' })
          .eq('order_id', orderId);
      }

      toast.success(`Pedido recuperado com sucesso para status: ${targetStatus === 'paid' ? 'PAGO' : 'PENDENTE'}! 🎉`);
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao recuperar pedido:', err);
      toast.error('Erro ao recuperar pedido.');
      return false;
    }
  };

  return {
    orders,
    loading,
    syncing,
    kpis,
    refetch: fetchOrders,
    syncOrderWithMercadoPago,
    syncAllPendingWithMercadoPago,
    approvePixProof,
    rejectPixProof,
    cancelOrder,
    restoreOrder,
    sendManualOrderNotification,
  };
};

export default useEventOrders;

