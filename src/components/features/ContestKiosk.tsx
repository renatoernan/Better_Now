import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X, QrCode, CheckCircle2, AlertTriangle, WifiOff, CloudUpload, Loader2, Search, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import {
  useEventContests, searchEventParticipants, EventParticipantOption,
} from '../../shared/hooks/hooks/useEventContests';
import { useVoteQueue } from '../../shared/hooks/hooks/useVoteQueue';

type Stage = 'idle' | 'picking' | 'done' | 'error';

/** Volta sozinho para a tela de espera: numa fila, ninguém aperta "próximo". */
const RESET_MS = 3500;

const ContestKiosk: React.FC = () => {
  const { id: eventId, contestId } = useParams<{ id: string; contestId: string }>();
  const navigate = useNavigate();

  const { contests, entriesFor } = useEventContests(eventId || '');
  const contest = contests.find(c => c.id === contestId);
  const entries = entriesFor(contestId || '').filter(e => e.status === 'active');

  const [adminId, setAdminId] = useState<string | null>(null);
  const { pendingCount, online, flushing, castVote, flush } = useVoteQueue(contestId || '', adminId);

  const [stage, setStage] = useState<Stage>('idle');
  const [ticketHash, setTicketHash] = useState('');
  const [voterLabel, setVoterLabel] = useState('');
  const [feedback, setFeedback] = useState<{ title: string; detail?: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualTerm, setManualTerm] = useState('');
  const [manualOptions, setManualOptions] = useState<EventParticipantOption[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<Stage>('idle');
  stageRef.current = stage;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? null));
  }, []);

  const backToIdle = useCallback(() => {
    setStage('idle');
    setTicketHash('');
    setVoterLabel('');
    setFeedback(null);
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(backToIdle, RESET_MS);
  }, [backToIdle]);

  const onScan = useCallback((decoded: string) => {
    if (stageRef.current !== 'idle') return;
    const hash = decoded.trim();
    if (!hash) return;
    setTicketHash(hash);
    setVoterLabel('');
    setStage('picking');
  }, []);

  // Câmera com a mesma estratégia em cascata do check-in digital, que já lida
  // com as recusas de Android e iOS.
  const startScanner = useCallback(async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch { /* scanner já encerrado */ }
        scannerRef.current = null;
      }
      if (!document.getElementById('kiosk-camera')) return;

      const scanner = new Html5Qrcode('kiosk-camera', { verbose: false });
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: (w: number, h: number) => {
          const edge = Math.floor(Math.min(w, h) * 0.7);
          return { width: Math.max(180, edge), height: Math.max(180, edge) };
        },
      };

      let started = false;
      let lastErr: unknown = null;

      try {
        await scanner.start({ facingMode: 'environment' }, config, onScan, () => {});
        started = true;
      } catch (e) { lastErr = e; }

      if (!started) {
        try {
          const devices = await Html5Qrcode.getCameras();
          const cam = devices?.find(d => /back|rear|traseira|environment/i.test(d.label))
            || devices?.[devices.length - 1];
          if (cam) {
            await scanner.start(cam.id, config, onScan, () => {});
            started = true;
          }
        } catch (e) { lastErr = e; }
      }

      if (!started) {
        try {
          await scanner.start({ facingMode: 'user' }, config, onScan, () => {});
          started = true;
        } catch (e) { lastErr = e; }
      }

      if (!started) throw lastErr || new Error('Câmera indisponível');
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Autorize nas configurações do navegador.'
          : 'Não foi possível abrir a câmera. Use a busca por nome.'
      );
    }
  }, [onScan]);

  useEffect(() => {
    if (stage === 'idle') startScanner();
    return () => {
      if (scannerRef.current) {
        const s = scannerRef.current;
        scannerRef.current = null;
        (async () => {
          try {
            if (s.isScanning) await s.stop();
            await s.clear();
          } catch { /* encerrando */ }
        })();
      }
    };
  }, [stage, startScanner]);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  // Busca manual para quem está sem o ingresso à mão
  useEffect(() => {
    if (!manualOpen || !eventId) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await searchEventParticipants(eventId, manualTerm);
        if (active) setManualOptions(res);
      } catch { if (active) setManualOptions([]); }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [manualOpen, manualTerm, eventId]);

  const pickManual = async (option: EventParticipantOption) => {
    const { data } = await supabase
      .from('app_event_tickets')
      .select('qr_code_hash')
      .eq('id', option.ticketId)
      .maybeSingle();

    if (!data?.qr_code_hash) {
      setFeedback({ title: 'Ingresso não encontrado', detail: option.name });
      setStage('error');
      scheduleReset();
      return;
    }
    setTicketHash(data.qr_code_hash);
    setVoterLabel(option.name);
    setManualOpen(false);
    setManualTerm('');
    setStage('picking');
  };

  const vote = async (entryId: string, participantLabel: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const outcome = await castVote(entryId, ticketHash, participantLabel);
      if (outcome.ok) {
        setFeedback({
          title: `Voto em ${participantLabel} registrado`,
          detail: outcome.queued ? 'Sem rede agora — será enviado automaticamente.' : undefined,
        });
        setStage('done');
      } else {
        setFeedback({ title: outcome.message || 'Voto não registrado' });
        setStage('error');
      }
      scheduleReset();
    } finally {
      setSubmitting(false);
    }
  };

  if (!contest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Carregando concurso...</p>
        </div>
      </div>
    );
  }

  const votingOpen = contest.status === 'voting';

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 bg-gray-800/80 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="font-bold truncate">{contest.title}</h1>
          <p className="text-xs text-gray-400">
            {entries.length} candidato{entries.length !== 1 ? 's' : ''}
            {!votingOpen && ' · votação fechada'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!online && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">
              <WifiOff className="w-3.5 h-3.5" /> sem rede
            </span>
          )}
          {pendingCount > 0 && (
            <button
              onClick={flush}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
            >
              {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
              {pendingCount} na fila
            </button>
          )}
          <button
            onClick={() => navigate(`/admin/events/${eventId}/concursos`)}
            className="p-2 hover:bg-white/10 rounded-lg"
            aria-label="Sair do modo tablet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {!votingOpen ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <p className="text-xl font-bold mb-1">Votação não está aberta</p>
            <p className="text-gray-400">
              Mude o estado do concurso para "Votação aberta" para começar a receber votos.
            </p>
          </div>
        </div>
      ) : stage === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black relative mb-6">
            <div id="kiosk-camera" className="w-full h-full" />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
                <p className="text-sm text-amber-300">{cameraError}</p>
              </div>
            )}
          </div>

          <QrCode className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-2xl font-bold mb-1">Aproxime o ingresso</p>
          <p className="text-gray-400 mb-6">Escaneie o QR code para liberar o voto</p>

          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" /> Buscar por nome
          </button>
        </div>
      ) : stage === 'picking' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-3 bg-purple-600/20 flex items-center justify-between flex-shrink-0">
            <p className="text-sm">
              {voterLabel ? <>Votando: <strong>{voterLabel}</strong></> : 'Ingresso reconhecido'}
            </p>
            <button
              onClick={backToIdle}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
              Nenhum candidato inscrito neste concurso ainda.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {entries.map(e => (
                  <button
                    key={e.id}
                    onClick={() => vote(e.id, e.participant_name)}
                    disabled={submitting}
                    className="group relative rounded-xl overflow-hidden bg-gray-800 disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <div className="aspect-square">
                      {e.photo && (
                        <img
                          src={e.photo.photo_url}
                          alt={e.participant_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 px-2 py-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-sm font-medium truncate text-left">{e.participant_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            {stage === 'done' ? (
              <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="w-20 h-20 text-amber-400 mx-auto mb-4" />
            )}
            <p className="text-2xl font-bold mb-2">{feedback?.title}</p>
            {feedback?.detail && <p className="text-gray-400 mb-4">{feedback.detail}</p>}
            <button
              onClick={backToIdle}
              className="mt-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              Próximo participante
            </button>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold">Buscar participante</h3>
              <button onClick={() => setManualOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={manualTerm}
                onChange={(e) => setManualTerm(e.target.value)}
                placeholder="Nome do participante"
                autoFocus
                className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {manualOptions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum participante encontrado.</p>
              ) : (
                <div className="space-y-1.5">
                  {manualOptions.map(o => (
                    <button
                      key={o.ticketId || o.personId}
                      onClick={() => pickManual(o)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-900 hover:bg-gray-700 rounded-xl text-left transition-colors"
                    >
                      <span className="truncate">{o.name}</span>
                      {o.checkedIn && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded flex-shrink-0">
                          check-in
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestKiosk;
