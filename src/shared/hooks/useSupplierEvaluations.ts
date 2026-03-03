import { useState, useCallback } from 'react';
import { supabase } from '../services/lib/supabase';
import { SupplierEvaluation, EvaluationFormData } from '../types/suppliers';

export const useSupplierEvaluations = () => {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar avaliações de um fornecedor
  const fetchEvaluationsBySupplier = useCallback(async (supplierId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_evaluations')
        .select(`
          *,
          app_events(
            id,
            name,
            event_date,
            location
          )
        `)
        .eq('supplier_id', supplierId)
        .order('evaluation_date', { ascending: false });

      if (fetchError) throw fetchError;

      setEvaluations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar todas as avaliações com filtros
  const fetchEvaluations = useCallback(async (filters?: {
    supplier_id?: string;
    event_id?: string;
    min_rating?: number;
    max_rating?: number;
    date_from?: string;
    date_to?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('app_supplier_evaluations')
        .select(`
          *,
          app_suppliers(name, trade_name),
          app_events(name, event_date, location)
        `)
        .order('evaluation_date', { ascending: false });

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      if (filters?.min_rating) {
        query = query.gte('rating', filters.min_rating);
      }

      if (filters?.max_rating) {
        query = query.lte('rating', filters.max_rating);
      }

      if (filters?.date_from) {
        query = query.gte('evaluation_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('evaluation_date', filters.date_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEvaluations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar avaliação
  const createEvaluation = useCallback(async (evaluationData: EvaluationFormData): Promise<SupplierEvaluation | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('app_supplier_evaluations')
        .insert(evaluationData)
        .select(`
          *,
          app_events(name, event_date, location)
        `)
        .single();

      if (error) throw error;

      // Atualizar lista local se estamos visualizando avaliações do mesmo fornecedor
      if (evaluations.length > 0 && evaluations[0].supplier_id === evaluationData.supplier_id) {
        await fetchEvaluationsBySupplier(evaluationData.supplier_id);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar avaliação');
      return null;
    } finally {
      setLoading(false);
    }
  }, [evaluations, fetchEvaluationsBySupplier]);

  // Atualizar avaliação
  const updateEvaluation = useCallback(async (id: string, evaluationData: Partial<EvaluationFormData>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('app_supplier_evaluations')
        .update(evaluationData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      const currentEvaluation = evaluations.find(evaluation => evaluation.id === id);
      if (currentEvaluation) {
        await fetchEvaluationsBySupplier(currentEvaluation.supplier_id);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar avaliação');
      return false;
    } finally {
      setLoading(false);
    }
  }, [evaluations, fetchEvaluationsBySupplier]);

  // Excluir avaliação
  const deleteEvaluation = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Buscar avaliação para obter supplier_id
      const { data: evaluation, error: fetchError } = await supabase
        .from('app_supplier_evaluations')
        .select('supplier_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('app_supplier_evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchEvaluationsBySupplier(evaluation.supplier_id);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir avaliação');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchEvaluationsBySupplier]);

  // Buscar estatísticas de avaliações
  const fetchEvaluationStats = useCallback(async (supplierId?: string) => {
    try {
      let query = supabase
        .from('app_supplier_evaluations')
        .select('rating, quality_rating, punctuality_rating, communication_rating, cost_benefit_rating');

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          total_evaluations: 0,
          average_rating: 0,
          average_quality: 0,
          average_punctuality: 0,
          average_communication: 0,
          average_cost_benefit: 0,
          rating_distribution: {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
          }
        };
      }

      const totalEvaluations = data.length;
      const averageRating = data.reduce((sum, e) => sum + e.rating, 0) / totalEvaluations;
      const averageQuality = data.reduce((sum, e) => sum + (e.quality_rating || 0), 0) / totalEvaluations;
      const averagePunctuality = data.reduce((sum, e) => sum + (e.punctuality_rating || 0), 0) / totalEvaluations;
      const averageCommunication = data.reduce((sum, e) => sum + (e.communication_rating || 0), 0) / totalEvaluations;
      const averageCostBenefit = data.reduce((sum, e) => sum + (e.cost_benefit_rating || 0), 0) / totalEvaluations;

      // Distribuição de ratings
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      data.forEach(evaluation => {
        const rating = Math.round(evaluation.rating);
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating as keyof typeof ratingDistribution]++;
        }
      });

      return {
        total_evaluations: totalEvaluations,
        average_rating: averageRating,
        average_quality: averageQuality,
        average_punctuality: averagePunctuality,
        average_communication: averageCommunication,
        average_cost_benefit: averageCostBenefit,
        rating_distribution: ratingDistribution
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar estatísticas de avaliações');
      return null;
    }
  }, []);

  // Buscar avaliações por evento
  const fetchEvaluationsByEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_evaluations')
        .select(`
          *,
          app_suppliers(name, trade_name)
        `)
        .eq('event_id', eventId)
        .order('evaluation_date', { ascending: false });

      if (fetchError) throw fetchError;

      setEvaluations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações do evento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar avaliações recentes
  const fetchRecentEvaluations = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_evaluations')
        .select(`
          *,
          app_suppliers(name, trade_name),
          app_events(name, event_date)
        `)
        .order('evaluation_date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setEvaluations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações recentes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar se fornecedor já foi avaliado para um evento
  const checkExistingEvaluation = useCallback(async (supplierId: string, eventId: string): Promise<SupplierEvaluation | null> => {
    try {
      const { data, error } = await supabase
        .from('app_supplier_evaluations')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar avaliação existente');
      return null;
    }
  }, []);

  return {
    evaluations,
    loading,
    error,
    fetchEvaluationsBySupplier,
    fetchEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    fetchEvaluationStats,
    fetchEvaluationsByEvent,
    fetchRecentEvaluations,
    checkExistingEvaluation
  };
};