import { useState, useCallback } from 'react';
import { supabase } from '../services/lib/supabase';
import { SupplierService, ServiceFormData } from '../types/suppliers';

export const useSupplierServices = () => {
  const [services, setServices] = useState<SupplierService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar serviços de um fornecedor
  const fetchServicesBySupplier = useCallback(async (supplierId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_services')
        .select(`
          *,
          app_events(
            id,
            name,
            event_date,
            location,
            status
          )
        `)
        .eq('supplier_id', supplierId)
        .order('service_date', { ascending: false });

      if (fetchError) throw fetchError;

      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar serviços');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar todos os serviços com filtros
  const fetchServices = useCallback(async (filters?: {
    supplier_id?: string;
    event_id?: string;
    status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    date_from?: string;
    date_to?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('app_supplier_services')
        .select(`
          *,
          app_suppliers(name, trade_name),
          app_events(name, event_date, location)
        `)
        .order('service_date', { ascending: false });

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('service_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('service_date', filters.date_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar serviços');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar serviço
  const createService = useCallback(async (serviceData: ServiceFormData): Promise<SupplierService | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('app_supplier_services')
        .insert(serviceData)
        .select(`
          *,
          app_events(name, event_date, location)
        `)
        .single();

      if (error) throw error;

      // Atualizar lista local se estamos visualizando serviços do mesmo fornecedor
      if (services.length > 0 && services[0].supplier_id === serviceData.supplier_id) {
        await fetchServicesBySupplier(serviceData.supplier_id);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar serviço');
      return null;
    } finally {
      setLoading(false);
    }
  }, [services, fetchServicesBySupplier]);

  // Atualizar serviço
  const updateService = useCallback(async (id: string, serviceData: Partial<ServiceFormData>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_supplier_services')
        .update(serviceData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      const currentService = services.find(service => service.id === id);
      if (currentService) {
        await fetchServicesBySupplier(currentService.supplier_id);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar serviço');
      return false;
    } finally {
      setLoading(false);
    }
  }, [services, fetchServicesBySupplier]);

  // Excluir serviço
  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Buscar serviço para obter supplier_id
      const { data: service, error: fetchError } = await supabase
        .from('app_supplier_services')
        .select('supplier_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('app_supplier_services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchServicesBySupplier(service.supplier_id);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir serviço');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchServicesBySupplier]);

  // Atualizar status do serviço
  const updateServiceStatus = useCallback(async (id: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_supplier_services')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      const currentService = services.find(service => service.id === id);
      if (currentService) {
        await fetchServicesBySupplier(currentService.supplier_id);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status do serviço');
      return false;
    } finally {
      setLoading(false);
    }
  }, [services, fetchServicesBySupplier]);

  // Buscar estatísticas de serviços
  const fetchServiceStats = useCallback(async (supplierId?: string) => {
    try {
      let query = supabase
        .from('app_supplier_services')
        .select('status, total_amount, service_date');

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total_services: data.length,
        pending_services: data.filter(s => s.status === 'pending').length,
        confirmed_services: data.filter(s => s.status === 'confirmed').length,
        in_progress_services: data.filter(s => s.status === 'in_progress').length,
        completed_services: data.filter(s => s.status === 'completed').length,
        cancelled_services: data.filter(s => s.status === 'cancelled').length,
        total_revenue: data.reduce((sum, s) => sum + (s.total_amount || 0), 0),
        average_service_value: data.length > 0 ? data.reduce((sum, s) => sum + (s.total_amount || 0), 0) / data.length : 0
      };

      return stats;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas de serviços');
      return null;
    }
  }, []);

  // Buscar serviços por evento
  const fetchServicesByEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_services')
        .select(`
          *,
          app_suppliers(name, trade_name, rating)
        `)
        .eq('event_id', eventId)
        .order('service_date', { ascending: true });

      if (fetchError) throw fetchError;

      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar serviços do evento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar próximos serviços
  const fetchUpcomingServices = useCallback(async (days: number = 7) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const { data, error: fetchError } = await supabase
        .from('app_supplier_services')
        .select(`
          *,
          app_suppliers(name, trade_name),
          app_events(name, event_date, location)
        `)
        .gte('service_date', today.toISOString().split('T')[0])
        .lte('service_date', futureDate.toISOString().split('T')[0])
        .in('status', ['confirmed', 'in_progress'])
        .order('service_date', { ascending: true });

      if (fetchError) throw fetchError;

      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar próximos serviços');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    services,
    loading,
    error,
    fetchServicesBySupplier,
    fetchServices,
    createService,
    updateService,
    deleteService,
    updateServiceStatus,
    fetchServiceStats,
    fetchServicesByEvent,
    fetchUpcomingServices
  };
};