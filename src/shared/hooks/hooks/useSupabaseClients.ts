import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import { cacheService, CACHE_KEYS, cacheUtils } from '../../services/cache';
import type { 
  Client, 
  ClientFilters, 
  PaginationParams, 
  UseAsyncState,
  ApiResponse,
  PaginatedResponse 
} from '../../types';

// Client interaction interface
export interface ClientInteraction {
  id: string;
  client_id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'event' | 'note';
  description: string;
  interaction_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Client statistics interface
export interface ClientStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  withWhatsApp: number;
  withEmail: number;
  recentlyAdded: number;
  activeClients: number;
}

// Client event relationship interface
export interface ClientEvent {
  id: string;
  client_id: string;
  event_id: string;
  relationship_type: 'participant' | 'organizer' | 'vendor' | 'guest';
  notes?: string;
  created_at: string;
  event?: {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    event_time?: string;
    location?: string;
    status: string;
  };
}

// Hook return type
interface UseSupabaseClientsReturn extends UseAsyncState<Client[]> {
  clients: Client[];
  deletedClients: Client[];
  stats: ClientStats;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Actions
  fetchClients: (filters?: ClientFilters, pagination?: PaginationParams) => Promise<void>;
  fetchDeletedClients: () => Promise<void>;
  createClient: (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  restoreClient: (id: string) => Promise<void>;
  permanentDeleteClient: (id: string) => Promise<void>;
  
  // Interactions
  addInteraction: (interaction: Omit<ClientInteraction, 'id' | 'created_at' | 'updated_at'>) => Promise<ClientInteraction>;
  getClientInteractions: (clientId: string) => Promise<ClientInteraction[]>;
  
  // Client-Event relationships
  fetchClientEvents: (clientId: string) => Promise<ClientEvent[]>;
  linkClientToEvent: (clientId: string, eventId: string, relationshipType: string, notes?: string) => Promise<void>;
  unlinkClientFromEvent: (clientEventId: string) => Promise<void>;
  
  // Utility functions
  getClientById: (id: string) => Client | undefined;
  getClientsByCity: (city: string) => Client[];
  getClientsWithWhatsApp: () => Client[];
  getClientsWithEmail: () => Client[];
  searchClients: (searchTerm: string, additionalFilters?: Omit<ClientFilters, 'search'>) => Promise<void>;
  calculateStats: () => Promise<void>;
  clearError: () => void;
}

export const useSupabaseClients = (): UseSupabaseClientsReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    withWhatsApp: 0,
    withEmail: 0,
    recentlyAdded: 0,
    activeClients: 0
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleError = useCallback((err: any, message: string) => {
    console.error(message, err);
    const errorMessage = err.message || message;
    setError(errorMessage);
    toast.error(message);
    ActivityLogger.log('error', message, 'system', 'error', { error: errorMessage });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized computed values
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);

  // Utility functions
  const getClientById = useCallback((id: string) => {
    return clients.find(client => client.id === id);
  }, [clients]);

  const getClientsByCity = useCallback((city: string) => {
    return clients.filter(client => 
      client.cidade?.toLowerCase().includes(city.toLowerCase())
    );
  }, [clients]);

  const getClientsWithWhatsApp = useCallback(() => {
    return clients.filter(client => client.whatsapp);
  }, [clients]);

  const getClientsWithEmail = useCallback(() => {
    return clients.filter(client => client.email);
  }, [clients]);

  const calculateStats = useCallback(async () => {
    try {
      // Calcular estatísticas diretamente da tabela clients
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      // Total de clientes (não deletados)
      const { count: total } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Clientes criados este mês
      const { count: thisMonth } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', startOfMonth.toISOString());

      // Clientes criados esta semana
      const { count: thisWeek } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', startOfWeek.toISOString());

      // Clientes com WhatsApp
      const { count: withWhatsApp } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '');

      // Clientes com email
      const { count: withEmail } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('email', 'is', null)
        .neq('email', '');

      // Clientes adicionados nos últimos 7 dias
      const { count: recentlyAdded } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Clientes ativos (não deletados) - mesmo que total
      const activeClients = total;

      setStats({
        total: total || 0,
        thisMonth: thisMonth || 0,
        thisWeek: thisWeek || 0,
        withWhatsApp: withWhatsApp || 0,
        withEmail: withEmail || 0,
        recentlyAdded: recentlyAdded || 0,
        activeClients: activeClients || 0
      });
    } catch (err: any) {
      handleError(err, 'Erro ao calcular estatísticas');
    }
  }, []);

