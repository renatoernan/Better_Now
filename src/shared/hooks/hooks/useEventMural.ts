import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/lib/supabase';
import { compressImage } from '../../utils/utils/imageCompression';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type MediaType = 'photo' | 'video';

export interface MuralItem {
  id: string;
  event_id: string;
  photo_url: string;
  storage_path?: string | null;
  media_type: MediaType;
  caption?: string | null;
  is_cover: boolean;
  source: 'admin' | 'participant';
  moderation_status: ModerationStatus;
  rejection_reason?: string | null;
  submitted_by_ticket_id?: string | null;
  submitted_by_person_id?: string | null;
  uploaded_by?: string | null;
  consent_image_use: boolean;
  uploaded_at: string;
}

export interface SubmitOptions {
  caption?: string;
  authorName?: string;
  ticketId?: string | null;
  personId?: string | null;
  /** Fotos tiradas pela equipe (modo tablet) entram como 'admin' e já aprovadas. */
  source?: 'admin' | 'participant';
  moderationStatus?: ModerationStatus;
}

const BUCKET = 'events';
const MURAL_FOLDER = 'event-mural';
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

const ACCEPTED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/webm'];

export const isAcceptedMedia = (file: File): boolean =>
  ACCEPTED_IMAGE.includes(file.type) || ACCEPTED_VIDEO.includes(file.type);

const buildStoragePath = (eventId: string, file: File): string => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${MURAL_FOLDER}/${eventId}/${unique}.${ext}`;
};

const persistMedia = async (
  eventId: string,
  upload: File,
  isVideo: boolean,
  options: SubmitOptions
): Promise<MuralItem> => {
  const storagePath = buildStoragePath(eventId, upload);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, upload, { contentType: upload.type });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: insertError } = await supabase
    .from('app_event_photos')
    .insert([{
      event_id: eventId,
      photo_url: publicUrl,
      storage_path: storagePath,
      media_type: isVideo ? 'video' : 'photo',
      caption: options.caption?.trim() || null,
      source: options.source || 'participant',
      moderation_status: options.moderationStatus || 'pending',
      consent_image_use: true,
      uploaded_by: options.authorName?.trim() || null,
      submitted_by_ticket_id: options.ticketId || null,
      submitted_by_person_id: options.personId || null,
    }])
    .select()
    .single();

  if (insertError) {
    // Não deixa arquivo órfão no bucket se a linha não entrou
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data;
};

/**
 * Envia uma foto sem montar o hook do mural — usado pelo modo tablet, que só
 * precisa gravar a imagem recém-capturada.
 */
export const uploadEventPhoto = async (
  eventId: string,
  file: File,
  options: SubmitOptions = {}
): Promise<MuralItem> => {
  const { compressedFile } = await compressImage(file, {
    maxWidth: 1920, maxHeight: 1920, quality: 0.82, maxSizeKB: 900,
  });
  return persistMedia(eventId, compressedFile, false, options);
};

export const useEventMural = (eventId: string, status?: ModerationStatus | 'all') => {
  const [items, setItems] = useState<MuralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const fetchItems = useCallback(async (): Promise<MuralItem[]> => {
    if (!eventId) return [];
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('app_event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('moderation_status', status);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      setItems(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o mural');
      return [];
    } finally {
      setLoading(false);
    }
  }, [eventId, status]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Feed ao vivo: o mural é projetado durante o evento, então precisa refletir
  // aprovações e novos envios sem recarregar a página.
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`mural:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_event_photos', filter: `event_id=eq.${eventId}` },
        () => { fetchItems(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, fetchItems]);

  const submitMedia = useCallback(
    async (file: File, options: SubmitOptions = {}): Promise<MuralItem> => {
      if (!isAcceptedMedia(file)) {
        throw new Error('Formato não suportado. Envie JPG, PNG, WEBP, MP4 ou WEBM.');
      }

      const isVideo = ACCEPTED_VIDEO.includes(file.type);
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        throw new Error('Vídeo muito grande (máximo 15MB).');
      }

      // Uploads vêm de celular em rede de evento; comprimir antes economiza
      // banda e mantém o arquivo abaixo do limite do bucket.
      const upload = isVideo
        ? file
        : (await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.82, maxSizeKB: 900 })).compressedFile;

      return persistMedia(eventId, upload, isVideo, options);
    },
    [eventId]
  );

  const moderate = useCallback(
    async (photoId: string, decision: Extract<ModerationStatus, 'approved' | 'rejected'>, reason?: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: err } = await supabase
        .from('app_event_photos')
        .update({
          moderation_status: decision,
          rejection_reason: decision === 'rejected' ? (reason?.trim() || null) : null,
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id ?? null,
        })
        .eq('id', photoId);

      if (err) throw err;
      await fetchItems();
    },
    [fetchItems]
  );

  const moderateMany = useCallback(
    async (photoIds: string[], decision: Extract<ModerationStatus, 'approved' | 'rejected'>) => {
      if (photoIds.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();

      const { error: err } = await supabase
        .from('app_event_photos')
        .update({
          moderation_status: decision,
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id ?? null,
        })
        .in('id', photoIds);

      if (err) throw err;
      await fetchItems();
    },
    [fetchItems]
  );

  const removeItem = useCallback(
    async (item: MuralItem) => {
      const { error: err } = await supabase.from('app_event_photos').delete().eq('id', item.id);
      if (err) throw err;

      if (item.storage_path) {
        await supabase.storage.from(BUCKET).remove([item.storage_path]);
      }
      await fetchItems();
    },
    [fetchItems]
  );

  return { items, loading, error, refetch: fetchItems, submitMedia, moderate, moderateMany, removeItem };
};

export default useEventMural;
