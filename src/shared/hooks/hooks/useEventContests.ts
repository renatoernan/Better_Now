import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';
import { fetchEventAttendees, formatPersonName } from '../../utils/utils/eventAttendees';

export type ContestStatus = 'draft' | 'voting' | 'closed' | 'published';

export interface EventContest {
  id: string;
  event_id: string;
  title: string;
  description?: string | null;
  prize_description?: string | null;
  status: ContestStatus;
  voting_opens_at?: string | null;
  voting_closes_at?: string | null;
  show_live_results: boolean;
  require_checkin: boolean;
  allow_self_vote: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContestEntry {
  id: string;
  contest_id: string;
  photo_id: string;
  participant_name: string;
  participant_person_id?: string | null;
  participant_ticket_id?: string | null;
  display_order: number;
  status: 'active' | 'disqualified';
  created_at: string;
  photo?: {
    id: string;
    photo_url: string;
    media_type: 'photo' | 'video';
    caption?: string | null;
    uploaded_by?: string | null;
  } | null;
}

export interface ContestInput {
  title: string;
  description?: string;
  prize_description?: string;
  status?: ContestStatus;
  voting_opens_at?: string | null;
  voting_closes_at?: string | null;
  show_live_results?: boolean;
  require_checkin?: boolean;
  allow_self_vote?: boolean;
}

export interface ParticipantRef {
  name: string;
  personId?: string | null;
  ticketId?: string | null;
}

export interface EventParticipantOption {
  /** Convidado nominal do pedido pode não ter cadastro próprio. */
  personId: string | null;
  ticketId: string;
  name: string;
  phone?: string | null;
  checkedIn: boolean;
}

export interface ContestResult {
  contest_id: string;
  entry_id: string;
  participant_name: string;
  participant_person_id?: string | null;
  photo_id: string;
  entry_status: 'active' | 'disqualified';
  vote_count: number;
  first_vote_at?: string | null;
}

export const useEventContests = (eventId: string) => {
  const [contests, setContests] = useState<EventContest[]>([]);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [results, setResults] = useState<ContestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContests = useCallback(async (): Promise<EventContest[]> => {
    if (!eventId) return [];
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('app_event_contests')
        .select('*')
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setContests(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar concursos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchEntries = useCallback(async (): Promise<ContestEntry[]> => {
    if (!eventId) return [];
    try {
      const contestIds = contests.map(c => c.id);
      if (contestIds.length === 0) { setEntries([]); return []; }

      const { data, error: err } = await supabase
        .from('app_contest_entries')
        .select('*, photo:app_event_photos(id, photo_url, media_type, caption, uploaded_by)')
        .in('contest_id', contestIds)
        .order('display_order', { ascending: true });

      if (err) throw err;
      setEntries(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar candidaturas');
      return [];
    }
  }, [eventId, contests]);

  const fetchResults = useCallback(async (): Promise<ContestResult[]> => {
    const contestIds = contests.map(c => c.id);
    if (contestIds.length === 0) { setResults([]); return []; }

    const { data, error: err } = await supabase
      .from('app_contest_results')
      .select('*')
      .in('contest_id', contestIds)
      .order('vote_count', { ascending: false });

    if (err) { setError(err.message); return []; }
    setResults(data || []);
    return data || [];
  }, [contests]);

  useEffect(() => { fetchContests(); }, [fetchContests]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchResults(); }, [fetchResults]);

  /**
   * Ranking do concurso. Empate desempata por quem recebeu o primeiro voto,
   * critério estável e verificável na auditoria.
   */
  const resultsFor = useCallback(
    (contestId: string): ContestResult[] =>
      results
        .filter(r => r.contest_id === contestId && r.entry_status === 'active')
        .sort((a, b) => {
          if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
          if (!a.first_vote_at) return 1;
          if (!b.first_vote_at) return -1;
          return Date.parse(a.first_vote_at) - Date.parse(b.first_vote_at);
        }),
    [results]
  );

  const createContest = useCallback(async (input: ContestInput): Promise<EventContest> => {
    const { data, error: err } = await supabase
      .from('app_event_contests')
      .insert([{ ...input, event_id: eventId }])
      .select()
      .single();
    if (err) throw err;
    await fetchContests();
    return data;
  }, [eventId, fetchContests]);

  const updateContest = useCallback(async (id: string, input: Partial<ContestInput>) => {
    const { error: err } = await supabase
      .from('app_event_contests')
      .update(input)
      .eq('id', id);
    if (err) throw err;
    await fetchContests();
  }, [fetchContests]);

  const deleteContest = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('app_event_contests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    await fetchContests();
  }, [fetchContests]);

  /**
   * Candidaturas já existentes da mesma pessoa no concurso. O admin optou por
   * garantir uma foto por pessoa manualmente, então a interface avisa em vez de
   * deixar os votos se dividirem entre duas fotos do mesmo participante.
   */
  const findPersonEntries = useCallback(
    (contestId: string, personId?: string | null, name?: string): ContestEntry[] => {
      if (!personId && !name?.trim()) return [];
      return entries.filter(e => {
        if (e.contest_id !== contestId) return false;
        if (personId && e.participant_person_id) return e.participant_person_id === personId;
        if (name?.trim()) {
          return e.participant_name.trim().toLowerCase() === name.trim().toLowerCase();
        }
        return false;
      });
    },
    [entries]
  );

  const promotePhoto = useCallback(
    async (contestId: string, photoId: string, participant: ParticipantRef): Promise<ContestEntry> => {
      const { data, error: err } = await supabase
        .from('app_contest_entries')
        .insert([{
          contest_id: contestId,
          photo_id: photoId,
          participant_name: participant.name.trim(),
          participant_person_id: participant.personId || null,
          participant_ticket_id: participant.ticketId || null,
        }])
        .select('*, photo:app_event_photos(id, photo_url, media_type, caption, uploaded_by)')
        .single();

      if (err) {
        if (err.code === '23505') throw new Error('Esta foto já está concorrendo neste concurso.');
        throw err;
      }
      await fetchEntries();
      return data;
    },
    [fetchEntries]
  );

  const removeEntry = useCallback(async (entryId: string) => {
    const { error: err } = await supabase
      .from('app_contest_entries')
      .delete()
      .eq('id', entryId);
    if (err) throw err;
    await fetchEntries();
  }, [fetchEntries]);

  /** Troca a foto de um participante já inscrito, em vez de criar candidatura duplicada. */
  const replaceEntryPhoto = useCallback(
    async (entryId: string, newPhotoId: string) => {
      const { error: err } = await supabase
        .from('app_contest_entries')
        .update({ photo_id: newPhotoId })
        .eq('id', entryId);
      if (err) {
        if (err.code === '23505') throw new Error('Esta foto já está concorrendo neste concurso.');
        throw err;
      }
      await fetchEntries();
    },
    [fetchEntries]
  );

  const entriesFor = useCallback(
    (contestId: string) => entries.filter(e => e.contest_id === contestId),
    [entries]
  );

  const photoEntryMap = useCallback((): Map<string, ContestEntry[]> => {
    const map = new Map<string, ContestEntry[]>();
    for (const e of entries) {
      const list = map.get(e.photo_id) || [];
      list.push(e);
      map.set(e.photo_id, list);
    }
    return map;
  }, [entries]);

  return {
    contests, entries, results, loading, error,
    refetch: fetchContests, refetchEntries: fetchEntries, refetchResults: fetchResults,
    createContest, updateContest, deleteContest,
    promotePhoto, removeEntry, replaceEntryPhoto,
    findPersonEntries, entriesFor, photoEntryMap, resultsFor,
  };
};

/**
 * Participantes do evento — a mesma lista da portaria, um item por ingresso,
 * para que o tablet do concurso nunca mostre menos gente que o check-in.
 */
export const searchEventParticipants = async (
  eventId: string,
  term: string
): Promise<EventParticipantOption[]> => {
  const attendees = await fetchEventAttendees(eventId);
  const t = term.trim().toLowerCase();
  const digits = t.replace(/\D/g, '');

  return attendees
    // Ingresso cancelado não concorre nem vota
    .filter(a => a.status !== 'canceled')
    .filter(a => {
      if (!t) return true;
      if (a.name.toLowerCase().includes(t)) return true;
      if (digits && String(a.document || '').replace(/\D/g, '').includes(digits)) return true;
      if (digits && String(a.phone || '').replace(/\D/g, '').includes(digits)) return true;
      return false;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(a => ({
      personId: a.personId,
      ticketId: a.ticketId,
      name: formatPersonName(a.name),
      phone: a.phone,
      checkedIn: a.checkedIn,
    }));
};

export default useEventContests;
