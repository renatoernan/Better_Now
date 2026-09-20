import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X, QrCode, CheckCircle2, AlertTriangle, WifiOff, CloudUpload, Loader2, Search, RotateCcw,
  Camera, Image as ImageIcon, RefreshCw, Vote, Trophy, Trash2,
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import {
  useEventContests, searchEventParticipants, EventParticipantOption, ContestEntry,
} from '../../shared/hooks/hooks/useEventContests';
import { uploadEventPhoto } from '../../shared/hooks/hooks/useEventMural';
import { formatPersonName } from '../../shared/utils/utils/eventAttendees';
import { useVoteQueue } from '../../shared/hooks/hooks/useVoteQueue';

type Stage = 'idle' | 'capture' | 'picking' | 'done' | 'error';
/** O tablet fotografa os candidatos, colhe os votos e mostra a apuração. */
type KioskMode = 'photo' | 'vote' | 'rank';
/** Dentro da votação, o convidado é identificado pelo nome ou pelo QR do ingresso. */
type VoterEntry = 'name' | 'qr';
/** A lista de convidados vive em duas abas: quem falta fotografar e quem já foi. */
type ListTab = 'todo' | 'captured';

interface CaptureTarget {
  option: EventParticipantOption;
  entry?: ContestEntry;
}

/** Volta sozinho para a tela de espera: numa fila, ninguém aperta "próximo". */
const RESET_MS = 3500;

const norm = (v: string) => v.trim().toLowerCase();

