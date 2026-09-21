import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/lib/supabase';

/**
 * Votos de um concurso, do ponto de vista da organização.
 *
 * A gravação continua sendo exclusividade da Edge Function; daqui só se lê e se
 * anula. Anular preserva a linha para auditoria e, com a trava parcial do banco
 * (migration 043), devolve o direito de voto ao ingresso na hora.
 */
export interface ContestVote {
  id: string;
  contest_id: string;
  entry_id: string;
  ticket_id: string;
  voting_mode: string;
  created_at: string;
  voided_at?: string | null;
  voided_reason?: string | null;
}

export const useContestVotes = (contestId: string) => {
  const [votes, setVotes] = useState<ContestVote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVotes = useCallback(async (): Promise<ContestVote[]> => {
    if (!contestId) { setVotes([]); return []; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('app_contest_votes')
        .select('id, contest_id, entry_id, ticket_id, voting_mode, created_at, voided_at, voided_reason')
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setVotes(data || []);
      setError(null);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar votos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  // Votos chegam dos tablets durante o evento; a lista acompanha sem recarregar.
  useEffect(() => {
    if (!contestId) return;
    const channel = supabase
      .channel(`contest-votes:${contestId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_contest_votes', filter: `contest_id=eq.${contestId}` },
        () => { fetchVotes(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contestId, fetchVotes]);

  const voidVote = useCallback(async (voteId: string, reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('app_contest_votes')
      .update({
        voided_at: new Date().toISOString(),
        voided_reason: reason?.trim() || null,
        voided_by: user?.id ?? null,
      })
      .eq('id', voteId);

    if (err) throw err;
    await fetchVotes();
  }, [fetchVotes]);

  return { votes, loading, error, refetch: fetchVotes, voidVote };
};

export default useContestVotes;
