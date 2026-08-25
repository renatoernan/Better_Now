import React, { useState, useEffect } from 'react';
import { 
  X, ArrowRightLeft, User, Phone, Mail, FileText, CheckCircle2, 
  UserPlus, Loader2, AlertCircle, Sparkles 
} from 'lucide-react';
import { supabase } from '../../shared/services/lib/supabase';
import { EventTicketRecord } from '../../shared/hooks/hooks/useEventOrders';

interface AdminTransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: EventTicketRecord | null;
  orderClientName?: string;
  orderClientDocument?: string;
  orderClientPhone?: string;
  onConfirmTransfer: (params: {
    ticketId: string;
    orderId: string;
    eventId: string;
    fromPersonId?: string;
    fromPersonName?: string;
    toPerson: {
      nome: string;
      documento: string;
      whatsapp?: string;
      email?: string;
    };
    reason?: string;
  }) => Promise<boolean | void>;
}

export const AdminTransferTicketModal: React.FC<AdminTransferTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  orderClientName,
  orderClientDocument,
  orderClientPhone,
  onConfirmTransfer,
}) => {
  const [destDocument, setDestDocument] = useState<string>('');
  const [destName, setDestName] = useState<string>('');
  const [destPhone, setDestPhone] = useState<string>('');
  const [destEmail, setDestEmail] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  const [searchingDoc, setSearchingDoc] = useState<boolean>(false);
  const [personFound, setPersonFound] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDestDocument('');
      setDestName('');
      setDestPhone('');
      setDestEmail('');
      setReason('');
      setPersonFound(null);
      setErrorMsg('');
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const currentHolderName = ticket.person?.nome || orderClientName || 'Titular Atual';
  const currentHolderDoc = ticket.person?.documento || orderClientDocument || 'Não informado';
  const currentHolderPhone = ticket.person?.whatsapp || orderClientPhone || 'Não informado';

  // Formatação simples de CPF
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Buscar pessoa existente por CPF no banco de dados (app_people)
  const handleSearchPersonByDoc = async (cpfValue: string) => {
    const cleanDoc = cpfValue.replace(/\D/g, '');
    if (cleanDoc.length !== 11) {
      setPersonFound(null);
      return;
    }

    setSearchingDoc(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('app_people')
        .select('id, nome, documento, whatsapp, email')
        .eq('documento', cleanDoc)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPersonFound(true);
        setDestName(data.nome || '');
        if (data.whatsapp) setDestPhone(data.whatsapp);
        if (data.email) setDestEmail(data.email);
      } else {
        setPersonFound(false);
      }
    } catch (err: any) {
      console.warn('Erro ao consultar pessoa por CPF:', err);
      setPersonFound(false);
    } finally {
      setSearchingDoc(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setDestDocument(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 11) {
      handleSearchPersonByDoc(formatted);
    } else {
      setPersonFound(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!destName.trim()) {
      setErrorMsg('Informe o nome completo do novo titular.');
      return;
    }

    const cleanDoc = destDocument.replace(/\D/g, '');
    if (cleanDoc && cleanDoc.length !== 11) {
      setErrorMsg('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await onConfirmTransfer({
        ticketId: ticket.id,
        orderId: ticket.order_id,
        eventId: ticket.event_id,
        fromPersonId: ticket.person?.id || ticket.client_id,
        fromPersonName: currentHolderName,
        toPerson: {
          nome: destName.trim(),
          documento: cleanDoc,
          whatsapp: destPhone.trim() || undefined,
          email: destEmail.trim() || undefined,
        },
        reason: reason.trim() || 'Transferência realizada pelo administrador',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar transferência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-indigo-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-indigo-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 text-indigo-100 rounded-2xl border border-white/20 shadow-inner">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Transferir Ingresso</h2>
              <p className="text-xs text-indigo-200">
                Ingresso #{ticket.ticket_number} • Mudança de titularidade nominal
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Card: Titular Atual (Origem) */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" /> Titular Atual (De)
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                #{ticket.ticket_number}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
              <div>
                <span className="text-gray-400 block text-[11px]">Nome:</span>
                <strong className="text-gray-900">{currentHolderName}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">CPF:</span>
                <span>{currentHolderDoc}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">WhatsApp:</span>
                <span>{currentHolderPhone}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Status Ingresso:</span>
                <span className="text-emerald-700 font-bold uppercase">{ticket.status}</span>
              </div>
            </div>
          </div>

          {/* Seção: Novo Titular (Destino) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Novo Titular (Para)
              </h3>
              {searchingDoc && (
                <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando cadastro...
                </span>
              )}
            </div>

            {/* Campo CPF */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">
                CPF do Destinatário:
              </label>
              <input
                type="text"
                value={destDocument}
                onChange={handleDocumentChange}
                onBlur={() => handleSearchPersonByDoc(destDocument)}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-gray-900 transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Feedback de busca de pessoa */}
            {personFound === true && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pessoa já cadastrada na base de clientes! Dados auto-preenchidos.</span>
              </div>
            )}
            {personFound === false && destDocument.replace(/\D/g, '').length === 11 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Novo cadastro! Esta pessoa será automaticamente adicionada à base de clientes (app_people).</span>
              </div>
            )}

            {/* Nome Completo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">
                Nome Completo: *
              </label>
              <input
                type="text"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                placeholder="Nome da pessoa que receberá o ingresso"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-semibold text-gray-900 transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* WhatsApp e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-gray-400" /> WhatsApp / Celular:
                </label>
                <input
                  type="text"
                  value={destPhone}
                  onChange={(e) => setDestPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gray-400" /> E-mail:
                </label>
                <input
                  type="email"
                  value={destEmail}
                  onChange={(e) => setDestEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Motivo da Transferência */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">
                Motivo ou Observação da Transferência:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Solicitação via WhatsApp, troca de acompanhante..."
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800"
                disabled={loading}
              />
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              <span>Confirmar Transferência</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminTransferTicketModal;
