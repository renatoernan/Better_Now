import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  UserCheck,
  UserX,
  Search,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Camera,
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ticket,
  ShieldCheck,
  Phone,
  CreditCard,
  Hash,
  Sparkles,
  ArrowRight,
  User,
  Video,
  VideoOff,
  FlipHorizontal,
  X,
  Lock,
  HelpCircle,
  Volume2,
  AlertTriangle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../shared/services/lib/supabase';
import { useSupabaseEvents } from '../../shared/hooks/hooks/useSupabaseEvents';
import { toast } from 'sonner';

interface DigitalCheckInProps {
  eventId: string;
}

interface TicketWithOrder {
  id: string;
  order_id: string;
  event_id: string;
  ticket_number: string | number;
  qr_code_hash: string;
  status: 'valid' | 'used' | 'cancelled';
  used_at?: string;
  created_at: string;
  person?: {
    id?: string;
    nome: string;
    documento?: string;
    whatsapp?: string;
    email?: string;
  };
  holder_name?: string;
  holder_document?: string;
  holder_phone?: string;
  holder_email?: string;
  order?: {
    id: string;
    client_name?: string;
    client_document?: string;
    client_phone?: string;
    client_email?: string;
    batch_name?: string;
    amount_total?: number;
    quantity?: number;
    status?: string;
    cancellation_reason?: string;
  };
}

/**
 * Emite som característico de sucesso na leitura do QR Code / Check-in realizado
 * Utiliza a Web Audio API nativa com harmônicos suaves
 */
export const playSuccessBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Se estiver em estado suspenso (política do navegador), resume
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Nota 1 (G5 - 784Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Nota 2 (C6 - 1046.5Hz) - Toque de confirmação ascendente
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.10);
    gain2.gain.setValueAtTime(0, now + 0.10);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.42);

    // Vibração tátil no celular se suportado
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([70, 30, 100]);
    }
  } catch (err) {
    console.warn('Não foi possível emitir som de confirmação:', err);
  }
};

/**
 * Emite som de aviso caso o ingresso já tenha sido usado
 */
export const playWarningBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([180]);
    }
  } catch (_) {}
};

/**
 * Mascara parcialmente o CPF: 123.***.***-45
 */
export const maskCpf = (cpf?: string): string => {
  if (!cpf) return 'Não informado';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
};

/**
 * Mascara parcialmente o Telefone: (11) 9****-4511
 */
