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

// Re-export Event type for external use
export type { Event } from '../../types';

// Event photo interface
interface EventPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  caption?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

/**
 * Mapeamento bidirecional para ajustar os campos do frontend aos nomes reais 
 * das colunas da tabela app_events no Supabase:
 * 
 * Colunas reais no Supabase (app_events):
 * id, title, event_date, start_time, end_time, location, location_link,
 * client_id, event_type_id, status, guests, observations, videos, deleted_at, created_at, updated_at
 */

const isEventActive = (status?: string): boolean => {
  if (!status) return false;
  const normalized = String(status).trim().toLowerCase();
  return normalized === 'active' || normalized === 'ativo' || normalized === 'published';
};

const enrichEventFromDb = (dbItem: any): Event => {
  if (!dbItem) return dbItem;

  let descriptionStr = '';
  let isPublicVal = true;
  let requiresApprovalVal = false;
  let endDateVal = '';
  let contactEmailVal = '';
  let contactPhoneVal = '';
  let statusVal = dbItem.status || '';
  let eventTypeIdVal = dbItem.event_type_id || dbItem.event_type || '';
  let priceBatchesVal: any[] = Array.isArray(dbItem.price_batches) ? dbItem.price_batches : [];
  let paymentMethodsVal: any[] = Array.isArray(dbItem.payment_methods) ? dbItem.payment_methods : [];
  let checkoutFieldsVal: any[] = Array.isArray(dbItem.checkout_fields) ? dbItem.checkout_fields : [];
  let imageUrlVal = dbItem.image_url || '';
  let videosVal: string[] = Array.isArray(dbItem.videos) ? dbItem.videos : [];

  if (dbItem.observations) {
    try {
      const trimmed = String(dbItem.observations).trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        descriptionStr = parsed.desc ?? parsed.description ?? dbItem.observations;
        if (!statusVal && parsed.status) statusVal = parsed.status;
        if (parsed.is_public !== undefined) isPublicVal = Boolean(parsed.is_public);
        if (parsed.requires_approval !== undefined) requiresApprovalVal = Boolean(parsed.requires_approval);
        if (parsed.end_date) endDateVal = parsed.end_date;
        if (parsed.contact_email) contactEmailVal = parsed.contact_email;
        if (parsed.contact_phone) contactPhoneVal = parsed.contact_phone;
        if (parsed.event_type_id || parsed.event_type) {
          eventTypeIdVal = parsed.event_type_id || parsed.event_type;
        }
        if (Array.isArray(parsed.price_batches) && priceBatchesVal.length === 0) {
          priceBatchesVal = parsed.price_batches;
        }
        if (Array.isArray(parsed.payment_methods) && paymentMethodsVal.length === 0) {
          paymentMethodsVal = parsed.payment_methods;
        }
        if (Array.isArray(parsed.checkout_fields) && checkoutFieldsVal.length === 0) {
          checkoutFieldsVal = parsed.checkout_fields;
        }
        if (!imageUrlVal && parsed.image_url) {
          imageUrlVal = parsed.image_url;
        }
        if (videosVal.length === 0 && Array.isArray(parsed.videos)) {
          videosVal = parsed.videos;
        }
        if (parsed.waha_msg_order_created) {
          dbItem.waha_msg_order_created = parsed.waha_msg_order_created;
        }
        if (parsed.waha_msg_order_confirmed) {
          dbItem.waha_msg_order_confirmed = parsed.waha_msg_order_confirmed;
        }
        if (parsed.waha_msg_order_cancelled) {
          dbItem.waha_msg_order_cancelled = parsed.waha_msg_order_cancelled;
        }
      } else {
        descriptionStr = dbItem.observations;
      }
    } catch {
      descriptionStr = dbItem.observations;
    }
  }

  if (dbItem.is_public !== undefined && dbItem.is_public !== null) {
    isPublicVal = Boolean(dbItem.is_public);
  }
  if (dbItem.requires_approval !== undefined && dbItem.requires_approval !== null) {
    requiresApprovalVal = Boolean(dbItem.requires_approval);
  }
  if (dbItem.end_date) {
    endDateVal = dbItem.end_date;
  }
  if (dbItem.contact_email) {
    contactEmailVal = dbItem.contact_email;
  }
  if (dbItem.contact_phone) {
    contactPhoneVal = dbItem.contact_phone;
  }

  return {
    ...dbItem,
    id: dbItem.id,
    name: dbItem.title || dbItem.name || '',
    title: dbItem.title || dbItem.name || '',
    description: descriptionStr,
    basic_description: descriptionStr,
    event_date: dbItem.event_date,
    event_time: dbItem.start_time || dbItem.event_time || '',
    end_date: endDateVal,
    end_time: dbItem.end_time || '',
    location: dbItem.location || '',
    location_link: dbItem.location_link || '',
    event_type: eventTypeIdVal,
    event_type_id: eventTypeIdVal,
    contact_email: contactEmailVal,
    contact_phone: contactPhoneVal,
    max_guests: dbItem.guests ?? 0,
    current_guests: dbItem.guests ?? 0,
    capacity: dbItem.guests ?? 0,
    max_participants: dbItem.guests ?? 0,
    status: statusVal || 'draft',
    is_active: isEventActive(statusVal) && dbItem.deleted_at === null,
    is_public: isPublicVal,
    requires_approval: requiresApprovalVal,
    price_batches: priceBatchesVal,
    payment_methods: paymentMethodsVal,
    checkout_fields: checkoutFieldsVal,
    waha_msg_order_created: dbItem.waha_msg_order_created || '',
    waha_msg_order_confirmed: dbItem.waha_msg_order_confirmed || '',
    waha_msg_order_cancelled: dbItem.waha_msg_order_cancelled || '',
    image_url: imageUrlVal,
    videos: videosVal
  };
};

