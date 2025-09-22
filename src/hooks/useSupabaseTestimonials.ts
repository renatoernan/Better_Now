import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface Testimonial {
  id: string;
  name: string;
  whatsapp: string;
  event_type: string;
  testimonial_text: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  deleted_at?: string;
}

export interface TestimonialFormData {
  name: string;
  whatsapp: string;
  event_type: string;
  testimonial_text: string;
}

export const useSupabaseTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [approvedTestimonials, setApprovedTestimonials] = useState<Testimonial[]>([]);
  const [pendingTestimonials, setPendingTestimonials] = useState<Testimonial[]>([]);
  const [deletedTestimonials, setDeletedTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os depoimentos ativos (para admin)
  const fetchAllTestimonials = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTestimonials(data || []);
      setPendingTestimonials(data?.filter(t => t.status === 'pending') || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar depoimentos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Buscar depoimentos deletados (lixeira)
  const fetchDeletedTestimonials = async () => {
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar depoimentos deletados';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Buscar apenas depoimentos aprovados e não deletados (para página pública)
  const fetchApprovedTestimonials = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApprovedTestimonials(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar depoimentos aprovados';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Criar novo depoimento
  const createTestimonial = async (testimonialData: TestimonialFormData) => {
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

      toast.success('Depoimento enviado com sucesso! Aguarde a aprovação.');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar depoimento';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar depoimento existente
  const updateTestimonial = async (id: string, testimonialData: TestimonialFormData) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .update({
          ...testimonialData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento atualizado com sucesso!');
      await fetchAllTestimonials();
      await fetchApprovedTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar depoimento';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Aprovar depoimento
  const approveTestimonial = async (id: string, isFeatured: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('testimonials')
        .update({
          status: 'approved',
          is_featured: isFeatured,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento aprovado com sucesso!');
      await fetchAllTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aprovar depoimento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Rejeitar depoimento
  const rejectTestimonial = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento rejeitado.');
      await fetchAllTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao rejeitar depoimento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Soft delete - mover para lixeira
  const softDeleteTestimonial = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento movido para a lixeira!');
      await fetchAllTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao mover depoimento para lixeira';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Restaurar depoimento da lixeira
  const restoreTestimonial = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento restaurado com sucesso!');
      await fetchDeletedTestimonials();
      await fetchAllTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao restaurar depoimento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Hard delete - exclusão permanente
  const hardDeleteTestimonial = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Depoimento excluído permanentemente!');
      await fetchDeletedTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir depoimento permanentemente';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Alternar destaque do depoimento
  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('testimonials')
        .update({ is_featured: isFeatured })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Depoimento ${isFeatured ? 'destacado' : 'removido do destaque'}!`);
      await fetchAllTestimonials();
      await fetchApprovedTestimonials();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar destaque';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Buscar depoimentos aprovados automaticamente na inicialização
  useEffect(() => {
    fetchApprovedTestimonials();
  }, []);

  return {
    // Estados
    testimonials,
    approvedTestimonials,
    pendingTestimonials,
    deletedTestimonials,
    loading,
    error,
    
    // Funções
    fetchAllTestimonials,
    fetchApprovedTestimonials,
    fetchDeletedTestimonials,
    createTestimonial,
    updateTestimonial,
    approveTestimonial,
    rejectTestimonial,
    softDeleteTestimonial,
    restoreTestimonial,
    hardDeleteTestimonial,
    toggleFeatured
  };
};