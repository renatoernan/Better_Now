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
  X
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
  };
}

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  
  // Ingresso selecionado para confirmação
  const [selectedTicket, setSelectedTicket] = useState<TicketWithOrder | null>(null);
  
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Carregar ingressos reais do evento
  const loadEventTickets = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // 1. Buscar ingressos do evento
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('app_event_tickets')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ticketsErr) throw ticketsErr;

      // 2. Buscar ordens relacionadas para enriquecer com dados do comprador
      const orderIds = Array.from(new Set((ticketsData || []).map(t => t.order_id).filter(Boolean)));
      let ordersMap: Record<string, any> = {};

      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('app_event_orders')
          .select('id, client_name, client_document, client_phone, client_email, batch_name, amount_total, quantity, status')
          .in('id', orderIds);

        (ordersData || []).forEach(o => {
          ordersMap[o.id] = o;
        });
      }

      // 3. Montar lista de ingressos enriquecidos
      const enriched: TicketWithOrder[] = (ticketsData || []).map(t => ({
        ...t,
        order: ordersMap[t.order_id] || undefined
      }));

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

  // Gerenciamento da Câmera com Html5Qrcode
  const startCameraScanner = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      // Se já houver um scanner ativo, finaliza antes de iniciar
      if (qrScannerRef.current) {
        try {
          if (qrScannerRef.current.isScanning) {
            await qrScannerRef.current.stop();
          }
        } catch (_) {}
      }

      const scanner = new Html5Qrcode('qr-camera-viewport');
      qrScannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: mode },
        config,
        (decodedText) => {
          handleProcessScan(decodedText);
        },
        () => {} // Ignorar frames sem QR
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permissão de acesso à câmera negada. Habilite a permissão no seu navegador.'
          : 'Não foi possível acessar a câmera do dispositivo.'
      );
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

  // Efeito ao trocar de modo de check-in
  useEffect(() => {
    if (checkInMode === 'camera') {
      // Inicia a câmera automaticamente ao entrar no modo Câmera
      const timer = setTimeout(() => {
        startCameraScanner(facingMode);
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }

    if (checkInMode === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
    if (checkInMode === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [checkInMode]);

  // Limpeza ao desmontar componente
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

  // Processar busca / leitura de código QR
  const handleProcessScan = (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) return;

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
        toast.warning('Atenção: Este ingresso já realizou check-in anteriormente!');
      } else {
        toast.success('Ingresso identificado com sucesso!');
      }
    } else {
      toast.error(`Nenhum ingresso localizado com o código: ${clean}`);
    }
  };

  // Lista filtrada por nome no modo de busca por titular
  const nameFilteredTickets = tickets.filter(t => {
    const term = nameQuery.toLowerCase().trim();
    if (!term) return false;
    const buyerName = (t.order?.client_name || '').toLowerCase();
    const buyerDoc = (t.order?.client_document || '').toLowerCase();
    return buyerName.includes(term) || buyerDoc.includes(term);
  });

  // Lista geral de ingressos filtrada
  const listFilteredTickets = tickets.filter(t => {
    const term = listSearchQuery.toLowerCase().trim();
    if (!term) return true;

    const buyerName = (t.order?.client_name || '').toLowerCase();
    const buyerPhone = (t.order?.client_phone || '').toLowerCase();
    const buyerDoc = (t.order?.client_document || '').toLowerCase();
    const hash = (t.qr_code_hash || '').toLowerCase();
    const num = String(t.ticket_number || '').toLowerCase();
    const batch = (t.order?.batch_name || '').toLowerCase();

    return (
      buyerName.includes(term) ||
      buyerPhone.includes(term) ||
      buyerDoc.includes(term) ||
      hash.includes(term) ||
      num.includes(term) ||
      batch.includes(term)
    );
  });

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

      toast.success('🎉 Check-in confirmado com sucesso! Entrada autorizada!');
      
      // Atualizar lista local
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'used', used_at: nowIso } : t
      ));

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'used', used_at: nowIso });
      }
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
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
      {/* Header com Informações do Evento e Ações */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Portaria & Check-in Digital</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentEvent?.title || 'Gerenciamento de Entrada'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadEventTickets();
            }}
            disabled={loading || refreshing}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
            title="Atualizar lista de ingressos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>

        {/* Estatísticas Rápidas em Cards Modernos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Check-ins Realizados</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{checkedInTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
              <Ticket className="w-4 h-4" />
              <span>Aguardando Entrada</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{validTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
              <Users className="w-4 h-4" />
              <span>Total Emitidos</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{totalTickets}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
              <Clock className="w-4 h-4" />
              <span>Taxa de Presença</span>
            </div>
            <p className="text-2xl font-black text-white mt-1">{checkInRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Barra de Seleção dos 3 Métodos de Check-in + Lista Geral */}
      <div className="bg-slate-50 border-b border-gray-200/80 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCheckInMode('camera')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              checkInMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>1. Escanear Câmera</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('code')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              checkInMode === 'code'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>2. Digitar Código</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('name')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              checkInMode === 'name'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>3. Nome do Titular</span>
          </button>

          <button
            type="button"
            onClick={() => setCheckInMode('list')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              checkInMode === 'list'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Todos os Ingressos ({totalTickets})</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* MODO 1: SCANNER DE CÂMERA (LEITURA QR CODE AO VIVO) */}
        {checkInMode === 'camera' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-center">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Câmera de Leitura Ativa</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Alternar Câmera Frontal / Traseira"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Inverter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (cameraActive) {
                        stopCameraScanner();
                      } else {
                        startCameraScanner(facingMode);
                      }
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    {cameraActive ? <VideoOff className="w-3.5 h-3.5 text-red-400" /> : <Video className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{cameraActive ? 'Pausar' : 'Ativar'}</span>
                  </button>
                </div>
              </div>

              {/* Viewport da Câmera Html5Qrcode */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto border-2 border-emerald-500/50 shadow-inner flex items-center justify-center">
                <div id="qr-camera-viewport" className="w-full h-full" />
                
                {/* Linha laser de scan animada sobre a câmera */}
                {cameraActive && (
                  <div className="absolute inset-x-8 top-1/2 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/80 animate-pulse pointer-events-none" />
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200">
                  {cameraError}
                </div>
              )}

              <p className="text-xs text-slate-300">
                Aponte a câmera para o <strong>QR Code do Ingresso</strong> para identificar e liberar a entrada.
              </p>
            </div>
          </div>
        )}

        {/* MODO 2: DIGITAÇÃO DO CÓDIGO DO INGRESSO */}
        {checkInMode === 'code' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-gray-200 shadow-2xs text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <Hash className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Digitação de Código ou Leitor USB</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Digite o código hash do ingresso (ex: <code>BN-...</code>) ou número do ingresso e pressione Enter
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScan(codeQuery);
                }}
                className="flex gap-2 max-w-md mx-auto"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    placeholder="Ex: BN-5BB8A2D1... ou #001"
                    value={codeQuery}
                    onChange={(e) => setCodeQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-2xl text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!codeQuery.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Localizar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODO 3: DIGITAÇÃO DO NOME DO TITULAR DO INGRESSO */}
        {checkInMode === 'name' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-2xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Buscar por Nome do Titular</h3>
                  <p className="text-xs text-gray-500">
                    Digite o nome completo ou primeiro nome do comprador para localizar o ingresso
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
                  placeholder="Digite o nome do comprador (ex: Renato, Maria...)"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-2xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
                />
              </div>

              {/* Resultados da busca por nome */}
              {nameQuery.trim() && (
                <div className="space-y-2 pt-2 max-h-80 overflow-y-auto">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {nameFilteredTickets.length} participante(s) encontrado(s):
                  </p>

                  {nameFilteredTickets.map((t) => {
                    const isChecked = t.status === 'used' || Boolean(t.used_at);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-900">
                            {t.order?.client_name || 'Nome não informado'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Ingresso #{t.ticket_number}</span>
                            <span>•</span>
                            <span>{t.order?.batch_name || 'Lote Padrão'}</span>
                            <span>•</span>
                            <span className="font-mono">{maskCpf(t.order?.client_document)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isChecked
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isChecked ? 'Check-in Realizado' : 'Válido'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}

                  {nameFilteredTickets.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs font-medium">
                      Nenhum titular encontrado com o termo "{nameQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARD MODAL/DESTAQUE DO INGRESSO IDENTIFICADO COM MASCARAMENTO */}
        {selectedTicket && (
          <div className="max-w-2xl mx-auto mt-6 bg-white border-2 border-emerald-600 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    Ingresso #{selectedTicket.ticket_number}
                  </span>
                  <p className="text-xs text-gray-500">Lote: <strong>{selectedTicket.order?.batch_name || 'Lote Padrão'}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
                  selectedTicket.status === 'used'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {selectedTicket.status === 'used' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Já Utilizado
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Válido para Entrada
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dados do Comprador com Mascaramento Conforme Solicitado */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Conferência de Titularidade na Portaria:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Nome Completo */}
                <div className="sm:col-span-2 bg-white p-3.5 rounded-xl border border-gray-200/70 shadow-2xs">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Nome Completo do Comprador</p>
                  <p className="text-base font-extrabold text-gray-900 mt-0.5">
                    {selectedTicket.order?.client_name || 'Nome não informado'}
                  </p>
                </div>

                {/* CPF Parcialmente Mascarado */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/70 shadow-2xs">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">CPF (Mascarado)</p>
                  <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">
                    {maskCpf(selectedTicket.order?.client_document)}
                  </p>
                </div>

                {/* Telefone Parcialmente Mascarado */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/70 shadow-2xs">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Telefone / WhatsApp (Mascarado)</p>
                  <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">
                    {maskPhone(selectedTicket.order?.client_phone)}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-200/60 flex-wrap gap-2">
                <span className="font-mono text-gray-400 truncate max-w-xs">{selectedTicket.qr_code_hash}</span>
                {selectedTicket.used_at && (
                  <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded">
                    Entrada registrada às {new Date(selectedTicket.used_at).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {/* Botões de Confirmação de Entrada */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-2xl text-xs hover:bg-gray-50 cursor-pointer"
              >
                Voltar
              </button>

              {selectedTicket.status === 'used' ? (
                <button
                  type="button"
                  onClick={() => handleUndoCheckIn(selectedTicket.id)}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  Desfazer Check-in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmCheckIn(selectedTicket.id)}
                  disabled={loading}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-102"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirmar Entrada / Check-in
                </button>
              )}
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
                placeholder="Buscar por nome do comprador, telefone, CPF ou código do ingresso..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ingresso / Lote</th>
                    <th className="py-3 px-4">Comprador</th>
                    <th className="py-3 px-4">CPF (Mascarado)</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listFilteredTickets.map(t => {
                    const isChecked = t.status === 'used' || Boolean(t.used_at);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">#{t.ticket_number}</span>
                          <span className="text-[11px] text-gray-500">{t.order?.batch_name || 'Lote Padrão'}</span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {t.order?.client_name || 'Não informado'}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-600">
                          {maskCpf(t.order?.client_document)}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-600">
                          {maskPhone(t.order?.client_phone)}
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

              {listFilteredTickets.length === 0 && (
                <div className="text-center py-10 text-gray-400 space-y-2">
                  <Ticket className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs font-semibold">Nenhum ingresso encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalCheckIn;