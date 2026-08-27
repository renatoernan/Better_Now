import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { checkMercadoPagoPaymentStatus } from '../../services/mercadoPagoService';
import { 
  sendOrderNotifications, 
  sendOrderWhatsAppNotification, 
  sendOrderEmailNotification, 
  OrderNotificationType 
} from '../../services/orderNotificationService';
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
  refunded_at?: string;
  refund_amount?: number;
  refund_reason?: string;
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
    id?: string;
    nome: string;
    documento?: string;
    whatsapp?: string;
    email?: string;
  };
}

export interface EventOrderKPIs {
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRefundAmount: number;
  totalTicketsSold: number;
}

export interface CancelOrderNotifyOptions {
  email: boolean;
  whatsapp: boolean;
}

export interface RefundOrderParams {
  orderId: string;
  amount: number;
  reason: string;
  isPartial?: boolean;
}

export interface TransferTicketParams {
  ticketId: string;
  orderId: string;
  eventId: string;
  fromPersonId?: string;
  fromPersonName?: string;
  toPerson: {
    nome: string;
    documento: string;
    whatsapp?: string;
    email?: string;
  };
  reason?: string;
}

export const useEventOrders = (eventId?: string) => {
  const [orders, setOrders] = useState<EventOrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [kpis, setKpis] = useState<EventOrderKPIs>({
    totalRevenue: 0,
    totalFees: 0,
    netRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
    totalRefundAmount: 0,
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

      // 2. Buscar tickets vinculados ao evento com dados da pessoa
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('app_event_tickets')
        .select(`
          *,
          person:app_people(id, nome, documento, whatsapp, email)
        `)
        .eq('event_id', eventId);

      if (ticketsError) {
        console.warn('Erro ao buscar tickets:', ticketsError);
      }

      // Mapear tickets por order_id desduplicando por ticket_number
      const ticketsByOrder = (ticketsData || []).reduce((acc: Record<string, EventTicketRecord[]>, ticket: any) => {
        if (!acc[ticket.order_id]) {
          acc[ticket.order_id] = [];
        }
        const alreadyExists = acc[ticket.order_id].some(
          (t) => String(t.ticket_number) === String(ticket.ticket_number)
        );
        if (!alreadyExists) {
          acc[ticket.order_id].push(ticket);
        }
        return acc;
      }, {});

      // Ordenar os tickets de cada ordem por ticket_number
      Object.keys(ticketsByOrder).forEach((orderId) => {
        ticketsByOrder[orderId].sort((a, b) => Number(a.ticket_number || 0) - Number(b.ticket_number || 0));
      });

      const combinedOrders: EventOrderRecord[] = (ordersData || []).map((order) => ({
        ...order,
        tickets: ticketsByOrder[order.id] || [],
      }));

      setOrders(combinedOrders);

      // Calcular KPIs
      let revenue = 0;
      let fees = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let cancelledCount = 0;
      let refundedCount = 0;
      let refundAmountTotal = 0;
      let ticketsSold = 0;

      combinedOrders.forEach((o) => {
        const isRefunded = o.status === 'refunded' || !!o.refunded_at;
        if (isRefunded) {
          refundedCount += 1;
          refundAmountTotal += Number(o.refund_amount || o.amount_total || 0);
        }

        if (o.status === 'paid' || (o.status as string) === 'approved') {
          const orderTotal = Number(o.amount_total || 0);
          const orderFee = Number(o.convenience_fee || 0);
          revenue += orderTotal;
          fees += orderFee;
          paidCount += 1;
          ticketsSold += Number(o.quantity || 1);
        } else if (o.status === 'pending' || o.status === 'pending_proof') {
          pendingCount += 1;
        } else if (o.status === 'cancelled' || o.status === 'failed') {
          cancelledCount += 1;
        }
      });

      const netRevenue = Math.max(0, revenue - fees);

      setKpis({
        totalRevenue: revenue,
        totalFees: fees,
        netRevenue: netRevenue,
        totalOrders: combinedOrders.length,
        paidOrders: paidCount,
        pendingOrders: pendingCount,
        cancelledOrders: cancelledCount,
        refundedOrders: refundedCount,
        totalRefundAmount: refundAmountTotal,
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
        // Disparar notificações de confirmação (WhatsApp + E-mail)
        sendOrderNotifications({
          type: 'confirmed',
          orderId: orderId,
        }).catch(() => {});

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
            sendOrderNotifications({
              type: 'confirmed',
              orderId: ord.id,
            }).catch(() => {});
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
          const qrHash = `PIX-${orderId.substring(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

          ticketsToInsert.push({
            order_id: orderId,
            event_id: order.event_id,
            client_id: order.client_id || null,
            ticket_number: i + 1,
            qr_code_hash: qrHash,
            status: 'valid',
            created_at: new Date().toISOString(),
          });
        }

        await supabase
          .from('app_event_tickets')
          .upsert(ticketsToInsert, { onConflict: 'order_id,ticket_number', ignoreDuplicates: true });
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

      // Disparar notificações automáticas de Pagamento Confirmado (WhatsApp + E-mail)
      sendOrderNotifications({
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

      // Disparar notificações automáticas de Pedido Cancelado (WhatsApp + E-mail)
      sendOrderNotifications({
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

  // Cancelar pedido manualmente com opções de notificação
  const cancelOrder = async (
    orderId: string, 
    reason: string = 'cancelado_pelo_admin',
    notifyOptions: CancelOrderNotifyOptions = { email: true, whatsapp: true }
  ) => {
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

      // Disparar notificações conforme opções selecionadas pelo usuário
      if (notifyOptions.email && notifyOptions.whatsapp) {
        sendOrderNotifications({
          type: 'cancelled',
          orderId: orderId,
        }).catch(() => {});
      } else {
        if (notifyOptions.whatsapp) {
          sendOrderWhatsAppNotification({
            type: 'cancelled',
            orderId: orderId,
          }).catch(() => {});
        }
        if (notifyOptions.email) {
          sendOrderEmailNotification({
            type: 'cancelled',
            orderId: orderId,
          }).catch(() => {});
        }
      }

      toast.success('Pedido cancelado com sucesso.');
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao cancelar pedido:', err);
      toast.error('Erro ao cancelar pedido.');
      return false;
    }
  };

  // Registrar Reembolso de Pedido (Parcial ou Total)
  const refundOrder = async ({ orderId, amount, reason, isPartial = false }: RefundOrderParams) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      if (!targetOrder) {
        toast.error('Pedido não encontrado.');
        return false;
      }

      const newStatus = isPartial ? targetOrder.status : 'refunded';

      const { error } = await supabase
        .from('app_event_orders')
        .update({
          status: newStatus,
          refunded_at: new Date().toISOString(),
          refund_amount: amount,
          refund_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Se for reembolso total, cancelar os tickets vinculados
      if (!isPartial) {
        await supabase
          .from('app_event_tickets')
          .update({ status: 'cancelled' })
          .eq('order_id', orderId);
      }

      toast.success(
        isPartial 
          ? `Reembolso parcial de R$ ${amount.toFixed(2)} registrado com sucesso!` 
          : 'Reembolso total registrado e ingressos cancelados com sucesso!'
      );
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao processar reembolso:', err);
      toast.error('Erro ao processar reembolso.');
      return false;
    }
  };

  // Transferir Ingresso Individual entre Pessoas
  const transferTicket = async ({
    ticketId,
    orderId,
    eventId: targetEventId,
    fromPersonId,
    fromPersonName,
    toPerson,
    reason = 'Transferência realizada pelo administrador'
  }: TransferTicketParams) => {
    try {
      const cleanDoc = toPerson.documento ? toPerson.documento.replace(/\D/g, '') : '';
      let targetPersonId: string | null = null;

      // 1. Verificar se a pessoa que está recebendo já existe na app_people por documento
      if (cleanDoc) {
        const { data: existingPerson } = await supabase
          .from('app_people')
          .select('id, nome, documento, whatsapp, email')
          .eq('documento', cleanDoc)
          .maybeSingle();

        if (existingPerson) {
          targetPersonId = existingPerson.id;
        }
      }

      // 2. Se não existir, gravar novo registro em app_people
      if (!targetPersonId) {
        const { data: newPerson, error: personError } = await supabase
          .from('app_people')
          .insert({
            nome: toPerson.nome.trim(),
            documento: cleanDoc || null,
            whatsapp: toPerson.whatsapp || null,
            email: toPerson.email || null,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (personError || !newPerson) {
          console.error('Erro ao cadastrar nova pessoa em app_people:', personError);
          throw new Error('Falha ao cadastrar destinatário na base de pessoas.');
        }

        targetPersonId = newPerson.id;
      }

      // 3. Atualizar o ticket com o novo client_id (pessoa titular)
      const { error: ticketUpdateError } = await supabase
        .from('app_event_tickets')
        .update({
          client_id: targetPersonId,
        })
        .eq('id', ticketId);

      if (ticketUpdateError) throw ticketUpdateError;

      // 4. Registrar log na tabela app_ticket_transfers (ignora se a tabela não existir ainda no banco)
      try {
        await supabase
          .from('app_ticket_transfers')
          .insert({
            ticket_id: ticketId,
            order_id: orderId,
            event_id: targetEventId,
            from_person_id: fromPersonId || null,
            to_person_id: targetPersonId,
            from_person_name: fromPersonName || 'Titular Anterior',
            to_person_name: toPerson.nome,
            transfer_reason: reason,
            transferred_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
      } catch (logErr) {
        console.warn('Aviso ao registrar log de transferência:', logErr);
      }

      toast.success(`Ingresso transferido para ${toPerson.nome} com sucesso! 🎉`);
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error('Erro ao transferir ingresso:', err);
      toast.error(err.message || 'Erro ao transferir ingresso.');
      return false;
    }
  };

  // Reenviar notificação de WhatsApp e/ou E-mail manualmente
  const sendManualOrderNotification = async (
    orderId: string, 
    type: OrderNotificationType,
    channels: { whatsapp: boolean; email: boolean } = { whatsapp: true, email: true }
  ): Promise<boolean> => {
    try {
      if (!channels.whatsapp && !channels.email) {
        toast.error('Selecione pelo menos um canal (WhatsApp ou E-mail) para envio.');
        return false;
      }

      const typeLabel = type === 'created' ? 'Pedido Criado' : type === 'confirmed' ? 'Pagamento Confirmado' : 'Pedido Cancelado';
      const channelLabels = [];
      if (channels.whatsapp) channelLabels.push('WhatsApp');
      if (channels.email) channelLabels.push('E-mail');

      toast.info(`Disparando notificação de ${typeLabel} via ${channelLabels.join(' e ')}...`);

      let whatsappSuccess = false;
      let emailSuccess = false;
      let errorMsg = '';

      if (channels.whatsapp && channels.email) {
        const res = await sendOrderNotifications({ type, orderId });
        whatsappSuccess = !!res.whatsapp?.success;
        emailSuccess = !!res.email?.success;
        if (!whatsappSuccess && !emailSuccess) {
          errorMsg = res.whatsapp?.message || res.email?.message || 'Falha no envio';
        }
      } else if (channels.whatsapp) {
        const res = await sendOrderWhatsAppNotification({ type, orderId });
        whatsappSuccess = !!res.success;
        if (!whatsappSuccess) errorMsg = res.message;
      } else if (channels.email) {
        const res = await sendOrderEmailNotification({ type, orderId });
        emailSuccess = !!res.success;
        if (!emailSuccess) errorMsg = res.message;
      }

      const successChannels: string[] = [];
      if (whatsappSuccess) successChannels.push('WhatsApp 📱');
      if (emailSuccess) successChannels.push('E-mail ✉️');

      if (successChannels.length > 0) {
        toast.success(`Notificação de ${typeLabel} enviada via ${successChannels.join(' e ')} com sucesso! 🎉`);
        return true;
      } else {
        toast.error(`Falha no envio da notificação: ${errorMsg || 'Erro na entrega'}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Erro ao enviar notificação: ${err.message || 'Erro inesperado'}`);
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
          refunded_at: null,
          refund_amount: null,
          refund_reason: null,
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
            const qrHash = `RESTORED-${orderId.substring(0, 8)}-${i + 1}-${Date.now().toString(36).toUpperCase()}`;

            ticketsToInsert.push({
              order_id: orderId,
              event_id: order.event_id,
              client_id: order.client_id || null,
              ticket_number: i + 1,
              qr_code_hash: qrHash,
              status: 'valid',
              created_at: new Date().toISOString(),
            });
          }

          await supabase
            .from('app_event_tickets')
            .upsert(ticketsToInsert, { onConflict: 'order_id,ticket_number', ignoreDuplicates: true });
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
    refundOrder,
    transferTicket,
    restoreOrder,
    sendManualOrderNotification,
  };
};

export default useEventOrders;


