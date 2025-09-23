import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalClients: number;
  activeEvents: number;
  totalTestimonials: number;
  totalContacts: number;
}

interface RecentActivity {
  recentEvents: any[];
  recentContacts: any[];
  recentTestimonials: any[];
}

interface EventStats {
  eventsByMonth: { month: string; count: number }[];
  eventsByStatus: { status: string; count: number }[];
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeEvents: 0,
    totalTestimonials: 0,
    totalContacts: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    recentEvents: [],
    recentContacts: [],
    recentTestimonials: []
  });
  
  const [eventStats, setEventStats] = useState<EventStats>({
    eventsByMonth: [],
    eventsByStatus: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      // Buscar total de clientes
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Buscar eventos ativos (não deletados e futuros)
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('event_date', new Date().toISOString().split('T')[0]);

      // Buscar total de depoimentos
      const { count: testimonialsCount } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Buscar total de contatos
      const { count: contactsCount } = await supabase
        .from('contact_forms')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalClients: clientsCount || 0,
        activeEvents: eventsCount || 0,
        totalTestimonials: testimonialsCount || 0,
        totalContacts: contactsCount || 0
      });
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setError('Erro ao carregar estatísticas');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Últimos 5 eventos criados
      const { data: recentEvents } = await supabase
        .from('events')
        .select('id, title, event_date, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      // Últimos 5 contatos recebidos
      const { data: recentContacts } = await supabase
        .from('contact_forms')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Últimos 5 depoimentos
      const { data: recentTestimonials } = await supabase
        .from('testimonials')
        .select('id, name, event_type, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity({
        recentEvents: recentEvents || [],
        recentContacts: recentContacts || [],
        recentTestimonials: recentTestimonials || []
      });
    } catch (err) {
      console.error('Erro ao buscar atividade recente:', err);
      setError('Erro ao carregar atividade recente');
    }
  };

  const fetchEventStats = async () => {
    try {
      // Eventos por mês (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('event_date, created_at')
        .is('deleted_at', null)
        .gte('created_at', sixMonthsAgo.toISOString());

      // Processar dados por mês
      const eventsByMonth = eventsData?.reduce((acc: any, event) => {
        const month = new Date(event.created_at).toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: 'numeric' 
        });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {}) || {};

      // Eventos por status
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const { data: allEvents } = await supabase
        .from('events')
        .select('event_date')
        .is('deleted_at', null);

      const eventsByStatus = allEvents?.reduce((acc: any, event) => {
        const eventDate = event.event_date;
        let status = 'Passados';
        
        if (eventDate > today) {
          status = 'Futuros';
        } else if (eventDate === today) {
          status = 'Hoje';
        }
        
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};

      setEventStats({
        eventsByMonth: Object.entries(eventsByMonth).map(([month, count]) => ({
          month,
          count: count as number
        })),
        eventsByStatus: Object.entries(eventsByStatus).map(([status, count]) => ({
          status,
          count: count as number
        }))
      });
    } catch (err) {
      console.error('Erro ao buscar estatísticas de eventos:', err);
      setError('Erro ao carregar estatísticas de eventos');
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivity(),
        fetchEventStats()
      ]);
      
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const refetch = () => {
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetchDashboardStats(),
      fetchRecentActivity(),
      fetchEventStats()
    ]).finally(() => {
      setLoading(false);
    });
  };

  return {
    stats,
    recentActivity,
    eventStats,
    loading,
    error,
    refetch
  };
};