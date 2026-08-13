import { useState, useEffect } from 'react';
import { supabase } from '../../services/lib/supabase';
import { EventType, EventTypeFormData, ApiResponse, PaginatedResponse } from '../../types';
import { toast } from 'sonner';

/**
 * Schema real da tabela app_event_types no Supabase:
 * id (uuid), name (varchar), description (text), active (boolean),
 * deleted_at (timestamptz), created_at (timestamptz), updated_at (timestamptz)
 * 
 * NOTA: As colunas 'color' e 'icon' NÃO existem no banco remoto.
 * Esses campos são gerenciados apenas no frontend como metadados locais.
 */

const TABLE_NAME = 'app_event_types';

// Mapear dados do formulário para o payload do banco (sem color/icon)
const toDbPayload = (data: EventTypeFormData) => ({
  name: data.name,
  description: data.description || '',
  active: data.active ?? true,
});

// Enriquecer dados do banco com defaults de color/icon para o frontend
const enrichWithDefaults = (data: any): any => {
  if (!data) return data;
  return {
    ...data,
    color: data.color || '#3B82F6',
    icon: data.icon || 'Calendar',
  };
};

const enrichArrayWithDefaults = (data: any[]): any[] => {
  return (data || []).map(enrichWithDefaults);
};

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
        .from(TABLE_NAME)
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const enriched = enrichArrayWithDefaults(data);
      setEventTypes(enriched);
      return enriched;
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

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from(TABLE_NAME)
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (activeOnly) {
        query = query.eq('active', true);
      }

      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: enrichArrayWithDefaults(data),
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

      const { data, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return enrichWithDefaults(data);
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

      const payload = toDbPayload(eventTypeData);

      const { data, error: insertError } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast.success('Tipo de evento criado com sucesso!');
      await fetchEventTypes();

      return {
        data: enrichWithDefaults(data),
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

      // Apenas enviar campos que existem no banco
      const payload: any = {};
      if (eventTypeData.name !== undefined) payload.name = eventTypeData.name;
      if (eventTypeData.description !== undefined) payload.description = eventTypeData.description;
      if (eventTypeData.active !== undefined) payload.active = eventTypeData.active;

      const { data, error: updateError } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success('Tipo de evento atualizado com sucesso!');
      await fetchEventTypes();

      return {
        data: enrichWithDefaults(data),
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

      const { error: deleteErr } = await supabase
        .from(TABLE_NAME)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteErr) {
        throw new Error(deleteErr.message);
      }

      toast.success('Tipo de evento movido para lixeira!');
      await fetchEventTypes();

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

      const { data, error: toggleErr } = await supabase
        .from(TABLE_NAME)
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (toggleErr) {
        throw new Error(toggleErr.message);
      }

      const message = active ? 'Tipo de evento ativado!' : 'Tipo de evento desativado!';
      toast.success(message);
      await fetchEventTypes();

      return {
        data: enrichWithDefaults(data),
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

      const { data, error: fetchErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      return enrichArrayWithDefaults(data);
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

      const { data, error: restoreErr } = await supabase
        .from(TABLE_NAME)
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (restoreErr) {
        throw new Error(restoreErr.message);
      }

      toast.success('Tipo de evento restaurado com sucesso!');
      await fetchEventTypes();

      return {
        data: enrichWithDefaults(data),
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
        .from('app_events')
        .select('id')
        .eq('event_type', id)
        .limit(1);

      if (checkError) {
        console.warn('Erro ao verificar eventos vinculados:', checkError.message);
      }

      if (eventsUsingType && eventsUsingType.length > 0) {
        throw new Error('Não é possível excluir permanentemente este tipo de evento pois há eventos cadastrados com ele.');
      }

      const { error: deleteErr } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (deleteErr) {
        throw new Error(deleteErr.message);
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