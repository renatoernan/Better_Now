import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { Event } from '../../types/types/event';

// Função auxiliar para verificar se o status do evento é Ativo
const isEventActive = (status?: string): boolean => {
  if (!status) return false;
  const normalized = String(status).trim().toLowerCase();
  return normalized === 'active' || normalized === 'ativo' || normalized === 'published';
};

// Converter registro do banco app_events para a interface Event do frontend
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
  let imageUrlVal = dbItem.image_url || '';
  let videosVal: string[] = Array.isArray(dbItem.videos) ? dbItem.videos : [];
  let paymentMethodsVal: any[] = Array.isArray(dbItem.payment_methods) ? dbItem.payment_methods : [];
  let checkoutFieldsVal: any[] = Array.isArray(dbItem.checkout_fields) ? dbItem.checkout_fields : [];

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
        if (!imageUrlVal && parsed.image_url) {
          imageUrlVal = parsed.image_url;
        }
        if (videosVal.length === 0 && Array.isArray(parsed.videos)) {
          videosVal = parsed.videos;
        }
        if (paymentMethodsVal.length === 0 && Array.isArray(parsed.payment_methods)) {
          paymentMethodsVal = parsed.payment_methods;
        }
        if (checkoutFieldsVal.length === 0 && Array.isArray(parsed.checkout_fields)) {
          checkoutFieldsVal = parsed.checkout_fields;
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
    image_url: imageUrlVal,
    videos: videosVal,
    payment_methods: paymentMethodsVal,
    checkout_fields: checkoutFieldsVal
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

export const usePublicEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os eventos ativos e públicos
  const fetchPublicEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let { data, error: fetchErr } = await supabase
        .from('app_events')
        .select('*')
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      if (fetchErr) {
        // Fallback para 'events'
        const fallback = await supabase
          .from('events')
          .select('*')
          .is('deleted_at', null)
          .order('event_date', { ascending: true });

        if (fallback.error) {
          throw fetchErr;
        }
        data = fallback.data;
      }

      const enriched = enrichEventArrayFromDb(data || []);
      const publicEvents = enriched.filter(
        e => e.is_public !== false && isEventActive(e.status)
      );

      // Enriquecer com ingressos vendidos por lote
      const eventIds = publicEvents.map(e => e.id);
      const soldMap = await fetchSoldQuantitiesForEvents(eventIds);

      const finalizedEvents = publicEvents.map(ev => {
        if (ev.price_batches && Array.isArray(ev.price_batches)) {
          const evSold = soldMap[ev.id] || {};
          ev.price_batches = ev.price_batches.map((batch: any, index: number) => ({
            ...batch,
            sold_quantity: evSold[index] || 0
          }));
        }
        return ev;
      });

      setEvents(finalizedEvents);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eventos');
      console.error('Erro ao carregar eventos públicos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar evento por ID
  const fetchEventById = useCallback(async (id: string): Promise<Event | null> => {
    try {
      setLoading(true);
      setError(null);

      let { data, error: fetchErr } = await supabase
        .from('app_events')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (fetchErr) {
        const fallback = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (fallback.error) throw fetchErr;
        data = fallback.data;
      }

      const event = enrichEventFromDb(data);
      // Permite acesso direto via link tanto para eventos públicos quanto não públicos (desde que ativos e não excluídos)
      if (!event || !isEventActive(event.status)) {
        return null;
      }

      // Enriquecer os lotes com as vendas reais
      if (event.price_batches && Array.isArray(event.price_batches) && event.price_batches.length > 0) {
        const soldMap = await fetchSoldQuantitiesForEvents([event.id]);
        const evSold = soldMap[event.id] || {};
        event.price_batches = event.price_batches.map((batch: any, index: number) => ({
          ...batch,
          sold_quantity: evSold[index] || 0
        }));
      }

      return event;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar evento';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar eventos em destaque (próximos 3 eventos ativos)
  const fetchFeaturedEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let { data, error: fetchErr } = await supabase
        .from('app_events')
        .select('*')
        .is('deleted_at', null)
        .order('event_date', { ascending: true })
        .limit(10);

      if (fetchErr) {
        const fallback = await supabase
          .from('events')
          .select('*')
          .is('deleted_at', null)
          .order('event_date', { ascending: true })
          .limit(10);

        if (fallback.error) throw fetchErr;
        data = fallback.data;
      }

      const enriched = enrichEventArrayFromDb(data || []);
      return enriched.filter(e => e.is_public !== false && isEventActive(e.status)).slice(0, 3);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar eventos em destaque:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar eventos por categoria
  const fetchEventsByCategory = useCallback(async (category: string) => {
    try {
      setLoading(true);
      setError(null);

      let { data, error: fetchErr } = await supabase
        .from('app_events')
        .select('*')
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      if (fetchErr) {
        const fallback = await supabase
          .from('events')
          .select('*')
          .is('deleted_at', null)
          .order('event_date', { ascending: true });

        if (fallback.error) throw fetchErr;
        data = fallback.data;
      }

      const enriched = enrichEventArrayFromDb(data || []);
      return enriched.filter(e => e.is_public !== false && isEventActive(e.status) && e.category === category);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar eventos por categoria:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar eventos ao montar o componente
  useEffect(() => {
    fetchPublicEvents();
  }, [fetchPublicEvents]);

  return {
    events,
    loading,
    error,
    fetchPublicEvents,
    fetchEventById,
    fetchFeaturedEvents,
    fetchEventsByCategory,
  };
};