const enrichEventArrayFromDb = (items: any[]): Event[] => {
  return (items || []).map(enrichEventFromDb);
};

// Função auxiliar para buscar a contagem de ingressos vendidos por lote
const fetchSoldQuantitiesForEvents = async (eventIds: string[]): Promise<Record<string, Record<number, number>>> => {
  if (!eventIds || eventIds.length === 0) return {};
  try {
    const { data: orders, error } = await supabase
      .from('app_event_orders')
      .select('event_id, batch_index, quantity, status')
      .in('event_id', eventIds)
      .in('status', ['approved', 'paid', 'completed']);

    if (error || !orders) return {};

    const eventSoldMap: Record<string, Record<number, number>> = {};
    orders.forEach((ord: any) => {
      const eId = ord.event_id;
      if (!eventSoldMap[eId]) eventSoldMap[eId] = {};
      const bIdx = ord.batch_index ?? 0;
      const q = Number(ord.quantity) || 1;
      eventSoldMap[eId][bIdx] = (eventSoldMap[eId][bIdx] || 0) + q;
    });

    return eventSoldMap;
  } catch {
    return {};
  }
};

const toEventDbPayload = (eventData: Partial<Event>): any => {
  const payload: any = {};

  const titleVal = eventData.title || eventData.name;
  if (titleVal !== undefined) {
    payload.title = titleVal;
  }
  if (eventData.event_date !== undefined) {
    payload.event_date = eventData.event_date;
  }
  if (eventData.event_time !== undefined) {
    payload.start_time = eventData.event_time;
  }
  if (eventData.end_time !== undefined) {
    payload.end_time = eventData.end_time;
  }
  if (eventData.location !== undefined) {
    payload.location = eventData.location;
  }
  if (eventData.location_link !== undefined) {
    payload.location_link = eventData.location_link;
  }

  const typeVal = eventData.event_type_id || eventData.event_type || '';
  if (typeVal && /^[0-9a-fA-F-]{36}$/.test(typeVal)) {
    payload.event_type_id = typeVal;
  }

  if (eventData.status !== undefined) {
    payload.status = eventData.status;
  }

  const guestsVal = eventData.max_guests ?? eventData.max_participants ?? eventData.capacity;
  if (guestsVal !== undefined) {
    payload.guests = guestsVal;
  }

  const descText = eventData.description || eventData.basic_description || eventData.additional_info || '';
  const isPub = eventData.is_public ?? true;
  const reqApp = eventData.requires_approval ?? false;
  const endDate = eventData.end_date || '';
  const contactEmail = eventData.contact_email || '';
  const contactPhone = eventData.contact_phone || '';
  const priceBatchesVal = eventData.price_batches || [];
  const paymentMethodsVal = eventData.payment_methods || [];
  const checkoutFieldsVal = eventData.checkout_fields || [];
  const wahaMsgCreatedVal = eventData.waha_msg_order_created || '';
  const wahaMsgConfirmedVal = eventData.waha_msg_order_confirmed || '';
  const wahaMsgCancelledVal = eventData.waha_msg_order_cancelled || '';
  const imageUrlVal = eventData.image_url || '';
  const videosVal = eventData.videos || [];

  if (eventData.waha_msg_order_created !== undefined) {
    payload.waha_msg_order_created = eventData.waha_msg_order_created;
  }
  if (eventData.waha_msg_order_confirmed !== undefined) {
    payload.waha_msg_order_confirmed = eventData.waha_msg_order_confirmed;
  }
  if (eventData.waha_msg_order_cancelled !== undefined) {
    payload.waha_msg_order_cancelled = eventData.waha_msg_order_cancelled;
  }

  payload.observations = JSON.stringify({
    desc: descText,
    status: eventData.status,
    is_public: isPub,
    requires_approval: reqApp,
    end_date: endDate,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    event_type_id: typeVal,
    event_type: typeVal,
    price_batches: priceBatchesVal,
    payment_methods: paymentMethodsVal,
    checkout_fields: checkoutFieldsVal,
    waha_msg_order_created: wahaMsgCreatedVal,
    waha_msg_order_confirmed: wahaMsgConfirmedVal,
    waha_msg_order_cancelled: wahaMsgCancelledVal,
    image_url: imageUrlVal,
    videos: videosVal
  });

  return payload;
};

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

      const cacheKey = `events:filtered:${JSON.stringify({ filters, page, limit })}`;

      const cachedResult = await cacheService.memoize(cacheKey, async () => {
        let query = supabase
          .from('app_events')
          .select('*', { count: 'exact' })
          .is('deleted_at', null)
          .order('event_date', { ascending: true })
          .range(offset, offset + limit - 1);

        if (filters?.search) {
          query = query.or(`title.ilike.%${filters.search}%,observations.ilike.%${filters.search}%`);
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

        const { data, error: fetchErr, count } = await query;
        const enriched = enrichEventArrayFromDb(data || []);
        const eventIds = enriched.map(e => e.id);
        const soldMap = await fetchSoldQuantitiesForEvents(eventIds);

        const finalized = enriched.map(ev => {
          if (ev.price_batches && Array.isArray(ev.price_batches)) {
            const evSold = soldMap[ev.id] || {};
            ev.price_batches = ev.price_batches.map((batch: any, index: number) => ({
              ...batch,
              sold_quantity: evSold[index] || 0
            }));
          }
          return ev;
        });

        return { data: finalized, count: count || 0 };
      }, 2 * 60 * 1000);

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

      const { data, error: fetchErr } = await supabase
        .from('app_events')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setDeletedEvents(enrichEventArrayFromDb(data || []));
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

      const payload = toEventDbPayload(eventData);

      const { data, error: insertErr } = await supabase
        .from('app_events')
        .insert([payload])
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      
      const enriched = enrichEventFromDb(data);
      setEvents(prev => [enriched, ...prev]);
      
      cacheUtils.invalidateEvents();
      
      toast.success('Evento criado com sucesso!');
      ActivityLogger.log('event_created', `Evento "${enriched.title || enriched.name}" criado`, 'system', 'success', { eventId: enriched.id });
      
      return enriched;
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

      const payload = {
        ...toEventDbPayload(eventData),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateErr } = await supabase
        .from('app_events')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (updateErr) throw updateErr;
      
      const enriched = enrichEventFromDb(data);
      setEvents(prev => prev.map(event => event.id === id ? enriched : event));
      
      cacheUtils.invalidateEvents();
      cacheService.delete(CACHE_KEYS.EVENTS.BY_ID(id));
      
      toast.success('Evento atualizado com sucesso!');
      ActivityLogger.log('event_updated', `Evento "${enriched.title || enriched.name}" atualizado`, 'system', 'success', { eventId: enriched.id });
      
      return enriched;
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

      const { data, error: deleteErr } = await supabase
        .from('app_events')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (deleteErr) throw deleteErr;
      
      const enriched = enrichEventFromDb(data);
      setEvents(prev => prev.filter(event => event.id !== id));
      setDeletedEvents(prev => [enriched, ...prev]);
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

      const { data, error: restoreErr } = await supabase
        .from('app_events')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (restoreErr) throw restoreErr;
      
      const enriched = enrichEventFromDb(data);
      setDeletedEvents(prev => prev.filter(event => event.id !== id));
      setEvents(prev => [enriched, ...prev]);
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

      const { error: delErr } = await supabase
        .from('app_events')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      
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

      const { data, error: fetchErr } = await supabase
        .from('app_event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      setEventPhotos(data || []);
      return data || [];
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;
      const filePath = `event-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      const { data, error: insertError } = await supabase
        .from('app_event_photos')
        .insert([{
          event_id: eventId,
          photo_url: publicUrl,
          caption: caption || null,
          uploaded_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setEventPhotos(prev => [data, ...prev]);
      toast.success('Foto enviada com sucesso!');

      return data;
    } catch (err: any) {
      handleError(err, 'Erro ao enviar foto do evento');
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

      const { error: delErr } = await supabase
        .from('app_event_photos')
        .delete()
        .eq('id', photoId);

      if (delErr) throw delErr;

      setEventPhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast.success('Foto excluída com sucesso!');
    } catch (err: any) {
      handleError(err, 'Erro ao excluir foto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  return {
    data: events,
    refetch: fetchEvents,
    events,
    deletedEvents,
    eventPhotos,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    fetchEvents,
    fetchDeletedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    permanentDeleteEvent,
    fetchEventPhotos,
    uploadEventPhoto,
    deleteEventPhoto,
    getEventById,
    getActiveEvents,
    getUpcomingEvents,
    getPastEvents,
    clearError
  };
};