import { useState, useEffect } from 'react';
import { supabase } from '../../services/lib/supabase';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import { toast } from 'sonner';
import { ClientInteraction } from './useSupabaseClients';

export interface InteractionFormData {
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'event' | 'note';
  description: string;
  interaction_date?: string;
}

export const useClientInteractions = (clientId?: string) => {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar interações de um cliente específico
  const loadInteractions = async (targetClientId?: string) => {
    const id = targetClientId || clientId;
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', id)
        .order('interaction_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInteractions(data || []);
      
      ActivityLogger.log('client_interactions_loaded', 'Interações do cliente carregadas', {
        clientId: id,
        count: data?.length || 0
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar interações';
      setError(errorMessage);
      ActivityLogger.log('client_interactions_load_error', 'Erro ao carregar interações', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova interação
  const addInteraction = async (targetClientId: string, interactionData: InteractionFormData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const newInteraction = {
        client_id: targetClientId,
        type: interactionData.type,
        description: interactionData.description,
        interaction_date: interactionData.interaction_date || new Date().toISOString(),
        created_by: userData.user?.id
      };

      const { data, error: insertError } = await supabase
        .from('client_interactions')
        .insert([newInteraction])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Atualizar lista local se for do cliente atual
      if (targetClientId === clientId) {
        setInteractions(prev => [data, ...prev]);
      }
      
      toast.success('Interação adicionada com sucesso!');
      ActivityLogger.log('client_interaction_added', 'Nova interação adicionada', {
        clientId: targetClientId,
        type: interactionData.type,
        interactionId: data.id
      });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao adicionar interação';
      toast.error(errorMessage);
      ActivityLogger.log('client_interaction_add_error', 'Erro ao adicionar interação', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Atualizar interação
  const updateInteraction = async (interactionId: string, updates: Partial<InteractionFormData>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('client_interactions')
        .update(updates)
        .eq('id', interactionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setInteractions(prev => prev.map(interaction => 
        interaction.id === interactionId ? data : interaction
      ));
      
      toast.success('Interação atualizada com sucesso!');
      ActivityLogger.log('client_interaction_updated', 'Interação atualizada', {
        interactionId,
        updates
      });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar interação';
      toast.error(errorMessage);
      ActivityLogger.log('client_interaction_update_error', 'Erro ao atualizar interação', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Excluir interação
  const deleteInteraction = async (interactionId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('client_interactions')
        .delete()
        .eq('id', interactionId);

      if (deleteError) {
        throw deleteError;
      }

      setInteractions(prev => prev.filter(interaction => interaction.id !== interactionId));
      
      toast.success('Interação excluída com sucesso!');
      ActivityLogger.log('client_interaction_deleted', 'Interação excluída', { interactionId });

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao excluir interação';
      toast.error(errorMessage);
      ActivityLogger.log('client_interaction_delete_error', 'Erro ao excluir interação', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Buscar todas as interações de um cliente (para uso externo)
  const getClientInteractions = async (targetClientId: string): Promise<ClientInteraction[]> => {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', targetClientId)
        .order('interaction_date', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Erro ao buscar interações do cliente:', err);
      return [];
    }
  };

  // Obter estatísticas de interações
  const getInteractionStats = (targetInteractions?: ClientInteraction[]) => {
    const data = targetInteractions || interactions;
    
    const stats = {
      total: data.length,
      byType: {} as Record<string, number>,
      thisMonth: 0,
      thisWeek: 0
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    data.forEach(interaction => {
      // Contar por tipo
      stats.byType[interaction.type] = (stats.byType[interaction.type] || 0) + 1;
      
      // Contar por período
      const interactionDate = new Date(interaction.interaction_date);
      if (interactionDate >= startOfMonth) {
        stats.thisMonth++;
      }
      if (interactionDate >= startOfWeek) {
        stats.thisWeek++;
      }
    });

    return stats;
  };

  // Configurar real-time subscription quando clientId muda
  useEffect(() => {
    if (clientId) {
      loadInteractions(clientId);

      const subscription = supabase
        .channel(`client_interactions_${clientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'client_interactions',
          filter: `client_id=eq.${clientId}`
        }, (payload) => {
          console.log('Mudança em tempo real nas interações:', payload);
          
          if (payload.eventType === 'INSERT') {
            setInteractions(prev => [payload.new as ClientInteraction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInteractions(prev => prev.map(interaction => 
              interaction.id === payload.new.id ? payload.new as ClientInteraction : interaction
            ));
          } else if (payload.eventType === 'DELETE') {
            setInteractions(prev => prev.filter(interaction => interaction.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [clientId]);

  return {
    interactions,
    loading,
    error,
    loadInteractions,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    getClientInteractions,
    getInteractionStats
  };
};