  // Fetch clients with filters and pagination
  const fetchClients = useCallback(async (filters?: ClientFilters, pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,apelido.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cidade.ilike.%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.has_whatsapp) {
        query = query.not('whatsapp', 'is', null);
      }
      if (filters?.has_email) {
        query = query.not('email', 'is', null);
      }
      if (filters?.city) {
        query = query.ilike('cidade', `%${filters.city}%`);
      }
      if (filters?.state) {
        query = query.eq('uf', filters.state);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setClients(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
      setTotalPages(Math.ceil((count || 0) / limit));
      
      await calculateStats();
      
      ActivityLogger.log('clients_loaded', 'Clientes carregados com sucesso', 'system', 'info', {
        count: data?.length || 0,
        filters
      });
    } catch (err: any) {
      handleError(err, 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search clients with filters
  const searchClients = useCallback(async (searchTerm: string, additionalFilters?: Omit<ClientFilters, 'search'>) => {
    const filters: ClientFilters = {
      search: searchTerm,
      ...additionalFilters
    };
    await fetchClients(filters);
  }, [fetchClients]);

  // Fetch deleted clients
  const fetchDeletedClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedClients(data || []);
    } catch (err: any) {
      handleError(err, 'Erro ao carregar clientes da lixeira');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create client
  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => [data, ...prev]);
      await calculateStats();
      
      toast.success('Cliente adicionado com sucesso!');
      ActivityLogger.log('client_added', 'Novo cliente adicionado', 'system', 'success', {
        clientId: data.id,
        name: data.name
      });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao adicionar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Update client
  const updateClient = useCallback(async (id: string, clientData: Partial<Client>): Promise<Client> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .update({
          ...clientData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => prev.map(client => client.id === id ? data : client));
      await calculateStats();
      
      toast.success('Cliente atualizado com sucesso!');
      ActivityLogger.log('client_updated', 'Cliente atualizado', 'system', 'success', {
        clientId: id,
        name: data.name
      });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao atualizar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Soft delete client
  const deleteClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => prev.filter(client => client.id !== id));
      setDeletedClients(prev => [data, ...prev]);
      await calculateStats();
      
      toast.success('Cliente movido para a lixeira!');
      ActivityLogger.log('client_deleted', 'Cliente movido para lixeira', 'system', 'warning', {
        clientId: id,
        name: data.name
      });
    } catch (err: any) {
      handleError(err, 'Erro ao mover cliente para lixeira');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Restore client from trash
  const restoreClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setDeletedClients(prev => prev.filter(client => client.id !== id));
      setClients(prev => [data, ...prev]);
      await calculateStats();
      
      toast.success('Cliente restaurado com sucesso!');
      ActivityLogger.log('client_restored', 'Cliente restaurado', 'system', 'success', {
        clientId: id,
        name: data.name
      });
    } catch (err: any) {
      handleError(err, 'Erro ao restaurar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Permanently delete client
  const permanentDeleteClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeletedClients(prev => prev.filter(client => client.id !== id));
      await calculateStats();
      
      toast.success('Cliente excluído permanentemente!');
      ActivityLogger.log('client_permanent_delete', 'Cliente excluído permanentemente', 'system', 'error', {
        clientId: id
      });
    } catch (err: any) {
      handleError(err, 'Erro ao excluir cliente permanentemente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Add client interaction
  const addInteraction = useCallback(async (interaction: Omit<ClientInteraction, 'id' | 'created_at' | 'updated_at'>): Promise<ClientInteraction> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('client_interactions')
        .insert([interaction])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Interação adicionada com sucesso!');
      ActivityLogger.log('interaction_added', 'Nova interação adicionada', 'system', 'success', {
        clientId: interaction.client_id,
        type: interaction.type
      });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao adicionar interação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get client interactions
  const getClientInteractions = useCallback(async (clientId: string): Promise<ClientInteraction[]> => {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      handleError(err, 'Erro ao carregar interações do cliente');
      return [];
    }
  }, []);

  // Fetch client events
  const fetchClientEvents = useCallback(async (clientId: string): Promise<ClientEvent[]> => {
    try {
      const { data, error } = await supabase
        .from('client_events')
        .select(`
          *,
          event:events(
            id,
            title,
            description,
            event_date,
            event_time,
            location,
            status
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      handleError(err, 'Erro ao carregar eventos do cliente');
      return [];
    }
  }, []);

  // Link client to event
  const linkClientToEvent = useCallback(async (
    clientId: string, 
    eventId: string, 
    relationshipType: string, 
    notes?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('client_events')
        .insert([{
          client_id: clientId,
          event_id: eventId,
          relationship_type: relationshipType,
          notes: notes
        }]);

      if (error) throw error;
      
      toast.success('Evento vinculado com sucesso!');
      ActivityLogger.log('client_event_linked', 'Cliente vinculado ao evento', 'system', 'success', {
        clientId,
        eventId,
        relationshipType
      });
    } catch (err: any) {
      handleError(err, 'Erro ao vincular cliente ao evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unlink client from event
  const unlinkClientFromEvent = useCallback(async (clientEventId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('client_events')
        .delete()
        .eq('id', clientEventId);

      if (error) throw error;
      
      toast.success('Evento desvinculado com sucesso!');
      ActivityLogger.log('client_event_unlinked', 'Cliente desvinculado do evento', 'system', 'success', {
        clientEventId
      });
    } catch (err: any) {
      handleError(err, 'Erro ao desvincular cliente do evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch function for UseAsyncState compatibility
  const refetch = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  return {
    // Data
    data: clients,
    clients,
    deletedClients,
    stats,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // State
    loading,
    error,
    
    // Actions
    fetchClients,
    fetchDeletedClients,
    createClient,
    updateClient,
    deleteClient,
    restoreClient,
    permanentDeleteClient,
    refetch,
    
    // Interactions
    addInteraction,
    getClientInteractions,
    
    // Client-Event relationships
    fetchClientEvents,
    linkClientToEvent,
    unlinkClientFromEvent,
    
    // Utility functions
    getClientById,
    getClientsByCity,
    getClientsWithWhatsApp,
    getClientsWithEmail,
    searchClients,
    calculateStats,
    clearError,
  };
};