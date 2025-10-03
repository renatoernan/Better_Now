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
  
  // Utility functions
  getClientById: (id: string) => Client | undefined;
  getClientsByCity: (city: string) => Client[];
  getClientsWithWhatsApp: () => Client[];
  getClientsWithEmail: () => Client[];
  searchClients: (query: string) => Client[];
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

  const searchClients = useCallback((query: string) => {
    const searchTerm = query.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.whatsapp?.includes(query) ||
      client.cidade?.toLowerCase().includes(searchTerm)
    );
  }, [clients]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Error handler
  const handleError = useCallback((err: any, message: string) => {
    const errorMessage = err?.message || 'Erro desconhecido';
    setError(errorMessage);
    toast.error(message);
    console.error(message, err);
    ActivityLogger.log('error', message, 'system', 'error', { error: errorMessage });
  }, []);

  // Calculate statistics
  const calculateStats = useCallback(async () => {
    try {
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, created_at, whatsapp, email, updated_at')
        .is('deleted_at', null);

      if (!allClients) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newStats: ClientStats = {
        total: allClients.length,
        thisMonth: allClients.filter(c => new Date(c.created_at) >= startOfMonth).length,
        thisWeek: allClients.filter(c => new Date(c.created_at) >= startOfWeek).length,
        withWhatsApp: allClients.filter(c => c.whatsapp).length,
        withEmail: allClients.filter(c => c.email).length,
        recentlyAdded: allClients.filter(c => new Date(c.created_at) >= last7Days).length,
        activeClients: allClients.filter(c => new Date(c.updated_at) >= last30Days).length
      };

      setStats(newStats);
    } catch (err: any) {
      console.error('Erro ao calcular estatísticas:', err);
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
        query = query.or(`name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cidade.ilike.%${filters.search}%`);
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
  }, [handleError, calculateStats]);

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
  }, [handleError]);

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
  }, [handleError, calculateStats]);

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
  }, [handleError, calculateStats]);

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
  }, [handleError, calculateStats]);

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
  }, [handleError, calculateStats]);

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
  }, [handleError, calculateStats]);

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
  }, [handleError]);

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
  }, [handleError]);

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