import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../services/lib/supabase';
import { toast } from 'sonner';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import { cacheService, CACHE_KEYS, cacheUtils } from '../../services/cache';
import type { 
  Event, 
  EventFilters, 
  PaginationParams, 
  UseAsyncState,
  ApiResponse,
  PaginatedResponse 
} from '../../types';

// Event photo interface
interface EventPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  caption?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

// Hook return type
interface UseSupabaseEventsReturn extends UseAsyncState<Event[]> {
  events: Event[];
  deletedEvents: Event[];
  eventPhotos: EventPhoto[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Actions
  fetchEvents: (filters?: EventFilters, pagination?: PaginationParams) => Promise<void>;
  fetchDeletedEvents: () => Promise<void>;
  createEvent: (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_participants'>) => Promise<Event>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  restoreEvent: (id: string) => Promise<void>;
  permanentDeleteEvent: (id: string) => Promise<void>;
  
  // Event photos actions
  fetchEventPhotos: (eventId: string) => Promise<EventPhoto[]>;
  uploadEventPhoto: (eventId: string, file: File, caption?: string) => Promise<EventPhoto>;
  deleteEventPhoto: (photoId: string) => Promise<void>;
  
  // Utility functions
  getEventById: (id: string) => Event | undefined;
  getActiveEvents: () => Event[];
  getUpcomingEvents: () => Event[];
  getPastEvents: () => Event[];
  clearError: () => void;
}

export const useSupabaseEvents = (): UseSupabaseEventsReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<Event[]>([]);
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Memoized computed values
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);

  // Utility functions
  const getEventById = useCallback((id: string) => {
    return events.find(event => event.id === id);
  }, [events]);

  const getActiveEvents = useCallback(() => {
    return events.filter(event => event.is_active);
  }, [events]);

  const getUpcomingEvents = useCallback(() => {
    const now = new Date();
    return events.filter(event => new Date(event.event_date) > now);
  }, [events]);

