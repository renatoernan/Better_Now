import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/lib/supabase';

export interface QueuedVote {
  clientVoteId: string;
  contestId: string;
  entryId: string;
  qrCodeHash: string;
  participantLabel: string;
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

export interface VoteOutcome {
  ok: boolean;
  queued: boolean;
  code?: string;
  message?: string;
}

const storageKey = (contestId: string) => `contest_vote_queue_${contestId}`;

/**
 * Códigos que o servidor já resolveu: reenviar não muda o resultado, então
 * saem da fila. Qualquer outra falha é tratada como problema de rede e fica
 * aguardando nova tentativa.
 */
const FINAL_CODES = new Set([
  'ALREADY_VOTED', 'SELF_VOTE', 'VOTING_CLOSED', 'VOTING_ENDED', 'VOTING_NOT_STARTED',
  'TICKET_NOT_FOUND', 'TICKET_WRONG_EVENT', 'TICKET_CANCELED', 'CHECKIN_REQUIRED',
  'ENTRY_NOT_IN_CONTEST', 'ENTRY_DISQUALIFIED', 'CONTEST_NOT_FOUND', 'INVALID_INPUT',
]);

const readQueue = (contestId: string): QueuedVote[] => {
  try {
    const raw = localStorage.getItem(storageKey(contestId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeQueue = (contestId: string, queue: QueuedVote[]) => {
  try {
    localStorage.setItem(storageKey(contestId), JSON.stringify(queue));
  } catch {
    // Armazenamento indisponível (aba privada, cota cheia): o voto segue só em
    // memória nesta sessão. Nada a fazer além de não derrubar a votação.
  }
};

const newId = (): string =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

export const useVoteQueue = (contestId: string, collectedBy?: string | null) => {
  const [queue, setQueue] = useState<QueuedVote[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [flushing, setFlushing] = useState(false);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (contestId) setQueue(readQueue(contestId));
  }, [contestId]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const persist = useCallback((next: QueuedVote[]) => {
    setQueue(next);
    writeQueue(contestId, next);
  }, [contestId]);

  const send = useCallback(async (item: QueuedVote): Promise<{ done: boolean; code?: string; message?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('register-contest-vote', {
        body: {
          contest_id: item.contestId,
          entry_id: item.entryId,
          qr_code_hash: item.qrCodeHash,
          client_vote_id: item.clientVoteId,
          collected_by: collectedBy || null,
        },
      });

      // A função responde 4xx com corpo próprio; o supabase-js trata como erro,
      // então o código de negócio pode vir tanto em data quanto no contexto.
      if (error) {
        let body: any = null;
        try { body = await (error as any).context?.json?.(); } catch { /* resposta sem corpo */ }
        const code = body?.code;
        if (code && FINAL_CODES.has(code)) {
          return { done: true, code, message: body?.message };
        }
        return { done: false, message: body?.message || error.message };
      }

      if (data?.ok) return { done: true };
      if (data?.code && FINAL_CODES.has(data.code)) {
        return { done: true, code: data.code, message: data.message };
      }
      return { done: false, message: data?.message };
    } catch (err: any) {
      return { done: false, message: err?.message || 'Falha de rede' };
    }
  }, [collectedBy]);

  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    const pending = readQueue(contestId);
    if (pending.length === 0) return;

    flushingRef.current = true;
    setFlushing(true);

    const remaining: QueuedVote[] = [];
    for (const item of pending) {
      const result = await send(item);
      if (!result.done) {
        remaining.push({ ...item, attempts: item.attempts + 1, lastError: result.message });
      }
    }

    persist(remaining);
    flushingRef.current = false;
    setFlushing(false);
  }, [contestId, send, persist]);

  // Tenta esvaziar a fila quando a rede volta e periodicamente enquanto houver pendência
  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  useEffect(() => {
    if (queue.length === 0) return;
    const timer = setInterval(() => { flush(); }, 15000);
    return () => clearInterval(timer);
  }, [queue.length, flush]);

  /**
   * Registra o voto. Com rede, aguarda a resposta para dar retorno imediato ao
   * operador. Sem rede, enfileira e devolve na hora — a fila de gente não pode
   * parar porque o wi-fi do salão oscilou.
   */
  const castVote = useCallback(
    async (entryId: string, qrCodeHash: string, participantLabel: string): Promise<VoteOutcome> => {
      const item: QueuedVote = {
        clientVoteId: newId(),
        contestId,
        entryId,
        qrCodeHash,
        participantLabel,
        queuedAt: Date.now(),
        attempts: 0,
      };

      if (!navigator.onLine) {
        persist([...readQueue(contestId), item]);
        return { ok: true, queued: true };
      }

      const result = await send(item);
      if (result.done) {
        return result.code
          ? { ok: false, queued: false, code: result.code, message: result.message }
          : { ok: true, queued: false };
      }

      persist([...readQueue(contestId), { ...item, attempts: 1, lastError: result.message }]);
      return { ok: true, queued: true, message: result.message };
    },
    [contestId, send, persist]
  );

  return { queue, pendingCount: queue.length, online, flushing, castVote, flush };
};

export default useVoteQueue;
