import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/lib/supabase';
import { SupplierCategory, CategoryFormData } from '../types/suppliers';

export const useSupplierCategories = () => {
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as categorias
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_categories')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar categoria por ID
  const fetchCategoryById = useCallback(async (id: string): Promise<SupplierCategory | null> => {
    try {
      const { data, error } = await supabase
        .from('app_supplier_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar categoria');
      return null;
    }
  }, []);

  // Criar categoria
  const createCategory = useCallback(async (categoryData: CategoryFormData): Promise<SupplierCategory | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('app_supplier_categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista local
      await fetchCategories();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Atualizar categoria
  const updateCategory = useCallback(async (id: string, categoryData: Partial<CategoryFormData>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_supplier_categories')
        .update(categoryData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchCategories();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Excluir categoria
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Verificar se a categoria está sendo usada
      const { data: relations, error: checkError } = await supabase
        .from('supplier_category_relations')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (relations && relations.length > 0) {
        throw new Error('Não é possível excluir uma categoria que está sendo utilizada por fornecedores');
      }

      const { error } = await supabase
        .from('app_supplier_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchCategories();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir categoria');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Buscar categorias com contagem de fornecedores
  const fetchCategoriesWithCounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_categories')
        .select(`
          *,
          supplier_category_relations(
            supplier_id,
            app_suppliers!inner(id, deleted_at)
          )
        `)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      // Processar dados para incluir contagem (apenas fornecedores não deletados)
      const dataWithCount = (data || []).map(category => ({
        ...category,
        supplier_count: (category as any).supplier_category_relations?.filter(
          (relation: any) => relation.app_suppliers?.deleted_at === null
        ).length || 0
      }));

      setCategoriesWithCounts(dataWithCount);
      setCategories(dataWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar categorias com contagem');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar fornecedores por categoria
  const fetchSuppliersByCategory = useCallback(async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('supplier_category_relations')
        .select(`
          is_primary,
          app_suppliers(
            id,
            name,
            trade_name,
            status,
            rating,
            city,
            state
          )
        `)
        .eq('category_id', categoryId)
        .eq('suppliers.deleted_at', null);

      if (error) throw error;

      return data?.map(relation => ({
        ...(relation as any).app_suppliers,
        is_primary_category: relation.is_primary
      })) || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar fornecedores da categoria');
      return [];
    }
  }, []);

  // Carregar categorias automaticamente
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    fetchCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchCategoriesWithCounts,
    fetchSuppliersByCategory
  };
};