import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import type {
  Client,
  ClientFilters,
  PaginationParams,
  UseAsyncState,
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

// Helper para normalizar linhas da tabela app_people para a interface Client
const mapRowToClient = (row: any): Client => {
  const nameVal = row.nome || row.name || 'Sem nome';
  const phoneVal = row.whatsapp || row.telefone || row.phone || '';
  const docVal = row.documento || row.cpf || '';
  const streetVal = row.logradouro || '';
  const cityVal = row.cidade || row.city || '';
  const ufVal = row.uf || row.estado || row.state || '';
  const notesVal = row.notes || row.observacoes || '';

  return {
    id: row.id,
    name: nameVal,
    nome: nameVal,
    email: row.email || '',
    phone: phoneVal,
    telefone: phoneVal,
    whatsapp: phoneVal,
    cpf: docVal,
    documento: docVal,
    apelido: row.apelido || '',
    data_nascimento: row.data_nascimento || '',
    profissao: row.profissao || '',
    empresa: row.empresa || '',
    cep: row.cep || '',
    address: streetVal,
    endereco: streetVal,
    logradouro: streetVal,
    numero: row.numero || '',
    complemento: row.complemento || '',
    bairro: row.bairro || '',
    city: cityVal,
    cidade: cityVal,
    state: ufVal,
    estado: ufVal,
    uf: ufVal,
    zip_code: row.cep || '',
    notes: notesVal,
    observacoes: notesVal,
    validated: row.validated !== false,
    is_active: row.is_active !== false && row.ativo !== false,
    tipo: row.tipo || row.type || '',
    deleted_at: row.deleted_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

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
    const errorMessage = err?.message || message;
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
      (client.cidade || client.city || '')?.toLowerCase().includes(city.toLowerCase())
    );
  }, [clients]);

  const getClientsWithWhatsApp = useCallback(() => {
    return clients.filter(client => client.whatsapp || client.phone);
  }, [clients]);

  const getClientsWithEmail = useCallback(() => {
    return clients.filter(client => client.email);
  }, [clients]);

  const calculateStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      // Total de clientes na tabela app_people
      const { count: total } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true });

      // Clientes criados este mês
      const { count: thisMonth } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Clientes criados esta semana
      const { count: thisWeek } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      // Clientes com WhatsApp / Telefone
      const { count: withWhatsApp } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '');

      // Clientes com email
      const { count: withEmail } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null)
        .neq('email', '');

      // Clientes adicionados nos últimos 7 dias
      const { count: recentlyAdded } = await supabase
        .from('app_people')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const activeClients = total || 0;

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
      console.warn('Erro ao calcular estatísticas de app_people:', err);
    }
  }, []);

  // Fetch clients with filters and pagination
  const fetchClients = useCallback(async (filters?: ClientFilters, pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 1000;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('app_people')
        .select('*', { count: 'exact' })
        .order('nome', { ascending: true })
        .range(offset, offset + limit - 1);

      // Aplicar filtros de busca por nome, apelido, whatsapp, email, cidade ou documento
      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,apelido.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cidade.ilike.%${filters.search}%,documento.ilike.%${filters.search}%`
        );
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters?.has_whatsapp) {
        query = query.not('whatsapp', 'is', null).neq('whatsapp', '');
      }
      if (filters?.has_email) {
        query = query.not('email', 'is', null).neq('email', '');
      }
      if (filters?.city) {
        query = query.ilike('cidade', `%${filters.city}%`);
      }
      if (filters?.state) {
        query = query.eq('uf', filters.state);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const mappedClients = (data || []).map(mapRowToClient);
      setClients(mappedClients);
      setTotalCount(count || 0);
      setCurrentPage(page);
      setTotalPages(Math.ceil((count || 0) / limit));

      await calculateStats();

      ActivityLogger.log('clients_loaded', 'Clientes carregados com sucesso de app_people', 'system', 'info', {
        count: mappedClients.length,
        filters
      });
    } catch (err: any) {
      handleError(err, 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [calculateStats, handleError]);

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
        .from('app_people')
        .select('*')
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDeletedClients((data || []).map(mapRowToClient));
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

      const cleanPhone = (clientData.whatsapp || clientData.phone || clientData.telefone || '').replace(/\D/g, '');
      const cleanDoc = (clientData.documento || clientData.cpf || '').replace(/\D/g, '');

      const payload: Record<string, any> = {
        nome: (clientData.nome || clientData.name || '').trim(),
        whatsapp: clientData.whatsapp?.trim() || cleanPhone || null,
        telefone: clientData.telefone?.trim() || null,
        email: clientData.email?.trim() || null,
        documento: cleanDoc || clientData.documento?.trim() || null,
        apelido: clientData.apelido?.trim() || null,
        cep: clientData.cep?.trim() || null,
        logradouro: clientData.logradouro?.trim() || clientData.address?.trim() || null,
        numero: clientData.numero?.trim() || null,
        complemento: clientData.complemento?.trim() || null,
        bairro: clientData.bairro?.trim() || null,
        cidade: clientData.cidade?.trim() || clientData.city?.trim() || null,
        uf: clientData.uf?.trim() || clientData.state?.trim() || null,
        notes: clientData.notes?.trim() || clientData.observacoes?.trim() || null,
        validated: clientData.validated !== false,
        is_active: clientData.is_active !== false,
        tipo: clientData.tipo?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('app_people')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar cliente em app_people:', error);
        throw error;
      }

      const clientObj = mapRowToClient(data);
      setClients(prev => [clientObj, ...prev]);
      await calculateStats();

      toast.success('Cliente adicionado com sucesso!');
      ActivityLogger.log('client_added', 'Novo cliente adicionado', 'system', 'success', {
        clientId: data.id,
        name: clientObj.name
      });

      return clientObj;
    } catch (err: any) {
      handleError(err, 'Erro ao adicionar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats, handleError]);

  // Update client
  const updateClient = useCallback(async (id: string, clientData: Partial<Client>): Promise<Client> => {
    try {
      setLoading(true);
      setError(null);

      const cleanPhone = clientData.whatsapp ? clientData.whatsapp.replace(/\D/g, '') : undefined;
      const cleanDoc = (clientData.documento || clientData.cpf) ? (clientData.documento || clientData.cpf || '').replace(/\D/g, '') : undefined;

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (clientData.nome !== undefined || clientData.name !== undefined) {
        payload.nome = (clientData.nome ?? clientData.name ?? '').trim();
      }
      if (clientData.whatsapp !== undefined) {
        payload.whatsapp = clientData.whatsapp?.trim() || cleanPhone || null;
      }
      if (clientData.telefone !== undefined) {
        payload.telefone = clientData.telefone?.trim() || null;
      }
      if (clientData.email !== undefined) {
        payload.email = clientData.email?.trim() || null;
      }
      if (clientData.documento !== undefined || clientData.cpf !== undefined) {
        payload.documento = cleanDoc || clientData.documento?.trim() || clientData.cpf?.trim() || null;
      }
      if (clientData.apelido !== undefined) {
        payload.apelido = clientData.apelido?.trim() || null;
      }
      if (clientData.cep !== undefined) {
        payload.cep = clientData.cep?.trim() || null;
      }
      if (clientData.logradouro !== undefined) {
        payload.logradouro = clientData.logradouro?.trim() || null;
      } else if (clientData.address !== undefined) {
        payload.logradouro = clientData.address?.trim() || null;
      }
      if (clientData.numero !== undefined) {
        payload.numero = clientData.numero?.trim() || null;
      }
      if (clientData.complemento !== undefined) {
        payload.complemento = clientData.complemento?.trim() || null;
      }
      if (clientData.bairro !== undefined) {
        payload.bairro = clientData.bairro?.trim() || null;
      }
      if (clientData.cidade !== undefined) {
        payload.cidade = clientData.cidade?.trim() || null;
      } else if (clientData.city !== undefined) {
        payload.cidade = clientData.city?.trim() || null;
      }
      if (clientData.uf !== undefined) {
        payload.uf = clientData.uf?.trim() || null;
      } else if (clientData.state !== undefined) {
        payload.uf = clientData.state?.trim() || null;
      }
      if (clientData.notes !== undefined) {
        payload.notes = clientData.notes?.trim() || null;
      } else if (clientData.observacoes !== undefined) {
        payload.notes = clientData.observacoes?.trim() || null;
      }
      if (clientData.validated !== undefined) {
        payload.validated = Boolean(clientData.validated);
      }
      if (clientData.is_active !== undefined) {
        payload.is_active = Boolean(clientData.is_active);
      }
      if (clientData.tipo !== undefined) {
        payload.tipo = clientData.tipo?.trim() || null;
      }

      const { data, error } = await supabase
        .from('app_people')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar app_people:', error);
        throw error;
      }

      const clientObj = mapRowToClient(data);
      setClients(prev => prev.map(c => c.id === id ? clientObj : c));
      await calculateStats();

      toast.success('Cliente atualizado com sucesso!');
      ActivityLogger.log('client_updated', 'Cliente atualizado', 'system', 'success', {
        clientId: id,
        name: clientObj.name
      });

      return clientObj;
    } catch (err: any) {
      handleError(err, 'Erro ao atualizar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats, handleError]);

  // Soft delete client
  const deleteClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_people')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const deletedItem = mapRowToClient(data);
      setClients(prev => prev.filter(client => client.id !== id));
      setDeletedClients(prev => [deletedItem, ...prev]);
      await calculateStats();

      toast.success('Cliente desativado!');
      ActivityLogger.log('client_deleted', 'Cliente desativado', 'system', 'warning', {
        clientId: id,
        name: deletedItem.name
      });
    } catch (err: any) {
      handleError(err, 'Erro ao desativar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats, handleError]);

  // Restore client from trash
  const restoreClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_people')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const restoredItem = mapRowToClient(data);
      setDeletedClients(prev => prev.filter(client => client.id !== id));
      setClients(prev => [restoredItem, ...prev]);
      await calculateStats();

      toast.success('Cliente reativado com sucesso!');
      ActivityLogger.log('client_restored', 'Cliente reativado', 'system', 'success', {
        clientId: id,
        name: restoredItem.name
      });
    } catch (err: any) {
      handleError(err, 'Erro ao reativar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [calculateStats, handleError]);

  // Permanently delete client
  const permanentDeleteClient = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('app_people')
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
  }, [calculateStats, handleError]);

  // Add interaction
  const addInteraction = useCallback(async (interaction: Omit<ClientInteraction, 'id' | 'created_at' | 'updated_at'>): Promise<ClientInteraction> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_client_interactions')
        .insert([interaction])
        .select()
        .single();

      if (error) throw error;

      toast.success('Interação adicionada com sucesso!');
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
        .from('app_client_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.warn('Erro ao carregar interações do cliente:', err);
      return [];
    }
  }, []);

  // Fetch client events
  const fetchClientEvents = useCallback(async (clientId: string): Promise<ClientEvent[]> => {
    try {
      const { data, error } = await supabase
        .from('app_event_orders')
        .select(`
          id,
          client_id,
          event_id,
          created_at,
          event:app_events(
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

      return (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        event_id: item.event_id,
        relationship_type: 'participant',
        created_at: item.created_at,
        event: Array.isArray(item.event) ? item.event[0] : item.event
      }));
    } catch (err: any) {
      console.warn('Erro ao carregar eventos do cliente:', err);
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
        .from('app_client_events')
        .insert([{
          client_id: clientId,
          event_id: eventId,
          relationship_type: relationshipType,
          notes: notes
        }]);

      if (error) throw error;

      toast.success('Evento vinculado com sucesso!');
    } catch (err: any) {
      handleError(err, 'Erro ao vincular cliente ao evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Unlink client from event
  const unlinkClientFromEvent = useCallback(async (clientEventId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('app_client_events')
        .delete()
        .eq('id', clientEventId);

      if (error) throw error;

      toast.success('Evento desvinculado com sucesso!');
    } catch (err: any) {
      handleError(err, 'Erro ao desvincular cliente do evento');
      throw err;
    } finally {
      setLoading(false);
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