import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { Event } from '../../types/types/event';

export const usePublicEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os eventos ativos
  const fetchPublicEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 Iniciando busca por todos os eventos ativos...');

      const today = new Date().toISOString().split('T')[0];
      console.log('📅 Data de hoje:', today);

      const { data, error } = await supabase
        .from('app_events')
        .select('*')
        .eq('status', 'active')
        .gte('event_date', today)
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('❌ Erro na consulta Supabase:', error);
        throw error;
      }

      console.log('✅ Eventos encontrados:', data?.length || 0, data);
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Erro ao carregar todos os eventos ativos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar evento por ID
  const fetchEventById = useCallback(async (id: string): Promise<Event | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_events')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar evento';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar eventos em destaque (próximos 3 eventos)
  const fetchFeaturedEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('app_events')
        .select('*')
        .eq('status', 'active')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar eventos em destaque:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar eventos por categoria
  const fetchEventsByCategory = useCallback(async (category: string) => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('app_events')
        .select('*')
        .eq('status', 'active')
        .eq('category', category)
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar eventos por categoria:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar eventos ao montar o componente
  useEffect(() => {
    console.log('🚀 usePublicEvents montado - iniciando carregamento de eventos');
    console.log('🔧 Testando conexão Supabase:', supabase);
    
    // Teste simples de conexão
    supabase.from('app_events').select('count').then(result => {
      console.log('🔧 Teste de conexão Supabase:', result);
    });
    
    fetchPublicEvents();
  }, []);

  return {
    events,
    loading,
    error,
    fetchPublicEvents,
    fetchEventById,
    fetchFeaturedEvents,
    fetchEventsByCategory,
  };
};