export const maskPhone = (phone?: string): string => {
  if (!phone) return 'Não informado';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ****-${digits.slice(6)}`;
  }
  return phone;
};

const DigitalCheckIn: React.FC<DigitalCheckInProps> = ({ eventId }) => {
  const { events, fetchEvents } = useSupabaseEvents();
  
  const [tickets, setTickets] = useState<TicketWithOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modos de Check-in: 'camera' | 'code' | 'name' | 'list'
  const [checkInMode, setCheckInMode] = useState<'camera' | 'code' | 'name' | 'list'>('camera');
  
  // Inputs de busca
  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  
  // Estado do leitor de câmera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  
  // Ingresso selecionado para conferência e ingresso confirmado com sucesso
  const [selectedTicket, setSelectedTicket] = useState<TicketWithOrder | null>(null);
  const [checkInSuccessTicket, setCheckInSuccessTicket] = useState<TicketWithOrder | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isProcessingScanRef = useRef(false);

  // Carregar ingressos reais do evento
  const loadEventTickets = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // 1. Buscar ingressos do evento trazendo dados da pessoa associada
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('app_event_tickets')
        .select(`
          *,
          person:app_people(id, nome, documento, whatsapp, email)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ticketsErr) throw ticketsErr;

      // 2. Buscar ordens relacionadas para enriquecer com dados do comprador e participantes nominais
      const orderIds = Array.from(new Set((ticketsData || []).map(t => t.order_id).filter(Boolean)));
      let ordersMap: Record<string, any> = {};

      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('app_event_orders')
          .select('id, client_name, client_document, client_phone, client_email, batch_name, amount_total, quantity, status, cancellation_reason')
          .in('id', orderIds);

        (ordersData || []).forEach(o => {
          ordersMap[o.id] = o;
        });
      }

      // 3. Desduplicar tickets por (order_id, ticket_number) caso existam duplicatas no banco
      const seenTicketKeys = new Set<string>();
      const deduplicatedTickets = (ticketsData || []).filter(t => {
        const key = `${t.order_id}-${t.ticket_number}`;
        if (seenTicketKeys.has(key)) return false;
        seenTicketKeys.add(key);
        return true;
      });

      // 4. Montar lista de ingressos enriquecidos priorizando o titular nominal
      const enriched: TicketWithOrder[] = deduplicatedTickets.map(t => {
        const order = ordersMap[t.order_id];
        const ticketIdx = Math.max(0, (Number(t.ticket_number) || 1) - 1);

        let attendeeData: any = null;
        if (order?.cancellation_reason && order.cancellation_reason.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(order.cancellation_reason);
            if (Array.isArray(parsed) && parsed[ticketIdx]) {
              attendeeData = parsed[ticketIdx];
            }
          } catch {}
        }

        const holderName = t.person?.nome || attendeeData?.nome || (ticketIdx === 0 ? order?.client_name : null) || `Participante ${ticketIdx + 1}`;
        const holderDoc = t.person?.documento || attendeeData?.documento || attendeeData?.cpf || (ticketIdx === 0 ? order?.client_document : null);
        const holderPhone = t.person?.whatsapp || attendeeData?.whatsapp || attendeeData?.telefone || (ticketIdx === 0 ? order?.client_phone : null);
        const holderEmail = t.person?.email || attendeeData?.email || (ticketIdx === 0 ? order?.client_email : null);

        return {
          ...t,
          holder_name: holderName,
          holder_document: holderDoc,
          holder_phone: holderPhone,
          holder_email: holderEmail,
          order: order || undefined
        };
      });

      setTickets(enriched);
    } catch (err) {
      console.error('Erro ao carregar ingressos para check-in:', err);
      toast.error('Erro ao carregar ingressos do evento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    loadEventTickets();
  }, [eventId]);

  const currentEvent = events.find(e => e.id === eventId);

  // Gerenciamento da Câmera com Html5Qrcode com Estratégia em Cascata Resiliente para Android/iOS
  const startCameraScanner = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setCameraLoading(true);

    try {
      // 1. Limpar scanner prévio se existir
      if (qrScannerRef.current) {
        try {
          if (qrScannerRef.current.isScanning) {
            await qrScannerRef.current.stop();
          }
          await qrScannerRef.current.clear();
        } catch (_) {}
        qrScannerRef.current = null;
      }

      // 2. Garantir elemento do viewport no DOM
      const viewportEl = document.getElementById('qr-camera-viewport');
      if (!viewportEl) {
        throw new Error('Elemento de visualização da câmera não encontrado');
      }

      const scanner = new Html5Qrcode('qr-camera-viewport', {
        verbose: false
      });
      qrScannerRef.current = scanner;

      // Configuração sem forçar aspectRatio rígido para compatibilidade total com Android
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return {
            width: Math.max(180, qrboxSize),
            height: Math.max(180, qrboxSize)
          };
        }
      };

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleProcessScan(decodedText);
      };

      // 3. Estratégia de Inicialização em Cascata (Previne NotReadableError)
      let started = false;
      let lastErr: any = null;

      // Tentativa 1: facingMode direto (Padrão WebRTC recomendado)
      try {
        await scanner.start(
          { facingMode: mode },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
        started = true;
      } catch (err1) {
        console.warn('Tentativa 1 com facingMode falhou:', err1);
        lastErr = err1;
      }

      // Tentativa 2: Se falhou e era environment, tenta enumerar câmeras traseiras
      if (!started) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const targetCam = mode === 'environment'
              ? (devices.find(d => /back|rear|traseira|environment/i.test(d.label)) || devices[devices.length - 1])
              : (devices.find(d => /front|user|frontal/i.test(d.label)) || devices[0]);

            if (targetCam) {
              await scanner.start(
                targetCam.id,
                config,
                qrCodeSuccessCallback,
                () => {}
              );
              started = true;
            }
          }
        } catch (err2) {
          console.warn('Tentativa 2 com deviceId falhou:', err2);
          lastErr = err2;
        }
      }

      // Tentativa 3: Fallback sem restrições de câmera
      if (!started) {
        try {
          await scanner.start(
            { facingMode: 'user' },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        } catch (err3) {
          console.warn('Tentativa 3 frontal falhou:', err3);
          lastErr = err3;
        }
      }

      if (!started) {
        throw lastErr || new Error('Não foi possível iniciar o feed de vídeo da câmera');
      }

      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setCameraActive(false);
      
      const errString = String(err?.message || err || '');
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || errString.includes('Permission') || errString.includes('NotAllowed')) {
        setCameraError('Permissão de acesso à câmera negada. Toque no ícone de configurações 🔒 do navegador para autorizar a Câmera.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || errString.includes('NotFound')) {
        setCameraError('Nenhuma câmera foi encontrada neste dispositivo.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError' || errString.includes('NotReadable') || errString.includes('Could not start video source')) {
        setCameraError('O sensor da câmera está ocupado ou não pôde ser iniciado diretamente pelo navegador. Você pode usar a opção "2. Foto na Câmera do Celular" abaixo.');
      } else {
        setCameraError(`Não foi possível iniciar a câmera: ${err?.message || 'Utilize a opção de foto do celular abaixo.'}`);
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (err) {
        console.warn('Aviso ao parar scanner de câmera:', err);
      }
      qrScannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Alternar câmera (traseira/frontal)
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      await stopCameraScanner();
      await startCameraScanner(nextMode);
    }
  };

  // Limpeza ao trocar de modo ou desmontar
  useEffect(() => {
    if (checkInMode !== 'camera') {
      stopCameraScanner();
    }

    if (checkInMode === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
    if (checkInMode === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [checkInMode]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Estatísticas
  const totalTickets = tickets.length;
  const checkedInTickets = tickets.filter(t => t.status === 'used' || Boolean(t.used_at)).length;
  const validTickets = tickets.filter(t => t.status === 'valid' && !t.used_at).length;
  const checkInRate = totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0;

  // Fechar Modal e reativar leitor se aplicável
  const handleCloseModal = () => {
    setSelectedTicket(null);
    isProcessingScanRef.current = false;
    if (checkInMode === 'camera') {
      setTimeout(() => {
        startCameraScanner(facingMode);
      }, 250);
    }
  };

  // Processar busca / leitura de código QR (Prevenção de repetição em loop e som contínuo)
  const handleProcessScan = async (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean || isProcessingScanRef.current) return;

    isProcessingScanRef.current = true;

    // Pausar imediatamente o leitor de vídeo para evitar looping de detecção a cada frame
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (_) {}
      setCameraActive(false);
    }

    const found = tickets.find(t => 
      t.qr_code_hash.toLowerCase() === clean.toLowerCase() ||
      t.id.toLowerCase() === clean.toLowerCase() ||
      String(t.ticket_number).toLowerCase() === clean.toLowerCase() ||
      t.qr_code_hash.toLowerCase().includes(clean.toLowerCase())
    );

    if (found) {
      setSelectedTicket(found);
      setCodeQuery('');
      if (found.status === 'used' || found.used_at) {
        playWarningBeep();
        toast.warning('Atenção: Este ingresso já realizou check-in anteriormente!');
      } else {
        playSuccessBeep();
        toast.success('Ingresso identificado com sucesso!');
      }
    } else {
      playWarningBeep();
      toast.error(`Nenhum ingresso localizado com o código: ${clean}`);
      // Libera após 2s caso não localize
      setTimeout(() => {
        isProcessingScanRef.current = false;
        if (checkInMode === 'camera') {
          startCameraScanner(facingMode);
        }
      }, 2000);
    }
  };

  // Lista filtrada por nome no modo de busca por titular
  const nameFilteredTickets = tickets.filter(t => {
    const term = nameQuery.toLowerCase().trim();
    if (!term) return false;
    const holderName = (t.holder_name || t.person?.nome || t.order?.client_name || '').toLowerCase();
    const holderDoc = (t.holder_document || t.person?.documento || t.order?.client_document || '').toLowerCase();
    const buyerName = (t.order?.client_name || '').toLowerCase();
    const buyerDoc = (t.order?.client_document || '').toLowerCase();
    return (
      holderName.includes(term) ||
      holderDoc.includes(term) ||
      buyerName.includes(term) ||
      buyerDoc.includes(term)
    );
  });

  // Lista geral de ingressos filtrada
  const listFilteredTickets = tickets.filter(t => {
    const term = listSearchQuery.toLowerCase().trim();
    if (!term) return true;

    const holderName = (t.holder_name || t.person?.nome || t.order?.client_name || '').toLowerCase();
    const holderDoc = (t.holder_document || t.person?.documento || t.order?.client_document || '').toLowerCase();
    const holderPhone = (t.holder_phone || t.person?.whatsapp || t.order?.client_phone || '').toLowerCase();
    const buyerName = (t.order?.client_name || '').toLowerCase();
    const buyerPhone = (t.order?.client_phone || '').toLowerCase();
    const buyerDoc = (t.order?.client_document || '').toLowerCase();
    const hash = (t.qr_code_hash || '').toLowerCase();
    const num = String(t.ticket_number || '').toLowerCase();
    const batch = (t.order?.batch_name || '').toLowerCase();

    return (
      holderName.includes(term) ||
      holderDoc.includes(term) ||
      holderPhone.includes(term) ||
      buyerName.includes(term) ||
      buyerPhone.includes(term) ||
      buyerDoc.includes(term) ||
      hash.includes(term) ||
      num.includes(term) ||
      batch.includes(term)
    );
  });

  // Preparar próxima leitura pela câmera
  const handlePrepareNextScan = () => {
    setCheckInSuccessTicket(null);
    setSelectedTicket(null);
    isProcessingScanRef.current = false;
    setCheckInMode('camera');
    setTimeout(() => {
      startCameraScanner(facingMode);
    }, 250);
  };

  // Realizar Check-in do Ingresso
  const handleConfirmCheckIn = async (ticketId: string) => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('app_event_tickets')
        .update({
          status: 'used',
          used_at: nowIso
        })
        .eq('id', ticketId);

      if (error) throw error;

      playSuccessBeep();
      
      const updatedTicket: TicketWithOrder = selectedTicket && selectedTicket.id === ticketId
        ? { ...selectedTicket, status: 'used', used_at: nowIso }
        : tickets.find(t => t.id === ticketId)
          ? { ...tickets.find(t => t.id === ticketId)!, status: 'used', used_at: nowIso }
          : { id: ticketId, event_id: eventId, order_id: '', ticket_number: 1, qr_code_hash: '', status: 'used', used_at: nowIso, created_at: nowIso } as any;

      // Atualizar lista local
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'used', used_at: nowIso } : t
      ));

      // Fecha o modal de conferência e abre o modal de sucesso com botão de próxima leitura
      setSelectedTicket(null);
      setCheckInSuccessTicket(updatedTicket);
    } catch (err) {
      console.error('Erro ao confirmar check-in:', err);
      toast.error('Não foi possível confirmar o check-in');
    } finally {
      setLoading(false);
    }
  };

  // Desfazer Check-in do Ingresso
  const handleUndoCheckIn = async (ticketId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_event_tickets')
        .update({
          status: 'valid',
          used_at: null
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.info('Check-in desfeito. Ingresso revalidado.');
      
      // Atualizar lista local
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'valid', used_at: undefined } : t
      ));

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'valid', used_at: undefined });
      }
    } catch (err) {
      console.error('Erro ao desfazer check-in:', err);
      toast.error('Erro ao desfazer check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
      {/* Header com Informações do Evento e Ações */}
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold truncate">Portaria & Check-in</h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                {currentEvent?.title || 'Gerenciamento de Entrada'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playSuccessBeep();
                toast.success('🔊 Som de validação testado com sucesso!');
              }}
              className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 text-emerald-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Testar som de confirmação"
            >
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Testar Som</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadEventTickets();
              }}
              disabled={loading || refreshing}
              className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
              title="Atualizar lista de ingressos"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Estatísticas Rápidas em Cards Responsivos para Mobile (2x2) e Desktop (4 colunas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-300 font-medium">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Check-ins</span>
            </div>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">{checkedInTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-300 font-medium">
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Aguardando</span>
            </div>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">{validTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-300 font-medium">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Total Emitidos</span>
            </div>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">{totalTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-purple-300 font-medium">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Presença</span>
            </div>
            <p className="text-lg sm:text-2xl font-black text-white mt-0.5">{checkInRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Barra de Seleção dos 3 Métodos de Check-in em Grid 2x2 para Mobile e Linha para Desktop (Sem rolagem horizontal) */}
      <div className="bg-slate-50 border-b border-gray-200/80 p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCheckInMode('camera')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              checkInMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="truncate">1. Câmera QR</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('code')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              checkInMode === 'code'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Hash className="w-4 h-4 shrink-0" />
            <span className="truncate">2. Código</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('name')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              checkInMode === 'name'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">3. Titular</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('list')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              checkInMode === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            <span className="truncate">Ingressos ({totalTickets})</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* MODO 1: SCANNER DE CÂMERA (LEITURA QR CODE AO VIVO) */}
        {checkInMode === 'camera' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl space-y-4 text-center">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  {cameraActive ? (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Câmera Ao Vivo</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Scanner Desativado</span>
                  )}
                </div>

                {cameraActive && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Alternar Câmera Frontal / Traseira"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">Inverter</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      className="p-1.5 sm:p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Pausar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Container do Leitor de Câmera (Sempre no DOM com dimensões reais) */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black max-w-[290px] sm:max-w-xs mx-auto border-2 border-slate-700 shadow-inner h-72 sm:h-80 flex items-center justify-center">
                {/* Viewport onde o Html5Qrcode renderiza o stream de vídeo */}
                <div id="qr-camera-viewport" className="w-full h-full" />

                {/* Laser de leitura animado quando a câmera estiver ativa */}
                {cameraActive && (
                  <div className="absolute inset-x-6 top-1/2 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/90 animate-pulse pointer-events-none z-10" />
                )}

                {/* Card de ativação inicial (Overlay Absoluto) */}
                {!cameraActive && (
                  <div className="absolute inset-0 bg-slate-900/95 z-20 p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-white">Leitor de QR Code</h3>
                      <p className="text-xs text-slate-300 max-w-[220px] mx-auto">
                        Toque no botão abaixo para abrir a câmera da portaria
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startCameraScanner(facingMode)}
                      disabled={cameraLoading}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {cameraLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Iniciando Câmera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Ativar Câmera da Portaria</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-200 text-left space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">Aviso sobre o acesso à câmera:</p>
                      <p className="text-amber-200/90 mt-0.5 leading-relaxed">{cameraError}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/30 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCheckInMode('code')}
                      className="text-amber-300 underline font-semibold text-[11px] cursor-pointer"
                    >
                      Digitar Código do Ingresso
                    </button>
                    <button
                      type="button"
                      onClick={() => startCameraScanner(facingMode)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Aponte para o <strong>QR Code do Ingresso</strong> impresso ou na tela do celular do participante.
              </p>
            </div>
          </div>
        )}

        {/* MODO 2: DIGITAÇÃO DO CÓDIGO DO INGRESSO */}
        {checkInMode === 'code' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xs text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <Hash className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Digitação de Código / Leitor USB</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Digite o código hash do ingresso ou número e toque em Localizar
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScan(codeQuery);
                }}
                className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    placeholder="Ex: BN-5BB8A2D1... ou #1"
                    value={codeQuery}
                    onChange={(e) => setCodeQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!codeQuery.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Localizar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODO 3: DIGITAÇÃO DO NOME DO TITULAR DO INGRESSO */}
        {checkInMode === 'name' && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-2xs shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Buscar por Nome do Titular</h3>
                  <p className="text-xs text-gray-500">
                    Digite o nome do titular ou comprador para localizar o ingresso
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="Digite o nome do titular do ingresso ou comprador..."
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
              </div>

              {/* Resultados da busca por nome */}
              {nameQuery.trim() && (
                <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {nameFilteredTickets.length} participante(s) encontrado(s):
                  </p>

                  {nameFilteredTickets.map((t) => {
                    const isChecked = t.status === 'used' || Boolean(t.used_at);
                    const holder = t.holder_name || t.person?.nome || t.order?.client_name || 'Nome não informado';
                    const isDifferentFromBuyer = t.order?.client_name && t.order.client_name.trim().toLowerCase() !== holder.trim().toLowerCase();

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {holder}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
                            <span className="font-semibold text-purple-950">Ingresso #{t.ticket_number}</span>
                            <span>•</span>
                            <span>{t.order?.batch_name || 'Lote Padrão'}</span>
                            {isDifferentFromBuyer && (
                              <>
                                <span>•</span>
                                <span className="text-gray-400">Comprador: {t.order?.client_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isChecked
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isChecked ? 'Utilizado' : 'Válido'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}

                  {nameFilteredTickets.length === 0 && (
                    <div className="text-center py-5 text-gray-400 text-xs font-medium">
                      Nenhum titular encontrado com o termo "{nameQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE CONFERÊNCIA DE TITULARIDADE NA PORTARIA (Centralizado em Tela Cheia) */}
        {selectedTicket && (() => {
          const isUsed = selectedTicket.status === 'used' || Boolean(selectedTicket.used_at);

          return (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
              <div className={`bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-w-md w-full animate-scaleIn border-2 ${
                isUsed
                  ? 'border-red-500 shadow-red-500/20'
                  : 'border-emerald-500 shadow-emerald-500/20'
              }`}>
                {/* Cabeçalho do Ingresso */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 border shadow-inner ${
                      isUsed
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {isUsed ? <AlertTriangle className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-tight ${
                        isUsed ? 'text-red-950' : 'text-emerald-950'
                      }`}>
                        INGRESSO #{selectedTicket.ticket_number}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Lote: <span className="font-bold text-gray-800">{selectedTicket.order?.batch_name || 'Lote Padrão'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1 border ${
                      isUsed
                        ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-600/30 animate-pulse'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}>
                      {isUsed ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          JÁ UTILIZADO
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          VÁLIDO
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Banner de Alerta Vermelho Destacado quando já utilizado */}
                {isUsed && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3.5 flex items-start gap-3 text-red-900 shadow-xs">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div className="space-y-0.5 text-xs min-w-0">
                      <p className="font-black text-red-700 text-sm tracking-tight">ATENÇÃO: INGRESSO JÁ UTILIZADO!</p>
                      <p className="text-red-800 font-medium leading-snug">
                        Este ingresso já realizou check-in às{' '}
                        <strong className="text-red-950 bg-red-200/60 px-1 py-0.5 rounded">
                          {selectedTicket.used_at ? new Date(selectedTicket.used_at).toLocaleTimeString('pt-BR') : 'horário anterior'}
                        </strong>
                        . Não autorize entrada duplicada.
                      </p>
                    </div>
                  </div>
                )}

                {/* Caixa de Conferência de Titularidade */}
                <div className={`rounded-2xl p-3.5 sm:p-4 border space-y-2.5 ${
                  isUsed
                    ? 'bg-red-50/40 border-red-200/70'
                    : 'bg-slate-50/90 border-gray-200/80'
                }`}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    CONFERÊNCIA DE TITULARIDADE NA PORTARIA:
                  </span>

                  <div className="space-y-2">
                    {/* Nome do Titular Nominal */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">NOME DO TITULAR (INGRESSO)</p>
                      <p className="text-sm sm:text-base font-extrabold text-gray-900 mt-0.5 truncate">
                        {selectedTicket.holder_name || selectedTicket.person?.nome || selectedTicket.order?.client_name || 'Nome não informado'}
                      </p>
                      {selectedTicket.order?.client_name && selectedTicket.order.client_name.trim().toLowerCase() !== (selectedTicket.holder_name || selectedTicket.person?.nome || '').trim().toLowerCase() && (
                        <p className="text-[11px] text-purple-700 font-semibold mt-1">
                          Comprador do Pedido: {selectedTicket.order.client_name}
                        </p>
                      )}
                    </div>

                    {/* Grid CPF e Telefone Mascarados */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-200/70 shadow-2xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CPF DO TITULAR</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 mt-0.5 truncate">
                          {maskCpf(selectedTicket.holder_document || selectedTicket.person?.documento || selectedTicket.order?.client_document)}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-gray-200/70 shadow-2xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TELEFONE DO TITULAR</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 mt-0.5 truncate">
                          {maskPhone(selectedTicket.holder_phone || selectedTicket.person?.whatsapp || selectedTicket.order?.client_phone)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-200/60 flex-wrap gap-1">
                    <span className="font-mono truncate max-w-[200px]">{selectedTicket.qr_code_hash}</span>
                    {selectedTicket.used_at && (
                      <span className="text-red-800 font-bold bg-red-100/90 px-2 py-0.5 rounded-md">
                        Entrada às {new Date(selectedTicket.used_at).toLocaleTimeString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2.5 justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Voltar
                  </button>

                  {isUsed ? (
                    <button
                      type="button"
                      onClick={() => handleUndoCheckIn(selectedTicket.id)}
                      disabled={loading}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-red-600/20"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Desfazer Check-in
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmCheckIn(selectedTicket.id)}
                      disabled={loading}
                      className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Liberar Entrada / Check-in
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL DE SUCESSO DO CHECK-IN COM BOTÃO PARA PREPARAR PRÓXIMA LEITURA */}
        {checkInSuccessTicket && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-w-md w-full text-center animate-scaleIn">
              {/* Ícone de Sucesso */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center border-2 border-emerald-500/30 shadow-inner">
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Entrada Autorizada
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                  Check-in Confirmado!
                </h2>
              </div>

              {/* Card Resumo do Participante */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200/80 text-left space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Titular do Ingresso</p>
                  <p className="text-base font-black text-gray-900 mt-0.5 truncate">
                    {checkInSuccessTicket.holder_name || checkInSuccessTicket.person?.nome || checkInSuccessTicket.order?.client_name || 'Participante'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs text-gray-600 flex-wrap gap-1">
                  <span>Ingresso <strong>#{checkInSuccessTicket.ticket_number}</strong> • {checkInSuccessTicket.order?.batch_name || 'Lote Padrão'}</span>
                  <span className="text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    Entrada às {checkInSuccessTicket.used_at ? new Date(checkInSuccessTicket.used_at).toLocaleTimeString('pt-BR') : 'Agora'}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrepareNextScan}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-2xl text-sm sm:text-base transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Próxima Leitura (Câmera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCheckInSuccessTicket(null);
                    isProcessingScanRef.current = false;
                  }}
                  className="w-full py-2.5 px-4 text-gray-500 hover:text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODO 4: LISTA GERAL DE TODOS OS INGRESSOS DO EVENTO */}
        {checkInMode === 'list' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, CPF ou código..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Visualização em CARDS para Mobile */}
            <div className="grid grid-cols-1 gap-2.5 sm:hidden">
              {listFilteredTickets.map(t => {
                const isChecked = t.status === 'used' || Boolean(t.used_at);
                const holder = t.holder_name || t.person?.nome || t.order?.client_name || 'Participante';
                const isDifferentFromBuyer = t.order?.client_name && t.order.client_name.trim().toLowerCase() !== holder.trim().toLowerCase();

                return (
                  <div key={t.id} className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{holder}</p>
                        <p className="text-[11px] text-gray-500">
                          Ingresso #{t.ticket_number} • {t.order?.batch_name || 'Lote Padrão'}
                          {isDifferentFromBuyer && ` • Comprador: ${t.order?.client_name}`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isChecked ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isChecked ? 'Utilizado' : 'Válido'}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                      <span>CPF: {maskCpf(t.holder_document || t.person?.documento || t.order?.client_document)}</span>
                      <span>Tel: {maskPhone(t.holder_phone || t.person?.whatsapp || t.order?.client_phone)}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-[11px]"
                      >
                        Ver Detalhes
                      </button>
                      {isChecked ? (
                        <button
                          type="button"
                          onClick={() => handleUndoCheckIn(t.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold"
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmCheckIn(t.id)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          Check-in
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visualização em Tabela para Desktop */}
            <div className="hidden sm:block overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ingresso / Lote</th>
                    <th className="py-3 px-4">Titular do Ingresso</th>
                    <th className="py-3 px-4">Comprador</th>
                    <th className="py-3 px-4">CPF do Titular</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listFilteredTickets.map(t => {
                    const isChecked = t.status === 'used' || Boolean(t.used_at);
                    const holder = t.holder_name || t.person?.nome || t.order?.client_name || 'Não informado';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">#{t.ticket_number}</span>
                          <span className="text-[11px] text-gray-500">{t.order?.batch_name || 'Lote Padrão'}</span>
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-900">
                          {holder}
                        </td>

                        <td className="py-3 px-4 text-gray-600 font-medium">
                          {t.order?.client_name || 'Mesmo titular'}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-600">
                          {maskCpf(t.holder_document || t.person?.documento || t.order?.client_document)}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-600">
                          {maskPhone(t.holder_phone || t.person?.whatsapp || t.order?.client_phone)}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isChecked
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isChecked ? 'Check-in Realizado' : 'Válido'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(t)}
                              className="px-2.5 py-1 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer"
                            >
                              Ver Dados
                            </button>

                            {isChecked ? (
                              <button
                                type="button"
                                onClick={() => handleUndoCheckIn(t.id)}
                                disabled={loading}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Desfazer check-in"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirmCheckIn(t.id)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Check-in
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {listFilteredTickets.length === 0 && (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <Ticket className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-semibold">Nenhum ingresso encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalCheckIn;