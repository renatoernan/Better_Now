import { useState, useEffect } from 'react';
import { supabase } from '../../services/lib/supabase';
import { EventType, EventTypeFormData, ApiResponse, PaginatedResponse } from '../../types';
import { toast } from 'sonner';

export const useSupabaseEventTypes = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os tipos de eventos (apenas não excluídos)
  const fetchEventTypes = async (activeOnly: boolean = false): Promise<EventType[]> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('event_types')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      setEventTypes(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tipos de eventos';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Buscar tipos de eventos com paginação
  const fetchEventTypesPaginated = async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    activeOnly?: boolean
  ): Promise<PaginatedResponse<EventType>> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('event_types')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: data || [],
        count: count || 0,
        page,
        limit,
        total_pages: totalPages
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tipos de eventos';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        data: [],
        count: 0,
        page,
        limit,
        total_pages: 0
      };
    } finally {
      setLoading(false);
    }
  };

  // Buscar tipo de evento por ID
  const fetchEventTypeById = async (id: string): Promise<EventType | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Criar novo tipo de evento
  const createEventType = async (eventTypeData: EventTypeFormData): Promise<ApiResponse<EventType>> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .insert([eventTypeData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Tipo de evento criado com sucesso!');
      await fetchEventTypes(); // Atualizar lista

      return {
        data,
        message: 'Tipo de evento criado com sucesso!',
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Atualizar tipo de evento
  const updateEventType = async (id: string, eventTypeData: Partial<EventTypeFormData>): Promise<ApiResponse<EventType>> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .update(eventTypeData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Tipo de evento atualizado com sucesso!');
      await fetchEventTypes(); // Atualizar lista

      return {
        data,
        message: 'Tipo de evento atualizado com sucesso!',
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Soft delete - mover tipo de evento para lixeira
  const deleteEventType = async (id: string): Promise<ApiResponse<void>> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('event_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Tipo de evento movido para lixeira!');
      await fetchEventTypes(); // Atualizar lista

      return {
        message: 'Tipo de evento movido para lixeira!',
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Ativar/Desativar tipo de evento
  const toggleEventTypeStatus = async (id: string, active: boolean): Promise<ApiResponse<EventType>> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const message = active ? 'Tipo de evento ativado!' : 'Tipo de evento desativado!';
      toast.success(message);
      await fetchEventTypes(); // Atualizar lista

      return {
        data,
        message,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status do tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Carregar tipos de eventos ao montar o componente
  useEffect(() => {
    fetchEventTypes();
  }, []);

  // Buscar tipos de eventos excluídos (lixeira)
  const fetchDeletedEventTypes = async (): Promise<EventType[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tipos de eventos excluídos';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Restaurar tipo de evento da lixeira
  const restoreEventType = async (id: string): Promise<ApiResponse<EventType>> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_types')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Tipo de evento restaurado com sucesso!');
      await fetchEventTypes(); // Atualizar lista

      return {
        data,
        message: 'Tipo de evento restaurado com sucesso!',
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao restaurar tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  // Excluir permanentemente tipo de evento
  const permanentDeleteEventType = async (id: string): Promise<ApiResponse<void>> => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se há eventos usando este tipo
      const { data: eventsUsingType, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('event_type', id)
        .limit(1);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (eventsUsingType && eventsUsingType.length > 0) {
        throw new Error('Não é possível excluir permanentemente este tipo de evento pois há eventos cadastrados com ele.');
      }

      const { error } = await supabase
        .from('event_types')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Tipo de evento excluído permanentemente!');

      return {
        message: 'Tipo de evento excluído permanentemente!',
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir permanentemente tipo de evento';
      setError(errorMessage);
      toast.error(errorMessage);
      return {
        error: errorMessage,
        success: false
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    eventTypes,
    loading,
    error,
    fetchEventTypes,
    fetchEventTypesPaginated,
    fetchEventTypeById,
    createEventType,
    updateEventType,
    deleteEventType,
    toggleEventTypeStatus,
    fetchDeletedEventTypes,
    restoreEventType,
    permanentDeleteEventType
  };
};