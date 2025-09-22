import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ContactForm } from '../types/supabase';
import ActivityLogger from '../utils/activityLogger';

interface RealtimeContactsState {
  newContactsCount: number;
  latestContact: ContactForm | null;
  isConnected: boolean;
  error: string | null;
}

interface UseRealtimeContactsReturn extends RealtimeContactsState {
  resetNewContactsCount: () => void;
  markAsRead: (contactId: number) => void;
}

export const useRealtimeContacts = (): UseRealtimeContactsReturn => {
  const [state, setState] = useState<RealtimeContactsState>({
    newContactsCount: 0,
    latestContact: null,
    isConnected: false,
    error: null
  });

  useEffect(() => {
    let subscription: any = null;
    ActivityLogger.logSystem('realtime_subscription_start', 'Iniciando subscrição em tempo real para contatos', 'info');

    const setupRealtimeSubscription = async () => {
      try {
        // Subscribe to INSERT events on contact_forms table
        subscription = supabase
          .channel('contact_forms_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'contact_forms'
            },
            (payload) => {
              console.log('New contact received:', payload.new);
              
              const newContact = payload.new as ContactForm;
              
              ActivityLogger.logContact('realtime_new_contact', `Novo contato recebido em tempo real: ${newContact.name}`, 'info', {
                contactId: newContact.id,
                contactName: newContact.name,
                contactEmail: newContact.email,
                eventType: newContact.event_type
              });
              
              setState(prev => ({
                ...prev,
                newContactsCount: prev.newContactsCount + 1,
                latestContact: newContact,
                isConnected: true,
                error: null
              }));

              // Show browser notification if permission is granted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Novo Contato Recebido!', {
                  body: `${newContact.name} enviou uma mensagem sobre ${newContact.event_type}`,
                  icon: '/favicon.ico',
                  tag: 'new-contact'
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'contact_forms'
            },
            (payload) => {
              console.log('Contact updated:', payload.new);
              
              // If status changed to 'read', we might want to handle it
              const updatedContact = payload.new as ContactForm;
              
              ActivityLogger.logContact('realtime_contact_updated', `Contato atualizado em tempo real: ${updatedContact.name}`, 'info', {
                contactId: updatedContact.id,
                contactName: updatedContact.name,
                status: updatedContact.status
              });
              
              if (updatedContact.status === 'read') {
                setState(prev => ({
                  ...prev,
                  // Optionally decrease count if this was a new contact
                  isConnected: true,
                  error: null
                }));
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            
            const connected = status === 'SUBSCRIBED';
            
            setState(prev => ({
              ...prev,
              isConnected: connected,
              error: status === 'CHANNEL_ERROR' ? 'Erro na conexão em tempo real' : null
            }));
            
            if (connected) {
              ActivityLogger.logSystem('realtime_connected', 'Conexão em tempo real estabelecida com sucesso', 'success');
            } else if (status === 'CHANNEL_ERROR') {
              ActivityLogger.logSystem('realtime_error', 'Erro na conexão em tempo real', 'error', {
                status
              });
            } else if (status === 'CLOSED') {
              ActivityLogger.logSystem('realtime_disconnected', 'Conexão em tempo real desconectada', 'warning');
            }
          });

        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }

      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        ActivityLogger.logSystem('realtime_setup_error', 'Erro ao configurar subscrição em tempo real', 'error', { error: error.message });
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Falha ao conectar com o sistema em tempo real'
        }));
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        console.log('Cleaning up realtime subscription');
        ActivityLogger.logSystem('realtime_subscription_end', 'Encerrando subscrição em tempo real', 'info');
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const resetNewContactsCount = () => {
    setState(prev => ({
      ...prev,
      newContactsCount: 0
    }));
  };

  const markAsRead = async (contactId: number) => {
    try {
      const { error } = await supabase
        .from('contact_forms')
        .update({ status: 'read' })
        .eq('id', contactId);

      if (error) {
        console.error('Error marking contact as read:', error);
        return;
      }

      // The UPDATE event will be handled by the realtime subscription
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  return {
    ...state,
    resetNewContactsCount,
    markAsRead
  };
};

// Hook for real-time statistics
export const useRealtimeStats = () => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    todayContacts: 0,
    weekContacts: 0,
    monthContacts: 0,
    isLoading: true,
    error: null as string | null
  });

  const loadStats = async () => {
    try {
      setStats(prev => ({ ...prev, isLoading: true, error: null }));

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get total contacts
      const { count: totalCount, error: totalError } = await supabase
        .from('contact_forms')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get today's contacts
      const { count: todayCount, error: todayError } = await supabase
        .from('contact_forms')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      if (todayError) throw todayError;

      // Get this week's contacts
      const { count: weekCount, error: weekError } = await supabase
        .from('contact_forms')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      if (weekError) throw weekError;

      // Get this month's contacts
      const { count: monthCount, error: monthError } = await supabase
        .from('contact_forms')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      setStats({
        totalContacts: totalCount || 0,
        todayContacts: todayCount || 0,
        weekContacts: weekCount || 0,
        monthContacts: monthCount || 0,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao carregar estatísticas'
      }));
    }
  };

  useEffect(() => {
    loadStats();

    // Set up realtime subscription for stats updates
    const subscription = supabase
      .channel('stats_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_forms'
        },
        () => {
          // Reload stats when any change occurs
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    ...stats,
    refreshStats: loadStats
  };
};