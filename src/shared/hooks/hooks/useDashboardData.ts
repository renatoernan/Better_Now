import { useState, useEffect } from 'react';
import { supabase } from '../../services/lib/supabase';

export interface DashboardStats {
  totalClients: number;
  activeEvents: number;
  totalEvents: number;
  totalOrders: number;
  totalRevenue: number;
  totalTestimonials: number;
  totalContacts: number;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'event' | 'contact' | 'testimonial' | 'person';
  title: string;
  description: string;
  amount?: number;
  payment_method?: string;
  created_at: string;
}

export interface EventStats {
  eventsByMonth: { month: string; count: number }[];
  eventsByStatus: { status: string; count: number }[];
  totalEvents: number;
  pastEvents: number;
  futureEvents: number;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeEvents: 0,
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalTestimonials: 0,
    totalContacts: 0
  });

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  const [eventStats, setEventStats] = useState<EventStats>({
    eventsByMonth: [],
    eventsByStatus: [],
    totalEvents: 0,
    pastEvents: 0,
    futureEvents: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      // 1. Total de clientes / pessoas cadastradas
      const { count: peopleCount, error: peopleErr } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (peopleErr) console.warn('Erro ao contar app_people:', peopleErr);

      // 2. Eventos ativos e total de eventos
      const { data: eventsData, error: eventsErr } = await supabase
        .from('app_events')
        .select('id, title, event_date, status, created_at')
        .is('deleted_at', null);

      if (eventsErr) console.warn('Erro ao buscar app_events:', eventsErr);

      const nowStr = new Date().toISOString().split('T')[0];
      const allEventsList = eventsData || [];
      const activeEventsCount = allEventsList.filter(e => {
        const isNotDeleted = true;
        const isFutureOrActive = (e.event_date && e.event_date >= nowStr) || e.status === 'active' || e.status === 'published';
        return isNotDeleted && isFutureOrActive;
      }).length;

      // 3. Pedidos e Receita de Vendas (app_event_orders não tem deleted_at)
      const { data: ordersData, error: ordersErr } = await supabase
        .from('app_event_orders')
        .select('id, amount_total, status, quantity, client_name, created_at');

      if (ordersErr) {
        console.warn('Erro ao buscar app_event_orders:', ordersErr);
      }

      const allOrders = ordersData || [];
      const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'confirmed');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount_total) || 0), 0);
      const totalTicketsSold = paidOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);

      // 4. Depoimentos
      const { count: testimonialsCount } = await supabase
        .from('app_testimonials')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // 5. Contatos recebidos
      const { count: contactsCount } = await supabase
        .from('app_contact_forms')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalClients: peopleCount || 0,
        activeEvents: activeEventsCount || (allEventsList.length > 0 ? allEventsList.length : 0),
        totalEvents: allEventsList.length,
        totalOrders: totalTicketsSold,
        totalRevenue: totalRevenue,
        totalTestimonials: testimonialsCount || 0,
        totalContacts: contactsCount || 0
      });

      // Processar estatísticas de eventos
      const eventsByStatusObj: Record<string, number> = { 'Futuros': 0, 'Passados': 0, 'Hoje': 0 };
      allEventsList.forEach(e => {
        if (!e.event_date) {
          eventsByStatusObj['Futuros'] += 1;
        } else if (e.event_date > nowStr) {
          eventsByStatusObj['Futuros'] += 1;
        } else if (e.event_date === nowStr) {
          eventsByStatusObj['Hoje'] += 1;
        } else {
          eventsByStatusObj['Passados'] += 1;
        }
      });

      setEventStats({
        eventsByMonth: [],
        eventsByStatus: Object.entries(eventsByStatusObj).map(([status, count]) => ({ status, count })),
        totalEvents: allEventsList.length,
        pastEvents: eventsByStatusObj['Passados'] || 0,
        futureEvents: (eventsByStatusObj['Futuros'] || 0) + (eventsByStatusObj['Hoje'] || 0)
      });

    } catch (err: any) {
      console.error('Erro ao carregar estatísticas do dashboard:', err);
      setError(err?.message || 'Erro ao carregar estatísticas');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];

      // 1. Últimos pedidos de ingressos (sem deleted_at)
      const { data: recentOrders, error: recentOrdersErr } = await supabase
        .from('app_event_orders')
        .select('id, client_name, amount_total, status, quantity, payment_method, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      if (recentOrdersErr) {
        console.warn('Erro ao buscar recentOrders:', recentOrdersErr);
      }

      if (recentOrders) {
        recentOrders.forEach(order => {
          const isPaid = order.status === 'paid' || (order.status as string) === 'approved' || (order.status as string) === 'confirmed';
          activities.push({
            id: `order-${order.id}`,
            type: 'order',
            title: isPaid ? 'Ingresso Confirmado' : 'Pedido de Ingresso',
            description: `${order.client_name || 'Comprador'} comprou ${order.quantity || 1} ingresso(s)`,
            amount: Number(order.amount_total) || 0,
            payment_method: order.payment_method,
            created_at: order.created_at
          });
        });
      }

      // 2. Últimos eventos
      const { data: recentEvents } = await supabase
        .from('app_events')
        .select('id, title, event_date, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentEvents) {
        recentEvents.forEach(event => {
          activities.push({
            id: `event-${event.id}`,
            type: 'event',
            title: 'Evento Cadastrado',
            description: `Evento: ${event.title}`,
            created_at: event.created_at
          });
        });
      }

      // 3. Últimos contatos
      const { data: recentContacts } = await supabase
        .from('app_contact_forms')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentContacts) {
        recentContacts.forEach(contact => {
          activities.push({
            id: `contact-${contact.id}`,
            type: 'contact',
            title: 'Mensagem de Contato',
            description: `Contato de: ${contact.name || contact.email}`,
            created_at: contact.created_at
          });
        });
      }

      // 4. Últimos depoimentos
      const { data: recentTestimonials } = await supabase
        .from('app_testimonials')
        .select('id, name, event_type, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentTestimonials) {
        recentTestimonials.forEach(t => {
          activities.push({
            id: `testimonial-${t.id}`,
            type: 'testimonial',
            title: 'Depoimento Recebido',
            description: `Depoimento de: ${t.name}`,
            created_at: t.created_at
          });
        });
      }

      // Ordenar por data mais recente
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivities(activities.slice(0, 10));
    } catch (err: any) {
      console.error('Erro ao buscar atividade recente:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchDashboardStats(), fetchRecentActivity()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  return {
    stats,
    recentActivities,
    eventStats,
    loading,
    error,
    refetch: loadAll
  };
};