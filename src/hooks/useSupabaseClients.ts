import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLogger } from '../utils/activityLogger';
import { toast } from 'sonner';
import { 
  exportClientsToCSV, 
  exportInteractionsToCSV, 
  exportClientsSummaryToCSV,
  prepareClientsForExport,
  ExportOptions 
} from '../utils/exportUtils';

export interface Client {
  id: string;
  name: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ClientInteraction {
  id: string;
  client_id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'event' | 'note';
  description: string;
  interaction_date: string;
  created_by?: string;
  created_at: string;
}

export interface ClientFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hasWhatsApp?: boolean;
  hasEmail?: boolean;
}

export interface ClientStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  withWhatsApp: number;
  withEmail: number;
}

export const useSupabaseClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    withWhatsApp: 0,
    withEmail: 0
  });

  // Carregar clientes com filtros e paginação
  const loadClients = async (filters?: ClientFilters, page = 1, limit = 50, includeDeleted = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrar por soft delete
      if (includeDeleted) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      // Aplicar filtros
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.hasWhatsApp) {
        query = query.not('whatsapp', 'is', null);
      }

      if (filters?.hasEmail) {
        query = query.not('email', 'is', null);
      }

      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setClients(data || []);
      await calculateStats();
      
      ActivityLogger.log('clients_loaded', 'Clientes carregados com sucesso', {
        count: data?.length || 0,
        filters
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar clientes';
      setError(errorMessage);
      toast.error(errorMessage);
      ActivityLogger.log('clients_load_error', 'Erro ao carregar clientes', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas
  const calculateStats = async () => {
    try {
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, created_at, whatsapp, email')
        .is('deleted_at', null);

      if (!allClients) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

      const newStats: ClientStats = {
        total: allClients.length,
        thisMonth: allClients.filter(c => new Date(c.created_at) >= startOfMonth).length,
        thisWeek: allClients.filter(c => new Date(c.created_at) >= startOfWeek).length,
        withWhatsApp: allClients.filter(c => c.whatsapp).length,
        withEmail: allClients.filter(c => c.email).length
      };

      setStats(newStats);
    } catch (err) {
      console.error('Erro ao calcular estatísticas:', err);
    }
  };

  // Adicionar novo cliente
  const addClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setClients(prev => [data, ...prev]);
      await calculateStats();
      
      toast.success('Cliente adicionado com sucesso!');
      ActivityLogger.log('client_added', 'Novo cliente adicionado', {
        clientId: data.id,
        name: data.name
      });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao adicionar cliente';
      toast.error(errorMessage);
      ActivityLogger.log('client_add_error', 'Erro ao adicionar cliente', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Atualizar cliente
  const updateClient = async (id: string, updates: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setClients(prev => prev.map(client => 
        client.id === id ? data : client
      ));
      
      toast.success('Cliente atualizado com sucesso!');
      ActivityLogger.log('client_updated', 'Cliente atualizado', {
        clientId: id,
        updates
      });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar cliente';
      toast.error(errorMessage);
      ActivityLogger.log('client_update_error', 'Erro ao atualizar cliente', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Soft delete cliente
  const deleteClient = async (id: string) => {
    try {
      const { data, error: deleteError } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (deleteError) {
        throw deleteError;
      }

      setClients(prev => prev.filter(client => client.id !== id));
      await calculateStats();
      
      toast.success('Cliente movido para a lixeira!');
      ActivityLogger.log('client_soft_deleted', 'Cliente movido para lixeira', { clientId: id });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao excluir cliente';
      toast.error(errorMessage);
      ActivityLogger.log('client_delete_error', 'Erro ao excluir cliente', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Recuperar cliente da lixeira
  const restoreClient = async (id: string) => {
    try {
      const { data, error: restoreError } = await supabase
        .from('clients')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (restoreError) {
        throw restoreError;
      }

      toast.success('Cliente recuperado com sucesso!');
      ActivityLogger.log('client_restored', 'Cliente recuperado da lixeira', { clientId: id });

      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao recuperar cliente';
      toast.error(errorMessage);
      ActivityLogger.log('client_restore_error', 'Erro ao recuperar cliente', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Excluir cliente permanentemente
  const permanentDeleteClient = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('Cliente excluído permanentemente!');
      ActivityLogger.log('client_permanent_deleted', 'Cliente excluído permanentemente', { clientId: id });

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao excluir cliente permanentemente';
      toast.error(errorMessage);
      ActivityLogger.log('client_permanent_delete_error', 'Erro ao excluir cliente permanentemente', { error: err.message });
      return { success: false, error: errorMessage };
    }
  };

  // Carregar clientes da lixeira
  const loadDeletedClients = async (): Promise<Client[]> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err: any) {
      console.error('Erro ao carregar clientes excluídos:', err);
      toast.error('Erro ao carregar clientes excluídos');
      return [];
    }
  };

  // Buscar cliente por ID
  const getClientById = async (id: string, includeDeleted = false): Promise<Client | null> => {
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('id', id);

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Erro ao buscar cliente:', err);
      return null;
    }
  };

  // Exportar dados para CSV
  const exportToCSV = (filteredClients?: Client[]) => {
    const dataToExport = filteredClients || clients;
    
    const headers = ['Nome', 'Telefone', 'WhatsApp', 'Email', 'CEP', 'Logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Observações', 'Data de Cadastro'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(client => [
        `"${client.name}"`,
        `"${client.phone || ''}"`,
        `"${client.whatsapp || ''}"`,
        `"${client.email || ''}"`,
        `"${client.cep || ''}"`,
        `"${client.logradouro || ''}"`,
        `"${client.numero || ''}"`,
        `"${client.complemento || ''}"`,
        `"${client.bairro || ''}"`,
        `"${client.cidade || ''}"`,
        `"${client.uf || ''}"`,
        `"${client.notes || ''}"`,
        `"${new Date(client.created_at).toLocaleDateString('pt-BR')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Dados exportados com sucesso!');
    ActivityLogger.log('clients_exported', 'Dados de clientes exportados', {
      count: dataToExport.length
    });
  };

  // Configurar real-time subscription
  useEffect(() => {
    loadClients();

    const subscription = supabase
      .channel('clients_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients'
      }, (payload) => {
        console.log('Mudança em tempo real nos clientes:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newClient = payload.new as Client;
          // Só adiciona se não estiver soft deleted
          if (!newClient.deleted_at) {
            setClients(prev => [newClient, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedClient = payload.new as Client;
          const oldClient = payload.old as Client;
          
          if (updatedClient.deleted_at) {
            // Se foi soft deleted, remove da lista ativa
            setClients(prev => prev.filter(client => client.id !== updatedClient.id));
            // Notificar que há mudanças na lixeira (pode ser usado para recarregar)
            console.log('Cliente movido para lixeira:', updatedClient.id);
          } else if (oldClient.deleted_at && !updatedClient.deleted_at) {
            // Se foi restaurado da lixeira (tinha deleted_at e agora não tem), adiciona de volta à lista ativa
            setClients(prev => {
              // Verifica se já não está na lista para evitar duplicatas
              const exists = prev.some(client => client.id === updatedClient.id);
              if (!exists) {
                return [updatedClient, ...prev];
              }
              return prev;
            });
            console.log('Cliente restaurado da lixeira:', updatedClient.id);
          } else {
            // Se não foi soft deleted, atualiza normalmente
            setClients(prev => prev.map(client => 
              client.id === updatedClient.id ? updatedClient : client
            ));
          }
        } else if (payload.eventType === 'DELETE') {
          setClients(prev => prev.filter(client => client.id !== payload.old.id));
        }
        
        calculateStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Funções de exportação
  const exportClients = (options?: ExportOptions) => {
    try {
      const clientsToExport = prepareClientsForExport(clients, true);
      exportClientsToCSV(clientsToExport, options);
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const exportFilteredClients = (filteredClients: Client[], options?: ExportOptions) => {
    try {
      const clientsToExport = prepareClientsForExport(filteredClients, true);
      exportClientsToCSV(clientsToExport, {
        ...options,
        filename: options?.filename || `clientes_filtrados_${new Date().toISOString().split('T')[0]}.csv`
      });
      toast.success('Dados filtrados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar clientes filtrados:', error);
      toast.error('Erro ao exportar dados filtrados');
    }
  };

  const exportSummary = (options?: ExportOptions) => {
    try {
      exportClientsSummaryToCSV(clients, options);
      toast.success('Resumo exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar resumo:', error);
      toast.error('Erro ao exportar resumo');
    }
  };

  // Função de busca de clientes
  const searchClients = async (searchTerm: string, filters: any) => {
    const clientFilters: ClientFilters = {
      search: searchTerm,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      hasWhatsApp: filters.hasWhatsapp === 'true' ? true : filters.hasWhatsapp === 'false' ? false : undefined,
      hasEmail: filters.hasEmail === 'true' ? true : filters.hasEmail === 'false' ? false : undefined
    };
    
    await loadClients(clientFilters);
  };

  return {
    clients,
    loading,
    error,
    stats,
    loadClients,
    addClient,
    updateClient,
    deleteClient,
    restoreClient,
    permanentDeleteClient,
    loadDeletedClients,
    getClientById,
    exportToCSV,
    calculateStats,
    exportClients,
    exportFilteredClients,
    exportSummary,
    searchClients
  };
};