const ContestKiosk: React.FC = () => {
  const { id: eventId, contestId } = useParams<{ id: string; contestId: string }>();
  const navigate = useNavigate();

  const {
    contests, entriesFor, promotePhoto, replaceEntryPhoto, removeEntry, resultsFor,
    refetch: refetchContests, refetchEntries, refetchResults,
  } = useEventContests(eventId || '');
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

  // O tablet sempre abre em Fotos: a captura é o trabalho contínuo da equipe,
  // e a votação é escolhida de propósito, mesmo com o concurso já em votação.
  const [mode, setMode] = useState<KioskMode>('photo');
  const [voterEntry, setVoterEntry] = useState<VoterEntry>('name');
  const [listTab, setListTab] = useState<ListTab>('todo');
  const [manualTerm, setManualTerm] = useState('');
  const [manualOptions, setManualOptions] = useState<EventParticipantOption[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  // Check-in e fotos mudam em outros aparelhos durante o evento; o tablet fica
  // horas aberto na mesma tela, então precisa de um recarregar manual.
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Captura de foto no tablet
  const [target, setTarget] = useState<CaptureTarget | null>(null);
  const [sheetFor, setSheetFor] = useState<CaptureTarget | null>(null);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ target: CaptureTarget; votes: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<Stage>('idle');
  stageRef.current = stage;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? null));
  }, []);

  const clearShot = useCallback(() => {
    setShot(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const backToIdle = useCallback(() => {
    setStage('idle');
    setVoterEntry('name');
    setTicketHash('');
    setVoterLabel('');
    setFeedback(null);
    setTarget(null);
    setSheetFor(null);
    setCaptureError(null);
    clearShot();
  }, [clearShot]);

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
    if (stage === 'idle' && mode === 'vote' && voterEntry === 'qr') startScanner();
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
  }, [stage, mode, voterEntry, startScanner]);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  // Prévia ao vivo da captura. Só liga enquanto a foto ainda não foi tirada,
  // para não disputar a câmera com o leitor de QR.
  useEffect(() => {
    if (stage !== 'capture' || shot) return;
    let cancelled = false;

    (async () => {
      setCaptureError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (!cancelled) {
          setCaptureError(
            err?.name === 'NotAllowedError'
              ? 'Permissão de câmera negada. Autorize no navegador ou use "Escolher da galeria".'
              : 'Câmera indisponível neste dispositivo. Use "Escolher da galeria".'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [stage, shot]);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  // A lista de convidados é a mesma da portaria e muda pouco durante o evento:
  // carrega inteira e filtra na memória, em vez de ir ao banco a cada tecla.
  useEffect(() => {
    if (stage !== 'idle' || !eventId) return;
    if (mode === 'vote' && voterEntry !== 'name') return;
    let active = true;
    setManualLoading(true);
    (async () => {
      try {
        const res = await searchEventParticipants(eventId, '');
        if (active) setManualOptions(res);
      } catch { if (active) setManualOptions([]); }
      finally { if (active) setManualLoading(false); }
    })();
    return () => { active = false; };
  }, [stage, mode, voterEntry, eventId, reloadKey]);

  const filteredOptions = useMemo(() => {
    const t = manualTerm.trim().toLowerCase();
    if (!t) return manualOptions;
    return manualOptions.filter(o => o.name.toLowerCase().includes(t));
  }, [manualOptions, manualTerm]);

  // Com o ranking na tela, a apuração precisa acompanhar os votos que chegam
  // dos outros tablets sem alguém tocar em nada.
  useEffect(() => {
    if (mode !== 'rank' || stage !== 'idle') return;
    const t = setInterval(() => { refetchResults(); }, 15000);
    return () => clearInterval(t);
  }, [mode, stage, refetchResults]);

  const refreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refetchContests(), refetchEntries(), refetchResults()]);
      setReloadKey(k => k + 1);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Candidatura ligada a este ingresso. O ingresso é a identidade: duas pessoas
   * do mesmo pedido concorrem separadamente. Pessoa e nome só resolvem as
   * candidaturas antigas, criadas antes de o ingresso ser gravado na entry.
   */
  const entryOf = useCallback(
    (o: EventParticipantOption): ContestEntry | undefined =>
      entries.find(e => o.ticketId && e.participant_ticket_id === o.ticketId)
      || entries.find(e => !e.participant_ticket_id && (
        (o.personId && e.participant_person_id === o.personId)
        || norm(e.participant_name) === norm(o.name)
      )),
    [entries]
  );

  const { todoList, capturedList } = useMemo(() => {
    const todo: CaptureTarget[] = [];
    const captured: CaptureTarget[] = [];
    for (const o of filteredOptions) {
      const entry = entryOf(o);
      if (entry) captured.push({ option: o, entry });
      else todo.push({ option: o });
    }
    return { todoList: todo, capturedList: captured };
  }, [filteredOptions, entryOf]);

  const resolveTicketHash = async (ticketId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('app_event_tickets')
      .select('qr_code_hash')
      .eq('id', ticketId)
      .maybeSingle();
    return data?.qr_code_hash || null;
  };

  const startCapture = (t: CaptureTarget) => {
    setSheetFor(null);
    setTarget(t);
    clearShot();
    setCaptureError(null);
    setStage('capture');
  };

  const startVote = async (o: EventParticipantOption) => {
    // O servidor recusaria depois da escolha do candidato; avisar aqui evita
    // que o convidado percorra a tela inteira para levar um "não".
    if (contest?.require_checkin && !o.checkedIn) {
      setFeedback({
        title: 'Check-in pendente',
        detail: `${o.name} precisa fazer o check-in no evento antes de votar.`,
      });
      setStage('error');
      scheduleReset();
      return;
    }
    const hash = await resolveTicketHash(o.ticketId);
    if (!hash) {
      setFeedback({ title: 'Ingresso não encontrado', detail: o.name });
      setStage('error');
      scheduleReset();
      return;
    }
    setSheetFor(null);
    setTicketHash(hash);
    setVoterLabel(o.name);
    setManualTerm('');
    setStage('picking');
  };

  const takeShot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setShot({ file, url: URL.createObjectURL(file) });
    }, 'image/jpeg', 0.9);
  };

  const pickFromGallery = (file?: File | null) => {
    if (!file) return;
    setShot({ file, url: URL.createObjectURL(file) });
  };

  const saveShot = async () => {
    if (!shot || !target || !eventId || !contestId || saving) return;
    setSaving(true);
    try {
      const photo = await uploadEventPhoto(eventId, shot.file, {
        source: 'admin',
        moderationStatus: 'approved',
        caption: target.option.name,
        ticketId: target.option.ticketId || null,
        personId: target.option.personId || null,
      });

      if (target.entry) {
        await replaceEntryPhoto(target.entry.id, photo.id);
      } else {
        await promotePhoto(contestId, photo.id, {
          name: target.option.name,
          personId: target.option.personId,
          ticketId: target.option.ticketId,
        });
      }

      setFeedback({
        title: target.entry ? 'Foto substituída' : 'Foto registrada',
        detail: target.option.name,
      });
      setStage('done');
      setListTab('captured');
      clearShot();
      setTarget(null);
      scheduleReset();
    } catch (err: any) {
      setCaptureError(err?.message || 'Não foi possível salvar a foto.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Excluir a candidatura leva junto os votos (cascade no banco), então quando
   * já existe voto a equipe decide de olho no número, e não às cegas.
   */
  const askDelete = (t: CaptureTarget) => {
    if (!t.entry) return;
    const votes = resultsFor(t.entry.contest_id).find(r => r.entry_id === t.entry!.id)?.vote_count ?? 0;
    setSheetFor(null);
    setConfirmDelete({ target: t, votes });
  };

  const doDelete = async () => {
    if (!confirmDelete?.target.entry || deleting) return;
    setDeleting(true);
    try {
      await removeEntry(confirmDelete.target.entry.id);
      setFeedback({
        title: 'Foto removida do concurso',
        detail: confirmDelete.votes > 0
          ? `${confirmDelete.target.option.name} · ${confirmDelete.votes} voto${confirmDelete.votes !== 1 ? 's' : ''} excluído${confirmDelete.votes !== 1 ? 's' : ''}`
          : confirmDelete.target.option.name,
      });
      setConfirmDelete(null);
      setStage('done');
      setListTab('todo');
      scheduleReset();
    } catch (err: any) {
      setConfirmDelete(null);
      setFeedback({ title: 'Não foi possível remover', detail: err?.message });
      setStage('error');
      scheduleReset();
    } finally {
      setDeleting(false);
    }
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
  const visible = listTab === 'todo' ? todoList : capturedList;
  const requiresCheckin = contest.require_checkin;
  const ranking = resultsFor(contest.id).map(r => ({
    ...r,
    photoUrl: entries.find(e => e.id === r.entry_id)?.photo?.photo_url,
  }));
  const totalVotes = ranking.reduce((sum, r) => sum + r.vote_count, 0);
  // Na votação a ordem alfabética da busca ajuda mais que agrupar por foto.
  const voterList: CaptureTarget[] = filteredOptions.map(o => ({ option: o, entry: entryOf(o) }));

  /**
   * Quem ainda não foi fotografado vira um card só de nome — miniatura vazia ali
   * é ruído e ocupa o espaço que acelera achar o convidado.
   */
  const nameCard = (
    t: CaptureTarget,
    onPick: (t: CaptureTarget) => void,
    showEligibility = false
  ) => {
    const photo = t.entry?.photo?.photo_url;
    const blocked = showEligibility && requiresCheckin && !t.option.checkedIn;
    return (
      <button
        key={t.option.ticketId}
        onClick={() => onPick(t)}
        className={`flex flex-col items-center gap-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors active:scale-[0.97] text-center ${
          photo ? 'p-2' : 'px-2 py-3 justify-center min-h-[80px]'
        } ${blocked ? 'opacity-60' : ''}`}
      >
        {photo && (
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
            <img
              src={photo}
              alt={t.option.name}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <span className="text-xs font-medium leading-tight line-clamp-3 w-full">{t.option.name}</span>
        {showEligibility && (
          t.option.checkedIn ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded-full">
              apto
            </span>
          ) : (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                requiresCheckin ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              sem check-in
            </span>
          )
        )}
      </button>
    );
  };

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
          <div className="flex bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setMode('photo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'photo' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Fotos
            </button>
            <button
              onClick={() => votingOpen && setMode('vote')}
              disabled={!votingOpen}
              title={votingOpen ? undefined : 'Abra a votação do concurso para colher votos'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'vote' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <Vote className="w-3.5 h-3.5" /> Votação
            </button>
            <button
              onClick={() => setMode('rank')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'rank' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Ranking
            </button>
          </div>
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
            onClick={refreshAll}
            disabled={refreshing}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
            aria-label="Atualizar lista"
            title="Atualizar lista de convidados e fotos"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/concursos`)}
            className="p-2 hover:bg-white/10 rounded-lg"
            aria-label="Sair do modo tablet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {stage === 'idle' ? (
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
          <div className={`w-full mx-auto flex-1 flex flex-col min-h-0 ${mode === 'rank' ? 'max-w-2xl' : 'max-w-3xl'}`}>
            {mode === 'rank' ? (
              <>
                <div className="flex items-end justify-between flex-shrink-0 mb-3">
                  <div>
                    <p className="text-xl font-bold">Apuração</p>
                    <p className="text-sm text-gray-400">
                      {totalVotes} voto{totalVotes !== 1 ? 's' : ''} até agora
                      {pendingCount > 0 && ` · ${pendingCount} na fila deste tablet`}
                    </p>
                  </div>
                  <button
                    onClick={refreshAll}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {ranking.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">Nenhum voto registrado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {ranking.map((r, i) => {
                        const share = totalVotes ? Math.round((r.vote_count / totalVotes) * 100) : 0;
                        const medal = ['bg-amber-400 text-gray-900', 'bg-gray-300 text-gray-900', 'bg-amber-700 text-white'][i];
                        return (
                          <div
                            key={r.entry_id}
                            className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-xl"
                          >
                            <span
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                                medal || 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {i + 1}
                            </span>
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                              {r.photoUrl && (
                                <img
                                  src={r.photoUrl}
                                  alt={r.participant_name}
                                  loading="lazy"
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{formatPersonName(r.participant_name)}</p>
                              <div className="h-1.5 mt-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: `${share}%` }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold leading-none">{r.vote_count}</p>
                              <p className="text-[10px] text-gray-400">{share}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : mode === 'photo' ? (
              <>
                <div className="flex gap-2 flex-shrink-0 mb-3">
                  <button
                    onClick={() => setListTab('todo')}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      listTab === 'todo' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Capturar ({todoList.length})
                  </button>
                  <button
                    onClick={() => setListTab('captured')}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      listTab === 'captured' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Fotos capturadas ({capturedList.length})
                  </button>
                </div>

                <div className="relative flex-shrink-0 mb-3">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualTerm}
                    onChange={(e) => setManualTerm(e.target.value)}
                    placeholder="Buscar pelo nome"
                    className="w-full pl-11 pr-3 py-3 bg-gray-800 border border-white/10 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {visible.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">
                      {manualLoading
                        ? 'Carregando convidados...'
                        : listTab === 'todo'
                          ? 'Todos os convidados desta busca já foram fotografados.'
                          : 'Nenhuma foto capturada ainda.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {visible.map(t => nameCard(t, x => (x.entry ? setSheetFor(x) : startCapture(x))))}
                    </div>
                  )}
                </div>
              </>
            ) : voterEntry === 'name' ? (
              <>
                <div className="flex-shrink-0 mb-3">
                  <p className="text-xl font-bold">Quem está votando?</p>
                  <p className="text-sm text-gray-400">Toque no seu nome para liberar o voto.</p>
                </div>

                <div className="relative flex-shrink-0 mb-3">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualTerm}
                    onChange={(e) => setManualTerm(e.target.value)}
                    placeholder="Buscar pelo nome"
                    className="w-full pl-11 pr-3 py-3 bg-gray-800 border border-white/10 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {voterList.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">
                      {manualLoading ? 'Carregando convidados...' : 'Nenhum convidado encontrado.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {voterList.map(t => nameCard(t, x => startVote(x.option), true))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setVoterEntry('qr')}
                  className="mt-4 flex-shrink-0 self-center flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <QrCode className="w-4 h-4" /> Ler QR code do ingresso
                </button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
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
                  onClick={() => setVoterEntry('name')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <Search className="w-4 h-4" /> Voltar para a lista de nomes
                </button>
              </div>
            )}
          </div>
        </div>
      ) : stage === 'capture' ? (
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0 mb-3">
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{target?.option.name}</p>
                <p className="text-xs text-gray-400">
                  {target?.entry ? 'Substituindo a foto atual' : 'Nova foto para o concurso'}
                </p>
              </div>
              <button
                onClick={backToIdle}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>

            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black flex-shrink-0">
              {shot ? (
                <img src={shot.url} alt="Foto capturada" className="w-full h-full object-contain" />
              ) : (
                <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
              )}
              {captureError && !shot && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
                  <p className="text-sm text-amber-300">{captureError}</p>
                </div>
              )}
            </div>

            {captureError && shot && (
              <p className="text-sm text-amber-300 text-center mt-3">{captureError}</p>
            )}

            <div className="mt-4 flex-shrink-0 space-y-3">
              {shot ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { clearShot(); setCaptureError(null); }}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" /> Refazer
                  </button>
                  <button
                    onClick={saveShot}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {target?.entry ? 'Substituir' : 'Usar foto'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={takeShot}
                  disabled={Boolean(captureError)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-lg font-medium disabled:opacity-40"
                >
                  <Camera className="w-5 h-5" /> Tirar foto
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-300 disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4" /> Escolher da galeria
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { pickFromGallery(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          </div>
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
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 px-2 py-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-sm font-medium truncate text-left">{formatPersonName(e.participant_name)}</p>
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

      {/* Convidado já fotografado: revê a foto, substitui ou libera o voto */}
      {sheetFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold truncate">{sheetFor.option.name}</h3>
              <button onClick={() => setSheetFor(null)} className="p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sheetFor.entry?.photo?.photo_url && (
              <img
                src={sheetFor.entry.photo.photo_url}
                alt={sheetFor.option.name}
                className="w-full aspect-square object-contain bg-gray-900"
              />
            )}

            <div className="p-4 space-y-2">
              <button
                onClick={() => startCapture(sheetFor)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium"
              >
                <RefreshCw className="w-4 h-4" /> Substituir foto
              </button>
              <button
                onClick={() => askDelete(sheetFor)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl"
              >
                <Trash2 className="w-4 h-4" /> Excluir foto
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-bold">Excluir a foto de {confirmDelete.target.option.name}?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {confirmDelete.votes > 0 ? (
                    <>
                      Esta foto já recebeu <strong>{confirmDelete.votes} voto{confirmDelete.votes !== 1 ? 's' : ''}</strong>.
                      Remover do concurso apaga esses votos, e quem votou nela poderá votar de novo.
                    </>
                  ) : (
                    <>
                      A foto sai do concurso e o convidado volta para a lista "Capturar".
                      A imagem continua no acervo do evento.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {confirmDelete.votes > 0
                  ? `Remover e excluir ${confirmDelete.votes} voto${confirmDelete.votes !== 1 ? 's' : ''}`
                  : 'Excluir do concurso'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-50"
              >
                {confirmDelete.votes > 0 ? 'Manter no concurso' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestKiosk;
