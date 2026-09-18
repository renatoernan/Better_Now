import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Camera } from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';

interface PublicEntry {
  contest_id: string;
  contest_title: string;
  contest_status: string;
  show_live_results: boolean;
  entry_id: string;
  participant_name: string;
  photo_url: string | null;
}

interface PublicResult {
  contest_id: string;
  contest_title: string;
  contest_status: string;
  entry_id: string;
  participant_name: string;
  photo_url: string | null;
  vote_count: number;
  first_vote_at: string | null;
}

interface MuralPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  uploaded_by: string | null;
}

const PHOTO_MS = 7000;

const EventTelao: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();

  const [photos, setPhotos] = useState<MuralPhoto[]>([]);
  const [entries, setEntries] = useState<PublicEntry[]>([]);
  const [results, setResults] = useState<PublicResult[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [index, setIndex] = useState(0);

  const photosRef = useRef<MuralPhoto[]>([]);
  photosRef.current = photos;

  const load = useMemo(() => async () => {
    if (!eventId) return;

    const [photoRes, entryRes, resultRes] = await Promise.all([
      supabase
        .from('app_event_photos')
        .select('id, photo_url, caption, uploaded_by')
        .eq('event_id', eventId)
        .eq('moderation_status', 'approved')
        .eq('media_type', 'photo')
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('app_public_contest_entries')
        .select('*')
        .eq('event_id', eventId),
      supabase
        .from('app_public_contest_results')
        .select('*')
        .eq('event_id', eventId),
    ]);

    setPhotos(photoRes.data || []);
    setEntries(entryRes.data || []);
    setResults(resultRes.data || []);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('app_events')
      .select('title')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data?.title) setEventTitle(data.title); });
  }, [eventId]);

  // O telão fica horas ligado sem ninguém por perto: precisa reagir sozinho a
  // foto aprovada e a mudança de estado do concurso.
  //
  // Votos ficam de fora de propósito: o Realtime respeita RLS e o telão roda
  // como anon, que não pode ler app_contest_votes. Assinar essa tabela daria a
  // falsa impressão de tempo real — a contagem chega pelo polling abaixo.
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`telao:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_event_photos' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_event_contests' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_contest_entries' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, load]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (photosRef.current.length ? (i + 1) % photosRef.current.length : 0));
    }, PHOTO_MS);
    return () => clearInterval(timer);
  }, []);

  const published = useMemo(
    () => results.filter(r => r.contest_status === 'published'),
    [results]
  );

  const liveBoard = useMemo(
    () => results.filter(r => r.contest_status === 'voting'),
    [results]
  );

  // Ritmo do polling segue o que está em jogo: com placar ao vivo na tela, uma
  // contagem defasada meio minuto é visível para o público. Sem placar, recarregar
  // de minuto em minuto basta e poupa banda da rede do salão.
  const hasLiveBoard = liveBoard.length > 0;
  useEffect(() => {
    const timer = setInterval(() => load(), hasLiveBoard ? 8000 : 60000);
    return () => clearInterval(timer);
  }, [load, hasLiveBoard]);

  const rank = (rows: PublicResult[]) =>
    [...rows].sort((a, b) => {
      if (Number(b.vote_count) !== Number(a.vote_count)) return Number(b.vote_count) - Number(a.vote_count);
      if (!a.first_vote_at) return 1;
      if (!b.first_vote_at) return -1;
      return Date.parse(a.first_vote_at) - Date.parse(b.first_vote_at);
    });

  // Revelação do vencedor tem prioridade sobre tudo: é o ponto alto da noite
  const winnerContest = useMemo(() => {
    if (published.length === 0) return null;
    const contestId = published[0].contest_id;
    const rows = rank(published.filter(r => r.contest_id === contestId));
    return { title: published[0].contest_title, winner: rows[0], runnersUp: rows.slice(1, 4) };
  }, [published]);

  if (winnerContest?.winner) {
    const { title, winner, runnersUp } = winnerContest;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-gray-900 to-black text-white flex flex-col items-center justify-center p-8 overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4" />
          <p className="text-2xl text-amber-300 mb-2">{title}</p>

          {winner.photo_url && (
            <motion.img
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              src={winner.photo_url}
              alt={winner.participant_name}
              className="w-72 h-72 object-cover rounded-3xl mx-auto mb-6 ring-4 ring-amber-400 shadow-2xl"
            />
          )}

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="text-6xl font-black mb-3"
          >
            {winner.participant_name}
          </motion.h1>
          <p className="text-xl text-gray-300">
            {winner.vote_count} voto{Number(winner.vote_count) !== 1 ? 's' : ''}
          </p>

          {runnersUp.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="mt-10 flex items-center justify-center gap-8 text-gray-400"
            >
              {runnersUp.map((r, i) => (
                <div key={r.entry_id} className="text-center">
                  <p className="text-sm">{i + 2}º</p>
                  <p className="text-lg text-gray-200">{r.participant_name}</p>
                  <p className="text-sm">{r.vote_count}</p>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  const current = photos[index];
  const board = liveBoard.length > 0 ? rank(liveBoard).slice(0, 5) : [];
  const boardTitle = liveBoard[0]?.contest_title;

  // Concurso em votação com resultado lacrado: mostra a disputa sem números
  const sealedEntries = entries.filter(
    e => e.contest_status === 'voting' && !e.show_live_results
  );

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img src={current.photo_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Camera className="w-16 h-16 mx-auto mb-4" />
              <p className="text-2xl">Aguardando as primeiras fotos</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 inset-x-0 p-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold drop-shadow-lg">{eventTitle}</h1>
          <p className="text-gray-300 drop-shadow">Mural do evento</p>
        </div>
        {photos.length > 0 && (
          <p className="text-gray-400 text-lg drop-shadow">
            {index + 1} / {photos.length}
          </p>
        )}
      </div>

      {current?.caption && (
        <div className="absolute bottom-8 left-8 max-w-2xl">
          <p className="text-3xl font-medium drop-shadow-lg">{current.caption}</p>
          {current.uploaded_by && (
            <p className="text-lg text-gray-300 mt-1 drop-shadow">por {current.uploaded_by}</p>
          )}
        </div>
      )}

      {board.length > 0 && (
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute top-28 right-8 w-80 bg-black/70 backdrop-blur rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold truncate">{boardTitle}</h2>
          </div>
          <ol className="space-y-2.5">
            {board.map((r, i) => (
              <li key={r.entry_id} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${i === 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  {i + 1}
                </span>
                {r.photo_url && (
                  <img src={r.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                )}
                <span className="flex-1 truncate">{r.participant_name}</span>
                <span className="font-bold text-lg">{r.vote_count}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {board.length === 0 && sealedEntries.length > 0 && (
        <div className="absolute top-28 right-8 w-80 bg-black/70 backdrop-blur rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold truncate">{sealedEntries[0].contest_title}</h2>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Votação aberta · {sealedEntries.length} concorrentes
          </p>
          <div className="flex -space-x-3">
            {sealedEntries.slice(0, 7).map(e => (
              e.photo_url && (
                <img
                  key={e.entry_id}
                  src={e.photo_url}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-black"
                />
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventTelao;
