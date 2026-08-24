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
  ArrowRight
} from 'lucide-react';
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
  ticket_number: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'list' | 'stats'>('scan');
  
  const scannerInputRef = useRef<HTMLInputElement>(null);

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

  // Foco automático no input de leitor de QR Code
  useEffect(() => {
    if (activeTab === 'scan' && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [activeTab]);

  // Estatísticas
  const totalTickets = tickets.length;
  const checkedInTickets = tickets.filter(t => t.status === 'used' || t.used_at).length;
  const validTickets = tickets.filter(t => t.status === 'valid' && !t.used_at).length;
  const checkInRate = totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0;

  // Filtragem de busca na lista
  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const buyerName = (t.order?.client_name || '').toLowerCase();
    const buyerPhone = (t.order?.client_phone || '').toLowerCase();
    const buyerDoc = (t.order?.client_document || '').toLowerCase();
    const hash = (t.qr_code_hash || '').toLowerCase();
    const num = (t.ticket_number || '').toLowerCase();
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

  // Processar leitura de QR Code / Busca direta
  const handleProcessScan = (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) return;

    const found = tickets.find(t => 
      t.qr_code_hash.toLowerCase() === clean.toLowerCase() ||
      t.id.toLowerCase() === clean.toLowerCase() ||
      t.ticket_number.toLowerCase() === clean.toLowerCase() ||
      t.qr_code_hash.toLowerCase().includes(clean.toLowerCase())
    );

    if (found) {
      setSelectedTicket(found);
      setScannedCode('');
      if (found.status === 'used') {
        toast.warning('Atenção: Este ingresso já realizou check-in anteriormente!');
      } else {
        toast.success('Ingresso identificado com sucesso!');
      }
    } else {
      toast.error(`Nenhum ingresso localizado com o código: ${clean}`);
    }
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
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadEventTickets();
              }}
              disabled={loading || refreshing}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Atualizar lista de ingressos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'scan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Leitor QR Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Lista de Ingressos
              </button>
            </div>
          </div>
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

      <div className="p-6">
        {/* ABA 1: LEITOR DE QR CODE E VALIDAÇÃO */}
        {activeTab === 'scan' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Input do Scanner de QR Code */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-gray-200 shadow-2xs text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <QrCode className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Leitor / Scanner de Ingressos</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Posicione o leitor de QR Code ou digite o código do ingresso e pressione Enter
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScan(scannedCode);
                }}
                className="flex gap-2 max-w-md mx-auto"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Ex: BN-5BB8A2D1... ou #001"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-2xl text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!scannedCode.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Validar
                </button>
              </form>
            </div>

            {/* Cartão de Confirmação do Ingresso Escaneado com Mascaramento */}
            {selectedTicket && (
              <div className="bg-white border-2 border-indigo-600 rounded-3xl p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                        Ingresso #{selectedTicket.ticket_number}
                      </span>
                      <p className="text-xs text-gray-500">Lote: <strong>{selectedTicket.order?.batch_name || 'Lote Padrão'}</strong></p>
                    </div>
                  </div>

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
                        Válido
                      </>
                    )}
                  </span>
                </div>

                {/* Dados do Comprador com Mascaramento Conforme Solicitado */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Identificação do Comprador para Conferência:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Nome Completo */}
                    <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-gray-200/70">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">Nome Completo do Comprador</p>
                      <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                        {selectedTicket.order?.client_name || 'Nome não informado'}
                      </p>
                    </div>

                    {/* CPF Parcialmente Mascarado */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">CPF (Mascarado)</p>
                      <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">
                        {maskCpf(selectedTicket.order?.client_document)}
                      </p>
                    </div>

                    {/* Telefone Parcialmente Mascarado */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">Telefone (WhatsApp Mascarado)</p>
                      <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">
                        {maskPhone(selectedTicket.order?.client_phone)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-200/60">
                    <span className="font-mono text-gray-400 truncate max-w-xs">{selectedTicket.qr_code_hash}</span>
                    {selectedTicket.used_at && (
                      <span className="text-amber-800 font-semibold">
                        Entrada às {new Date(selectedTicket.used_at).toLocaleTimeString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs hover:bg-gray-50 cursor-pointer"
                  >
                    Fechar
                  </button>

                  {selectedTicket.status === 'used' ? (
                    <button
                      type="button"
                      onClick={() => handleUndoCheckIn(selectedTicket.id)}
                      disabled={loading}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      Desfazer Check-in
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmCheckIn(selectedTicket.id)}
                      disabled={loading}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar Entrada / Check-in
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: LISTA DE TODOS OS INGRESSOS DO EVENTO */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome do comprador, telefone, CPF ou código do ingresso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  {filteredTickets.map(t => {
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTickets.length === 0 && (
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