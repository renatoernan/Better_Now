import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/lib/supabase';
import { 
  Supplier, 
  SupplierWithCategories, 
  SupplierWithDetails,
  SupplierFormData, 
  SupplierSearchParams,
  SupplierStats,
  SupplierApiResponse,
  SupplierPagination
} from '../types/suppliers';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<SupplierWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os fornecedores
  const fetchSuppliers = useCallback(async (params?: SupplierSearchParams) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('app_suppliers')
        .select(`
          *,
          supplier_category_relations(
            is_primary,
            app_supplier_categories(id, name, color, icon)
          )
        `)
        .is('deleted_at', null);

      // Aplicar filtros
      if (params?.filters) {
        const { filters } = params;
        
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        
        if (filters.city) {
          query = query.eq('city', filters.city);
        }
        
        if (filters.state) {
          query = query.eq('state', filters.state);
        }
        
        if (filters.min_rating) {
          query = query.gte('rating', filters.min_rating);
        }
      }

      // Aplicar busca textual
      if (params?.query) {
        query = query.or(`name.ilike.%${params.query}%,trade_name.ilike.%${params.query}%,services_description.ilike.%${params.query}%`);
      }

      // Aplicar ordenação
      const sortBy = params?.sort_by || 'created_at';
      const sortOrder = params?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginação
      if (params?.page && params?.limit) {
        const from = (params.page - 1) * params.limit;
        const to = from + params.limit - 1;
        query = query.range(from, to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSuppliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar fornecedores');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar fornecedor por ID
  const fetchSupplierById = useCallback(async (id: string): Promise<SupplierWithDetails | null> => {
    try {
      const { data, error } = await supabase
        .from('app_suppliers')
        .select(`
          *,
          supplier_category_relations(
            is_primary,
            app_supplier_categories(*)
          ),
          app_supplier_documents(*),
          app_supplier_services(
            *,
            app_events(name, event_date)
          ),
          app_supplier_evaluations(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar fornecedor');
      return null;
    }
  }, []);

  // Criar fornecedor
  const createSupplier = useCallback(async (supplierData: SupplierFormData): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);

    try {
      const { categories, primary_category, ...supplierFields } = supplierData;

      // Criar fornecedor
      const { data: supplier, error: supplierError } = await supabase
        .from('app_suppliers')
        .insert(supplierFields)
        .select()
        .single();

      if (supplierError) throw supplierError;

      // Associar categorias se fornecidas
      if (categories && categories.length > 0) {
        const categoryRelations = categories.map(categoryId => ({
          supplier_id: supplier.id,
          category_id: categoryId,
          is_primary: categoryId === primary_category
        }));

        const { error: relationError } = await supabase
          .from('supplier_category_relations')
          .insert(categoryRelations);

        if (relationError) throw relationError;
      }

      // Atualizar lista local
      await fetchSuppliers();

      return supplier;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fornecedor');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  // Atualizar fornecedor
  const updateSupplier = useCallback(async (id: string, supplierData: Partial<SupplierFormData>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { categories, primary_category, ...supplierFields } = supplierData;

      // Atualizar dados do fornecedor
      const { error: supplierError } = await supabase
        .from('app_suppliers')
        .update(supplierFields)
        .eq('id', id);

      if (supplierError) throw supplierError;

      // Atualizar categorias se fornecidas
      if (categories !== undefined) {
        // Remover relações existentes
        await supabase
          .from('supplier_category_relations')
          .delete()
          .eq('supplier_id', id);

        // Adicionar novas relações
        if (categories.length > 0) {
          const categoryRelations = categories.map(categoryId => ({
            supplier_id: id,
            category_id: categoryId,
            is_primary: categoryId === primary_category
          }));

          const { error: relationError } = await supabase
            .from('supplier_category_relations')
            .insert(categoryRelations);

          if (relationError) throw relationError;
        }
      }

      // Atualizar lista local
      await fetchSuppliers();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar fornecedor');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  // Excluir fornecedor (soft delete)
  const deleteSupplier = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_suppliers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchSuppliers();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir fornecedor');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  // Alterar status do fornecedor
  const updateSupplierStatus = useCallback(async (id: string, status: 'active' | 'inactive' | 'blocked'): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_suppliers')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchSuppliers();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status do fornecedor');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  // Buscar estatísticas dos fornecedores
  const fetchSupplierStats = useCallback(async (): Promise<SupplierStats | null> => {
    try {
      // Buscar contadores básicos
      const { data: statsData, error: statsError } = await supabase
        .from('app_suppliers')
        .select('status, rating')
        .is('deleted_at', null);

      if (statsError) throw statsError;

      // Buscar fornecedores por categoria
      const { data: categoryData, error: categoryError } = await supabase
        .from('supplier_category_relations')
        .select(`
          app_supplier_categories(name, color),
          suppliers!inner(id)
        `)
        .eq('suppliers.deleted_at', null);

      if (categoryError) throw categoryError;

      // Buscar fornecedores recentes
      const { data: recentData, error: recentError } = await supabase
        .from('app_suppliers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Buscar fornecedores mais bem avaliados
      const { data: topRatedData, error: topRatedError } = await supabase
        .from('app_suppliers')
        .select('*')
        .is('deleted_at', null)
        .gt('rating', 0)
        .order('rating', { ascending: false })
        .limit(5);

      if (topRatedError) throw topRatedError;

      // Buscar documentos próximos ao vencimento
      const { data: expiringDocs, error: expiringError } = await supabase
        .from('app_supplier_documents')
        .select(`
          title,
          expiry_date,
          app_suppliers(name)
        `)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (expiringError) throw expiringError;

      // Calcular estatísticas
      const totalSuppliers = statsData.length;
      const activeSuppliers = statsData.filter(s => s.status === 'active').length;
      const inactiveSuppliers = statsData.filter(s => s.status === 'inactive').length;
      const blockedSuppliers = statsData.filter(s => s.status === 'blocked').length;
      const averageRating = statsData.reduce((sum, s) => sum + (s.rating || 0), 0) / totalSuppliers;

      // Agrupar por categoria
      const categoryMap = new Map();
      categoryData.forEach(item => {
        const categoryName = item.supplier_categories.name;
        const categoryColor = item.supplier_categories.color;
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            ...categoryMap.get(categoryName),
            count: categoryMap.get(categoryName).count + 1
          });
        } else {
          categoryMap.set(categoryName, {
            category_name: categoryName,
            category_color: categoryColor,
            count: 1
          });
        }
      });

      const suppliersByCategory = Array.from(categoryMap.values());

      // Processar documentos expirando
      const expiringDocuments = expiringDocs.map(doc => {
        const expiryDate = new Date(doc.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          supplier_name: doc.suppliers.name,
          document_title: doc.title,
          expiry_date: doc.expiry_date,
          days_until_expiry: daysUntilExpiry
        };
      });

      return {
        total_suppliers: totalSuppliers,
        active_suppliers: activeSuppliers,
        inactive_suppliers: inactiveSuppliers,
        blocked_suppliers: blockedSuppliers,
        total_categories: suppliersByCategory.length,
        total_services: 0, // TODO: Implementar contagem de serviços
        average_rating: averageRating,
        suppliers_by_category: suppliersByCategory,
        recent_suppliers: recentData || [],
        top_rated_suppliers: topRatedData || [],
        expiring_documents: expiringDocuments
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas');
      return null;
    }
  }, []);

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    fetchSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    updateSupplierStatus,
    fetchSupplierStats
  };
};