import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  event_date: string;
  event_time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  max_guests?: number;
  current_guests: number;
  price_batches?: any[];
  status: 'active' | 'cancelled' | 'completed' | 'draft';
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string; // Campo para soft delete
  // Novos campos adicionados
  image_url?: string;
  gallery_urls?: string[];
  videos?: string[]; // Array de URLs dos vídeos
  registration_deadline?: string;
  requires_approval?: boolean;
  is_public?: boolean;
  category?: string;
  tags?: string[];
  contact_email?: string;
  contact_phone?: string;
  additional_info?: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  client_id?: string;
  participant_name: string;
  participant_email?: string;
  participant_phone?: string;
  guests_count: number;
  registration_date: string;
  status: 'confirmed' | 'cancelled' | 'pending' | 'attended';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Novos campos para check-in
  checked_in_at?: string;
  checked_in_by?: string;
}

export interface ClientEvent {
  id: string;
  client_id: string;
  event_id: string;
  relationship_type: 'participant' | 'organizer' | 'vendor' | 'guest';
  notes?: string;
  created_at: string;
  event?: Event;
}

export interface EventPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  caption?: string;
  uploaded_by?: string;
  is_cover?: boolean;
  created_at: string;
}

export interface EventNotification {
  id: string;
  event_id: string;
  participant_id?: string;
  notification_type: 'reminder' | 'confirmation' | 'cancellation' | 'update' | 'checkin';
  title: string;
  message: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface EventFilters {
  status?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
}

export const useSupabaseEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [clientEvents, setClientEvents] = useState<ClientEvent[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [eventNotifications, setEventNotifications] = useState<EventNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar eventos ativos (não deletados)
  const fetchEvents = async (filters?: EventFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters?.date_from) {
        query = query.gte('event_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('event_date', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  // Buscar eventos deletados (lixeira)
  const fetchDeletedEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedEvents(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar eventos da lixeira');
    } finally {
      setLoading(false);
    }
  };

  // Buscar participantes de um evento
  const fetchEventParticipants = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  // Buscar eventos de um cliente
  const fetchClientEvents = async (clientId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_events')
        .select(`
          *,
          event:events(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientEvents(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar eventos do cliente');
    } finally {
      setLoading(false);
    }
  };

  // Criar evento
  const createEvent = async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_guests'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      
      setEvents(prev => [data, ...prev]);
      toast.success('Evento criado com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar evento
  const updateEvent = async (id: string, eventData: Partial<Event>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setEvents(prev => prev.map(event => event.id === id ? data : event));
      toast.success('Evento atualizado com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Soft delete evento
  const deleteEvent = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setEvents(prev => prev.filter(event => event.id !== id));
      setDeletedEvents(prev => [data, ...prev]);
      toast.success('Evento movido para a lixeira!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao mover evento para lixeira');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Restaurar evento da lixeira
  const restoreEvent = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setDeletedEvents(prev => prev.filter(event => event.id !== id));
      setEvents(prev => [data, ...prev]);
      toast.success('Evento restaurado com sucesso!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao restaurar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Excluir evento permanentemente
  const permanentDeleteEvent = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeletedEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Evento excluído permanentemente!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao excluir evento permanentemente');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Adicionar participante a evento
  const addEventParticipant = async (participantData: Omit<EventParticipant, 'id' | 'created_at' | 'updated_at' | 'registration_date'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_participants')
        .insert([participantData])
        .select()
        .single();

      if (error) throw error;
      
      setParticipants(prev => [data, ...prev]);
      toast.success('Participante adicionado com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao adicionar participante');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Vincular cliente a evento
  const linkClientToEvent = async (clientId: string, eventId: string, relationshipType: ClientEvent['relationship_type'], notes?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_events')
        .insert([{
          client_id: clientId,
          event_id: eventId,
          relationship_type: relationshipType,
          notes
        }])
        .select(`
          *,
          event:events(*)
        `)
        .single();

      if (error) throw error;
      
      setClientEvents(prev => [data, ...prev]);
      toast.success('Cliente vinculado ao evento!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao vincular cliente ao evento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Desvincular cliente de evento
  const unlinkClientFromEvent = async (clientEventId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('client_events')
        .delete()
        .eq('id', clientEventId);

      if (error) throw error;
      
      setClientEvents(prev => prev.filter(ce => ce.id !== clientEventId));
      toast.success('Cliente desvinculado do evento!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao desvincular cliente do evento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Buscar tipos de eventos únicos
  const getEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('event_type')
        .not('event_type', 'is', null);

      if (error) throw error;
      
      const uniqueTypes = Array.from(new Set(data?.map(item => item.event_type) || []));
      return uniqueTypes;
    } catch (err: any) {
      console.error('Erro ao buscar tipos de eventos:', err);
      return [];
    }
  };

  // Funções para fotos de eventos
  const fetchEventPhotos = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventPhotos(data || []);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar fotos do evento');
    } finally {
      setLoading(false);
    }
  };

  const uploadEventPhoto = async (eventId: string, file: File, caption?: string, isCover?: boolean) => {
    try {
      setLoading(true);
      
      // First upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `event-photos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-media')
        .getPublicUrl(filePath);
      
      // Then insert record in database
      const { data, error } = await supabase
        .from('event_photos')
        .insert([{
          event_id: eventId,
          photo_url: publicUrl,
          caption,
          is_cover: isCover || false
        }])
        .select()
        .single();

      if (error) throw error;
      
      setEventPhotos(prev => [data, ...prev]);
      toast.success('Foto adicionada com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao adicionar foto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para upload de vídeo para storage
  const uploadVideoToStorage = async (file: File): Promise<{success: boolean, path?: string, error?: string}> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `event-videos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('event-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('event-media')
        .getPublicUrl(filePath);

      return { success: true, path: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Função para adicionar vídeo ao evento
  const addVideoToEvent = async (eventId: string, videoUrl: string) => {
    try {
      setLoading(true);
      
      // Buscar evento atual
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('videos')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Adicionar novo vídeo ao array existente
      const currentVideos = currentEvent.videos || [];
      const updatedVideos = [...currentVideos, videoUrl];

      // Atualizar evento com novo array de vídeos
      const { data, error } = await supabase
        .from('events')
        .update({ videos: updatedVideos })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar estado local
      setEvents(prev => 
        prev.map(event => event.id === eventId ? { ...event, videos: updatedVideos } : event)
      );
      
      toast.success('Vídeo adicionado com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao adicionar vídeo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para remover vídeo do evento
  const removeVideoFromEvent = async (eventId: string, videoUrl: string) => {
    try {
      setLoading(true);
      
      // Buscar evento atual
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('videos')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Remover vídeo do array
      const currentVideos = currentEvent.videos || [];
      const updatedVideos = currentVideos.filter(url => url !== videoUrl);

      // Atualizar evento
      const { data, error } = await supabase
        .from('events')
        .update({ videos: updatedVideos })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar estado local
      setEvents(prev => 
        prev.map(event => event.id === eventId ? { ...event, videos: updatedVideos } : event)
      );
      
      toast.success('Vídeo removido com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao remover vídeo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteEventPhoto = async (photoId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      
      setEventPhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast.success('Foto removida com sucesso!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao remover foto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funções para notificações
  const fetchEventNotifications = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_notifications')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventNotifications(data || []);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const createEventNotification = async (notificationData: Omit<EventNotification, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;
      
      setEventNotifications(prev => [data, ...prev]);
      toast.success('Notificação criada com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao criar notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendEventNotification = async (notificationId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_notifications')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      
      setEventNotifications(prev => 
        prev.map(notif => notif.id === notificationId ? data : notif)
      );
      toast.success('Notificação enviada!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao enviar notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funções para check-in digital
  const checkInParticipant = async (participantId: string, checkedInBy?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_participants')
        .update({ 
          status: 'attended',
          checked_in_at: new Date().toISOString(),
          checked_in_by: checkedInBy
        })
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      
      setParticipants(prev => 
        prev.map(participant => participant.id === participantId ? data : participant)
      );
      toast.success('Check-in realizado com sucesso!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao realizar check-in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const undoCheckIn = async (participantId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_participants')
        .update({ 
          status: 'confirmed',
          checked_in_at: null,
          checked_in_by: null
        })
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      
      setParticipants(prev => 
        prev.map(participant => participant.id === participantId ? data : participant)
      );
      toast.success('Check-in desfeito!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao desfazer check-in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar relatórios
  const generateEventReport = async (eventId: string) => {
    try {
      setLoading(true);
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      const report = {
        event,
        participants,
        totalParticipants: participants?.length || 0,
        checkedInCount: participants?.filter(p => p.status === 'attended').length || 0,
        confirmedCount: participants?.filter(p => p.status === 'confirmed').length || 0,
        pendingCount: participants?.filter(p => p.status === 'pending').length || 0,
        cancelledCount: participants?.filter(p => p.status === 'cancelled').length || 0,
        totalGuests: participants?.reduce((sum, p) => sum + (p.guests_count || 0), 0) || 0
      };

      return report;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao gerar relatório');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // Estados
    events,
    deletedEvents,
    participants,
    clientEvents,
    eventPhotos,
    eventNotifications,
    loading,
    error,
    
    // Funções de eventos
    fetchEvents,
    fetchDeletedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    permanentDeleteEvent,
    
    // Funções de participantes
    fetchEventParticipants,
    addEventParticipant,
    
    // Funções de integração cliente-evento
    fetchClientEvents,
    linkClientToEvent,
    unlinkClientFromEvent,
    
    // Funções de fotos
    fetchEventPhotos,
    uploadEventPhoto,
    deleteEventPhoto,
    
    // Funções de vídeos
    uploadVideoToStorage,
    addVideoToEvent,
    removeVideoFromEvent,
    
    // Funções de notificações
    fetchEventNotifications,
    createEventNotification,
    sendEventNotification,
    
    // Funções de check-in
    checkInParticipant,
    undoCheckIn,
    
    // Relatórios
    generateEventReport,
    
    // Utilitários
    getEventTypes
  };
};