import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ActivityLogger from '../utils/activityLogger';

export interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  guests: number;
  event_date: string;
  message?: string;
  status: 'new' | 'read' | 'responded' | 'unread';
  created_at: string;
  deleted_at?: string | null;
}

export const useSupabaseContacts = () => {
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    read: 0,
    responded: 0,
    thisMonth: 0,
    thisWeek: 0
  });

  // Carregar contatos do Supabase
  const loadContacts = async (includeDeleted = false) => {
    try {
      setLoading(true);
      
      ActivityLogger.logContact('supabase_fetch_start', 'Iniciando busca de contatos', 'info');
      
      let query = supabase
        .from('contact_forms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) {
        ActivityLogger.logContact('supabase_fetch_error', `Erro ao buscar contatos: ${error.message}`, 'error', {
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logContact('supabase_fetch_success', `${data?.length || 0} contatos carregados com sucesso`, 'success', {
        contactsCount: data?.length || 0
      });

      setContacts(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
      ActivityLogger.logContact('supabase_fetch_error', `Erro inesperado ao buscar contatos: ${err}`, 'error', {
        error: err.toString()
      });
      setError('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas
  const calculateStats = (contactsData: ContactForm[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const stats = {
      total: contactsData.length,
      new: contactsData.filter(c => c.status === 'new').length,
      read: contactsData.filter(c => c.status === 'read').length,
      responded: contactsData.filter(c => c.status === 'responded').length,
      thisMonth: contactsData.filter(c => new Date(c.created_at) >= startOfMonth).length,
      thisWeek: contactsData.filter(c => new Date(c.created_at) >= startOfWeek).length
    };

    setStats(stats);
  };

  // Atualizar status do contato
  const updateContactStatus = async (id: string, status: ContactForm['status']): Promise<boolean> => {
    try {
      setError(null);
      
      const contact = contacts.find(c => c.id === id);
      const contactName = contact?.name || 'Desconhecido';
      
      ActivityLogger.logContact('supabase_status_update_start', `Alterando status do contato ${contactName} para ${status}`, 'info', {
        contactId: id,
        contactName,
        newStatus: status,
        oldStatus: contact?.status
      });
      
      const { error } = await supabase
        .from('contact_forms')
        .update({ status })
        .eq('id', id);

      if (error) {
        ActivityLogger.logContact('supabase_status_update_error', `Erro ao alterar status: ${error.message}`, 'error', {
          contactId: id,
          contactName,
          status,
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logContact('supabase_status_update_success', `Status do contato ${contactName} alterado para ${status}`, 'success', {
        contactId: id,
        contactName,
        newStatus: status
      });

      // Atualizar estado local
      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, status } : contact
      ));
      
      // Recalcular estatísticas
      const updatedContacts = contacts.map(contact => 
        contact.id === id ? { ...contact, status } : contact
      );
      calculateStats(updatedContacts);
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      ActivityLogger.logContact('supabase_status_update_error', `Erro inesperado ao alterar status: ${err}`, 'error', {
        contactId: id,
        error: err.toString()
      });
      setError('Erro ao atualizar status do contato');
      return false;
    }
  };

  // Soft delete - mover para lixeira
  const softDeleteContact = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const contact = contacts.find(c => c.id === id);
      const contactName = contact?.name || 'Desconhecido';
      
      ActivityLogger.logContact('supabase_soft_delete_start', `Movendo contato ${contactName} para lixeira`, 'info', {
        contactId: id,
        contactName,
        contactEmail: contact?.email
      });
      
      const { error } = await supabase
        .from('contact_forms')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        ActivityLogger.logContact('supabase_soft_delete_error', `Erro ao mover contato para lixeira: ${error.message}`, 'error', {
          contactId: id,
          contactName,
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logContact('supabase_soft_delete_success', `Contato ${contactName} movido para lixeira`, 'success', {
        contactId: id,
        contactName
      });

      // Atualizar estado local
      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, deleted_at: new Date().toISOString() } : contact
      ));
      
      return true;
    } catch (err) {
      console.error('Erro ao mover contato para lixeira:', err);
      ActivityLogger.logContact('supabase_soft_delete_error', `Erro inesperado ao mover contato para lixeira: ${err}`, 'error', {
        contactId: id,
        error: err.toString()
      });
      setError('Erro ao mover contato para lixeira');
      return false;
    }
  };

  // Recuperar contato da lixeira
  const restoreContact = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const contact = contacts.find(c => c.id === id);
      const contactName = contact?.name || 'Desconhecido';
      
      ActivityLogger.logContact('supabase_restore_start', `Recuperando contato ${contactName} da lixeira`, 'info', {
        contactId: id,
        contactName
      });
      
      const { error } = await supabase
        .from('contact_forms')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) {
        ActivityLogger.logContact('supabase_restore_error', `Erro ao recuperar contato: ${error.message}`, 'error', {
          contactId: id,
          contactName,
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logContact('supabase_restore_success', `Contato ${contactName} recuperado da lixeira`, 'success', {
        contactId: id,
        contactName
      });

      // Atualizar estado local
      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, deleted_at: null } : contact
      ));
      
      return true;
    } catch (err) {
      console.error('Erro ao recuperar contato:', err);
      ActivityLogger.logContact('supabase_restore_error', `Erro inesperado ao recuperar contato: ${err}`, 'error', {
        contactId: id,
        error: err.toString()
      });
      setError('Erro ao recuperar contato');
      return false;
    }
  };

  // Deletar permanentemente
  const permanentDeleteContact = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const contact = contacts.find(c => c.id === id);
      const contactName = contact?.name || 'Desconhecido';
      
      ActivityLogger.logContact('supabase_permanent_delete_start', `Excluindo permanentemente contato ${contactName}`, 'info', {
        contactId: id,
        contactName,
        contactEmail: contact?.email
      });
      
      const { error } = await supabase
        .from('contact_forms')
        .delete()
        .eq('id', id);

      if (error) {
        ActivityLogger.logContact('supabase_permanent_delete_error', `Erro ao excluir permanentemente: ${error.message}`, 'error', {
          contactId: id,
          contactName,
          error: error.message
        });
        throw error;
      }

      ActivityLogger.logContact('supabase_permanent_delete_success', `Contato ${contactName} excluído permanentemente`, 'success', {
        contactId: id,
        contactName
      });

      // Remover do estado local
      setContacts(prev => prev.filter(contact => contact.id !== id));
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir permanentemente:', err);
      ActivityLogger.logContact('supabase_permanent_delete_error', `Erro inesperado ao excluir permanentemente: ${err}`, 'error', {
        contactId: id,
        error: err.toString()
      });
      setError('Erro ao excluir permanentemente');
      return false;
    }
  };

  // Filtrar contatos por status
  const getContactsByStatus = (status?: ContactForm['status']) => {
    if (!status) return contacts;
    return contacts.filter(contact => contact.status === status);
  };

  // Buscar contatos por texto
  const searchContacts = (searchTerm: string) => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(term) ||
      contact.email.toLowerCase().includes(term) ||
      contact.phone.includes(term) ||
      contact.event_type.toLowerCase().includes(term)
    );
  };

  // Configurar real-time subscription
  useEffect(() => {
    // Carregar dados iniciais (incluindo deletados para gerenciar estado completo)
    loadContacts(true);

    // Configurar subscription para mudanças em tempo real
    const subscription = supabase
      .channel('contact_forms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_forms'
        },
        (payload) => {
          console.log('Mudança detectada:', payload);
          
          if (payload.eventType === 'INSERT') {
            setContacts(prev => [payload.new as ContactForm, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setContacts(prev => prev.map(contact => 
              contact.id === payload.new.id ? payload.new as ContactForm : contact
            ));
          } else if (payload.eventType === 'DELETE') {
            setContacts(prev => prev.filter(contact => contact.id !== payload.old.id));
          }
          
          // Recalcular estatísticas após mudanças
          loadContacts(true);
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    contacts,
    loading,
    error,
    stats,
    loadContacts,
    updateContactStatus,
    softDeleteContact,
    restoreContact,
    permanentDeleteContact,
    getContactsByStatus,
    searchContacts
  };
};

export default useSupabaseContacts;