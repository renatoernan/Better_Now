import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import type { 
  Testimonial as BaseTestimonial, 
  TestimonialFormData,
  PaginationParams, 
  UseAsyncState,
  ApiResponse,
  PaginatedResponse 
} from '../../types';

export interface LocalTestimonial extends BaseTestimonial {
  whatsapp: string;
  approved_at?: string;
  approved_by?: string;
}

export interface LocalTestimonialFormData {
  name: string;
  whatsapp: string;
  event_type: string;
  testimonial_text: string;
}

// Hook return type
interface UseSupabaseTestimonialsReturn extends UseAsyncState<LocalTestimonial[]> {
  testimonials: LocalTestimonial[];
  approvedTestimonials: LocalTestimonial[];
  pendingTestimonials: LocalTestimonial[];
  deletedTestimonials: LocalTestimonial[];
  featuredTestimonials: LocalTestimonial[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Actions
  fetchAllTestimonials: (pagination?: PaginationParams) => Promise<void>;
  fetchApprovedTestimonials: (pagination?: PaginationParams) => Promise<void>;
  fetchPendingTestimonials: (pagination?: PaginationParams) => Promise<void>;
  fetchDeletedTestimonials: () => Promise<void>;
  createTestimonial: (testimonialData: LocalTestimonialFormData) => Promise<LocalTestimonial>;
  updateTestimonial: (id: string, testimonialData: Partial<LocalTestimonialFormData>) => Promise<LocalTestimonial>;
  approveTestimonial: (id: string, isFeatured?: boolean) => Promise<void>;
  rejectTestimonial: (id: string, reason?: string) => Promise<void>;
  deleteTestimonial: (id: string) => Promise<void>;
  restoreTestimonial: (id: string) => Promise<void>;
  permanentDeleteTestimonial: (id: string) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  
  // Utility functions
  getTestimonialById: (id: string) => LocalTestimonial | undefined;
  getTestimonialsByStatus: (status: 'pending' | 'approved' | 'rejected') => LocalTestimonial[];
  searchTestimonials: (query: string) => LocalTestimonial[];
  clearError: () => void;
}

export const useSupabaseTestimonials = (): UseSupabaseTestimonialsReturn => {
  const [testimonials, setTestimonials] = useState<LocalTestimonial[]>([]);
  const [approvedTestimonials, setApprovedTestimonials] = useState<LocalTestimonial[]>([]);
  const [pendingTestimonials, setPendingTestimonials] = useState<LocalTestimonial[]>([]);
  const [deletedTestimonials, setDeletedTestimonials] = useState<LocalTestimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Memoized computed values
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);
  const featuredTestimonials = useMemo(() => 
    approvedTestimonials.filter(t => t.is_featured), 
    [approvedTestimonials]
  );

  // Utility functions
  const getTestimonialById = useCallback((id: string) => {
    return testimonials.find(testimonial => testimonial.id === id);
  }, [testimonials]);

  const getTestimonialsByStatus = useCallback((status: 'pending' | 'approved' | 'rejected') => {
    return testimonials.filter(testimonial => testimonial.status === status);
  }, [testimonials]);

  const searchTestimonials = useCallback((query: string) => {
    const searchTerm = query.toLowerCase();
    return testimonials.filter(testimonial => 
      testimonial.name.toLowerCase().includes(searchTerm) ||
      testimonial.testimonial_text.toLowerCase().includes(searchTerm) ||
      testimonial.event_type.toLowerCase().includes(searchTerm)
    );
  }, [testimonials]);

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