  const getPastEvents = useCallback(() => {
    const now = new Date();
    return events.filter(event => new Date(event.event_date) <= now);
  }, [events]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Error handler with debounce to prevent duplicate toasts
  const handleError = useCallback((err: any, message: string) => {
    const errorMessage = err?.message || 'Erro desconhecido';
    setError(errorMessage);
    
    // Only show toast if it's not a duplicate within the last 2 seconds
    const now = Date.now();
    const lastToastKey = `toast_${message}`;
    const lastToastTime = (window as any)[lastToastKey] || 0;
    
    if (now - lastToastTime > 2000) {
      toast.error(message);
      (window as any)[lastToastKey] = now;
    }
    
    console.error(message, err);
  }, []);

  // Fetch events with filters and pagination
  const fetchEvents = useCallback(async (filters?: EventFilters, pagination?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;

      // Generate cache key based on filters and pagination
      const cacheKey = `events:filtered:${JSON.stringify({ filters, page, limit })}`;

      // Try to get from cache first
      const cachedResult = await cacheService.memoize(cacheKey, async () => {
        let query = supabase
          .from('events')
          .select('*, event_types!event_type_id(*)', { count: 'exact' })
          .is('deleted_at', null)
          .order('event_date', { ascending: true })
          .range(offset, offset + limit - 1);

        // Apply filters
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        if (filters?.event_type_id) {
          query = query.eq('event_type_id', filters.event_type_id);
        }
        if (filters?.date_from) {
          query = query.gte('event_date', filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte('event_date', filters.date_to);
        }
        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters?.allow_ticket_sales !== undefined) {
          query = query.eq('allow_ticket_sales', filters.allow_ticket_sales);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return { data: data || [], count: count || 0 };
      }, 2 * 60 * 1000); // Cache por 2 minutos

      setEvents(cachedResult.data);
      setTotalCount(cachedResult.count);
      setCurrentPage(page);
      setTotalPages(Math.ceil(cachedResult.count / limit));
    } catch (err: any) {
      handleError(err, 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch deleted events
  const fetchDeletedEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .select('*, event_types!event_type_id(*)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedEvents(data || []);
    } catch (err: any) {
      handleError(err, 'Erro ao carregar eventos da lixeira');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create event
  const createEvent = useCallback(async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_participants'>): Promise<Event> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          current_participants: 0,
        }])
        .select('*, event_types!event_type_id(*)')
        .single();

      if (error) throw error;
      
      setEvents(prev => [data, ...prev]);
      
      // Invalidate cache after creating event
      cacheUtils.invalidateEvents();
      
      toast.success('Evento criado com sucesso!');
      ActivityLogger.log('event_created', `Evento "${data.name}" criado`, 'system', 'success', { eventId: data.id });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao criar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Update event
  const updateEvent = useCallback(async (id: string, eventData: Partial<Event>): Promise<Event> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, event_types!event_type_id(*)')
        .single();

      if (error) throw error;
      
      setEvents(prev => prev.map(event => event.id === id ? data : event));
      
      // Invalidate cache after updating event
      cacheUtils.invalidateEvents();
      cacheService.delete(CACHE_KEYS.EVENTS.BY_ID(id));
      
      toast.success('Evento atualizado com sucesso!');
      ActivityLogger.log('event_updated', `Evento "${data.name}" atualizado`, 'system', 'success', { eventId: data.id });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao atualizar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Soft delete event
  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, event_types!event_type_id(*)')
        .single();

      if (error) throw error;
      
      setEvents(prev => prev.filter(event => event.id !== id));
      setDeletedEvents(prev => [data, ...prev]);
      toast.success('Evento movido para a lixeira!');
    } catch (err: any) {
      handleError(err, 'Erro ao mover evento para lixeira');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Restore event from trash
  const restoreEvent = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, event_types!event_type_id(*)')
        .single();

      if (error) throw error;
      
      setDeletedEvents(prev => prev.filter(event => event.id !== id));
      setEvents(prev => [data, ...prev]);
      toast.success('Evento restaurado com sucesso!');
    } catch (err: any) {
      handleError(err, 'Erro ao restaurar evento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Permanently delete event
  const permanentDeleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeletedEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Evento excluído permanentemente!');
    } catch (err: any) {
      handleError(err, 'Erro ao excluir evento permanentemente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch event photos
  const fetchEventPhotos = useCallback(async (eventId: string): Promise<EventPhoto[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const photos = data || [];
      setEventPhotos(photos);
      return photos;
    } catch (err: any) {
      handleError(err, 'Erro ao carregar fotos do evento');
      return [];
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Upload event photo
  const uploadEventPhoto = useCallback(async (eventId: string, file: File, caption?: string): Promise<EventPhoto> => {
    try {
      setLoading(true);
      setError(null);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-photos')
        .getPublicUrl(fileName);

      // Insert photo record
      const { data, error } = await supabase
        .from('event_photos')
        .insert([{
          event_id: eventId,
          photo_url: publicUrl,
          caption: caption || null,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setEventPhotos(prev => [data, ...prev]);
      
      toast.success('Foto enviada com sucesso!');
      ActivityLogger.log('event_photo_uploaded', `Foto enviada para evento ${eventId}`, 'system', 'success', { eventId, photoId: data.id });
      
      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao enviar foto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Delete event photo
  const deleteEventPhoto = useCallback(async (photoId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get photo data first to delete from storage
      const { data: photoData, error: fetchError } = await supabase
        .from('event_photos')
        .select('photo_url')
        .eq('id', photoId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL and delete from storage
      if (photoData?.photo_url) {
        const urlParts = photoData.photo_url.split('/');
        const fileName = urlParts.slice(-2).join('/'); // Get eventId/filename.ext
        
        await supabase.storage
          .from('event-photos')
          .remove([fileName]);
      }

      // Delete photo record
      const { error } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      
      // Update local state
      setEventPhotos(prev => prev.filter(photo => photo.id !== photoId));
      
      toast.success('Foto excluída com sucesso!');
      ActivityLogger.log('event_photo_deleted', `Foto ${photoId} excluída`, 'system', 'success', { photoId });
    } catch (err: any) {
      handleError(err, 'Erro ao excluir foto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Refetch function for UseAsyncState compatibility
  const refetch = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  return {
    // Data
    data: events,
    events,
    deletedEvents,
    eventPhotos,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // State
    loading,
    error,
    
    // Actions
    fetchEvents,
    fetchDeletedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    permanentDeleteEvent,
    refetch,
    
    // Event photos actions
    fetchEventPhotos,
    uploadEventPhoto,
    deleteEventPhoto,
    
    // Utility functions
    getEventById,
    getActiveEvents,
    getUpcomingEvents,
    getPastEvents,
    clearError,
  };
};