  // Fetch all testimonials (for admin)
  const fetchAllTestimonials = useCallback(async (pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setTestimonials(data || []);
      setPendingTestimonials(data?.filter(t => t.status === 'pending') || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
      setTotalPages(Math.ceil((count || 0) / limit));

      ActivityLogger.log('testimonials_loaded', 'Depoimentos carregados com sucesso', 'system', 'info', {
        count: data?.length || 0
      });
    } catch (err: any) {
      handleError(err, 'Erro ao buscar depoimentos');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch approved testimonials (for public page)
  const fetchApprovedTestimonials = useCallback(async (pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setApprovedTestimonials(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
      setTotalPages(Math.ceil((count || 0) / limit));

      ActivityLogger.log('approved_testimonials_loaded', 'Depoimentos aprovados carregados', 'system', 'info', {
        count: data?.length || 0
      });
    } catch (err: any) {
      handleError(err, 'Erro ao buscar depoimentos aprovados');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch pending testimonials
  const fetchPendingTestimonials = useCallback(async (pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setPendingTestimonials(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
      setTotalPages(Math.ceil((count || 0) / limit));

      ActivityLogger.log('pending_testimonials_loaded', 'Depoimentos pendentes carregados', 'system', 'info', {
        count: data?.length || 0
      });
    } catch (err: any) {
      handleError(err, 'Erro ao buscar depoimentos pendentes');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch deleted testimonials
  const fetchDeletedTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedTestimonials(data || []);
    } catch (err: any) {
      handleError(err, 'Erro ao buscar depoimentos deletados');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create testimonial
  const createTestimonial = useCallback(async (testimonialData: LocalTestimonialFormData): Promise<LocalTestimonial> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .insert([
          {
            ...testimonialData,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setPendingTestimonials(prev => [data, ...prev]);
      setTestimonials(prev => [data, ...prev]);

      toast.success('Depoimento enviado com sucesso! Aguarde a aprovação.');
      ActivityLogger.log('testimonial_created', 'Novo depoimento criado', 'system', 'success', {
        testimonialId: data.id,
        name: data.name
      });

      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao enviar depoimento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Update testimonial
  const updateTestimonial = useCallback(async (id: string, testimonialData: Partial<LocalTestimonialFormData>): Promise<LocalTestimonial> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .update({
          ...testimonialData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestimonials(prev => prev.map(t => t.id === id ? data : t));
      setApprovedTestimonials(prev => prev.map(t => t.id === id ? data : t));
      setPendingTestimonials(prev => prev.map(t => t.id === id ? data : t));

      toast.success('Depoimento atualizado com sucesso!');
      ActivityLogger.log('testimonial_updated', 'Depoimento atualizado', 'system', 'success', {
        testimonialId: id,
        name: data.name
      });

      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao atualizar depoimento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Approve testimonial
  const approveTestimonial = useCallback(async (id: string, isFeatured: boolean = false): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('testimonials')
        .update({
          status: 'approved',
          is_featured: isFeatured,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestimonials(prev => prev.map(t => t.id === id ? data : t));
      setPendingTestimonials(prev => prev.filter(t => t.id !== id));
      setApprovedTestimonials(prev => [data, ...prev]);

      toast.success('Depoimento aprovado com sucesso!');
      ActivityLogger.log('testimonial_approved', 'Depoimento aprovado', 'system', 'success', {
        testimonialId: id,
        isFeatured
      });
    } catch (err: any) {
      handleError(err, 'Erro ao aprovar depoimento');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Reject testimonial
  const rejectTestimonial = useCallback(async (id: string, reason?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('testimonials')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestimonials(prev => prev.map(t => t.id === id ? data : t));
      setPendingTestimonials(prev => prev.filter(t => t.id !== id));

      toast.success('Depoimento rejeitado!');
      ActivityLogger.log('testimonial_rejected', 'Depoimento rejeitado', 'system', 'warning', {
        testimonialId: id,
        reason
      });
    } catch (err: any) {
      handleError(err, 'Erro ao rejeitar depoimento');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Soft delete testimonial
  const deleteTestimonial = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestimonials(prev => prev.filter(t => t.id !== id));
      setApprovedTestimonials(prev => prev.filter(t => t.id !== id));
      setPendingTestimonials(prev => prev.filter(t => t.id !== id));
      setDeletedTestimonials(prev => [data, ...prev]);

      toast.success('Depoimento movido para a lixeira!');
      ActivityLogger.log('testimonial_deleted', 'Depoimento movido para lixeira', 'system', 'warning', {
        testimonialId: id
      });
    } catch (err: any) {
      handleError(err, 'Erro ao mover depoimento para lixeira');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Restore testimonial from trash
  const restoreTestimonial = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setDeletedTestimonials(prev => prev.filter(t => t.id !== id));
      setTestimonials(prev => [data, ...prev]);
      
      if (data.status === 'approved') {
        setApprovedTestimonials(prev => [data, ...prev]);
      } else if (data.status === 'pending') {
        setPendingTestimonials(prev => [data, ...prev]);
      }

      toast.success('Depoimento restaurado com sucesso!');
      ActivityLogger.log('testimonial_restored', 'Depoimento restaurado', 'system', 'success', {
        testimonialId: id
      });
    } catch (err: any) {
      handleError(err, 'Erro ao restaurar depoimento');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Permanently delete testimonial
  const permanentDeleteTestimonial = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDeletedTestimonials(prev => prev.filter(t => t.id !== id));

      toast.success('Depoimento excluído permanentemente!');
      ActivityLogger.log('testimonial_permanently_deleted', 'Depoimento excluído permanentemente', 'system', 'error', {
        testimonialId: id
      });
    } catch (err: any) {
      handleError(err, 'Erro ao excluir depoimento permanentemente');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Toggle featured status
  const toggleFeatured = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const testimonial = getTestimonialById(id);
      if (!testimonial) throw new Error('Depoimento não encontrado');

      const { data, error } = await supabase
        .from('testimonials')
        .update({
          is_featured: !testimonial.is_featured,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTestimonials(prev => prev.map(t => t.id === id ? data : t));
      setApprovedTestimonials(prev => prev.map(t => t.id === id ? data : t));

      toast.success(data.is_featured ? 'Depoimento destacado!' : 'Destaque removido!');
      ActivityLogger.log('testimonial_featured_toggled', 'Status de destaque alterado', 'system', 'info', {
        testimonialId: id,
        isFeatured: !testimonial.is_featured
      });
    } catch (err: any) {
      handleError(err, 'Erro ao alterar status de destaque');
    } finally {
      setLoading(false);
    }
  }, [handleError, getTestimonialById]);

  // Refetch function for UseAsyncState compatibility
  const refetch = useCallback(async () => {
    await fetchAllTestimonials();
  }, [fetchAllTestimonials]);

  return {
    // Data
    data: testimonials,
    testimonials,
    approvedTestimonials,
    pendingTestimonials,
    deletedTestimonials,
    featuredTestimonials,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // State
    loading,
    error,
    
    // Actions
    fetchAllTestimonials,
    fetchApprovedTestimonials,
    fetchPendingTestimonials,
    fetchDeletedTestimonials,
    createTestimonial,
    updateTestimonial,
    approveTestimonial,
    rejectTestimonial,
    deleteTestimonial,
    restoreTestimonial,
    permanentDeleteTestimonial,
    toggleFeatured,
    refetch,
    
    // Utility functions
    getTestimonialById,
    getTestimonialsByStatus,
    searchTestimonials,
    clearError,
  };
};