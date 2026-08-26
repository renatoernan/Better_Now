import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Gift,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Send,
} from 'lucide-react';
import { Event } from '../../shared/types/types/event';
import { createComplimentaryOrder } from '../../shared/services/complimentaryOrderService';
import { formatPrice, processPriceBatches } from '../../shared/utils/utils/eventUtils';
import { formatCPF } from '../../shared/utils/utils/cpfUtils';
import { supabase } from '../../shared/services/lib/supabase';
import { toast } from 'sonner';

interface AdminIssueComplimentaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: () => void;
}

const COMPLIMENTARY_CATEGORIES = [
  'Palestrante / Speaker',
  'Patrocinador / Sponsor',
  'VIP / Convidado Especial',
  'Staff / Produção',
  'Imprensa / Mídia',
  'Parceiro Comercial',
  'Outros',
];

/**
 * Normaliza e formata número de telefone brasileiro, tratando código DDI (+55)
 */
export const formatBrazilianPhone = (phone: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  // Se vier com o código do país Brasil (55) com 12 ou 13 dígitos no total, remove o 55
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Limita ao máximo de 11 dígitos (DDD + 9 dígitos)
  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  if (digits.length > 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length > 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return digits;
};

export const AdminIssueComplimentaryModal: React.FC<AdminIssueComplimentaryModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [cpf, setCpf] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [category, setCategory] = useState<string>('VIP / Convidado Especial');
  const [customNote, setCustomNote] = useState<string>('');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchingDoc, setSearchingDoc] = useState<boolean>(false);
  const [personFound, setPersonFound] = useState<boolean | null>(null);
  const [foundPersonId, setFoundPersonId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Limpa todos os dados digitados e feedbacks do formulário
  const resetForm = useCallback(() => {
    setSelectedBatchIndex(0);
    setQuantity(1);
    setCpf('');
    setNome('');
    setWhatsapp('');
    setEmail('');
    setCategory('VIP / Convidado Especial');
    setCustomNote('');
    setSendWhatsApp(true);
    setLoading(false);
    setSearchingDoc(false);
    setPersonFound(null);
    setFoundPersonId(null);
    setErrorMsg(null);
  }, []);

  // Limpa automaticamente o formulário sempre que o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const priceBatches = processPriceBatches(event.price_batches);
  const selectedBatch = priceBatches[selectedBatchIndex] || priceBatches[0];

  // Busca instantânea de pessoa na tabela app_people por CPF
  const handleSearchPersonByDoc = async (cpfValue: string) => {
    const cleanDoc = cpfValue.replace(/\D/g, '');
    if (cleanDoc.length !== 11) {
      setPersonFound(null);
      setFoundPersonId(null);
      return;
    }

    setSearchingDoc(true);
    setErrorMsg(null);

    try {
      // 1. Consulta flexível buscando documento limpo ou formatado
      let { data, error } = await supabase
        .from('app_people')
        .select('*')
        .or(`documento.eq.${cleanDoc},documento.eq.${cpfValue}`)
        .limit(1)
        .maybeSingle();

      // 2. Se não achou com .or, tenta busca direta exata por documento limpo
      if (!data && !error) {
        const fallbackRes = await supabase
          .from('app_people')
          .select('*')
          .eq('documento', cleanDoc)
          .limit(1)
          .maybeSingle();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro na consulta de app_people por documento:', error);
        throw error;
      }

      if (data) {
        setPersonFound(true);
        setFoundPersonId(data.id);
        const fetchedName = data.nome || data.apelido || data.name || '';
        const fetchedPhone = data.whatsapp || data.telefone || data.phone || '';
        const fetchedEmail = data.email || '';

        if (fetchedName) setNome(fetchedName);

        if (fetchedPhone) {
          setWhatsapp(formatBrazilianPhone(fetchedPhone));
        }

        if (fetchedEmail) {
          setEmail(fetchedEmail);
        }
      } else {
        setPersonFound(false);
        setFoundPersonId(null);
      }
    } catch (err: any) {
      console.error('Erro ao consultar pessoa por CPF na app_people:', err);
      setPersonFound(false);
      setFoundPersonId(null);
    } finally {
      setSearchingDoc(false);
    }
  };

  // Formatação e disparo de busca de CPF em tempo real
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 11) {
      handleSearchPersonByDoc(formatted);
    } else {
      setPersonFound(null);
      setFoundPersonId(null);
    }
  };

  // Formatação de telefone em tempo real
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatBrazilianPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf && cleanCpf.length !== 11) {
      setErrorMsg('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!nome.trim()) {
      setErrorMsg('Informe o nome do contemplado.');
      return;
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Informe um número de WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const notePayload = `Cortesia: ${category}${customNote.trim() ? ` - ${customNote.trim()}` : ''}`;

    try {
      const result = await createComplimentaryOrder({
        event_id: event.id,
        batch_index: selectedBatchIndex,
        batch_name: selectedBatch?.name || 'Cortesia VIP',
        unit_price: selectedBatch?.price || 0,
        quantity: quantity,
        client_name: nome.trim(),
        client_phone: cleanPhone,
        client_email: email.trim() || undefined,
        client_document: cleanCpf || undefined,
        client_id: foundPersonId || undefined,
        notes: notePayload,
        send_whatsapp: sendWhatsApp,
      });

      if (result.success) {
        toast.success(
          `Cortesia emitida com sucesso para ${nome.trim()}! ${sendWhatsApp ? 'Mensagem enviada no WhatsApp! 📱' : ''}`
        );
        resetForm();
        onSuccess();
        onClose();
      } else {
        setErrorMsg(result.error || 'Erro ao emitir cortesia.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao emitir cortesia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 text-gray-300 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3.5 pr-8">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Emitir Cortesia VIP
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Evento: <span className="font-semibold text-white">{event.title || event.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seleção do Lote e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lote de Ingresso *
              </label>
              <select
                value={selectedBatchIndex}
                onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                disabled={loading}
              >
                {priceBatches.map((b, idx) => (
                  <option key={idx} value={idx}>
                    {b.name || `Lote ${idx + 1}`} ({formatPrice(b.price || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Qtd. Ingressos *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs font-bold text-center rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Dados do Contemplado / Convidado */}
          <div className="space-y-3.5 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Dados do Contemplado
              </span>
              {searchingDoc && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando cadastro...
                </span>
              )}
            </div>

            {/* 1. CPF do Contemplado (Primeiro Campo) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  CPF do Contemplado *
                </span>
                <span className="text-[10px] font-normal text-gray-500">
                  Busca automática em app_people
                </span>
              </label>
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                onBlur={() => handleSearchPersonByDoc(cpf)}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all tracking-wide"
                disabled={loading}
                required
              />
            </div>

            {/* Feedback Visual da Consulta em app_people */}
            {personFound === true && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5 animate-in fade-in duration-200">
                <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block">Pessoa encontrada na base de clientes (app_people)!</span>
                  <span className="text-[11px] text-emerald-700">Dados preenchidos automaticamente. Você pode revisá-los abaixo.</span>
                </div>
              </div>
            )}

            {personFound === false && cpf.replace(/\D/g, '').length === 11 && (
              <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2.5 animate-in fade-in duration-200">
                <div className="p-1 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block">Novo cadastro!</span>
                  <span className="text-[11px] text-blue-700">Esta pessoa será automaticamente cadastrada na base de clientes (app_people).</span>
                </div>
              </div>
            )}

            {/* 2. Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Nome Completo do Contemplado *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Dra. Ana Paula Silveira"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                disabled={loading}
                required
              />
            </div>

            {/* 3. WhatsApp e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  WhatsApp *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="convidado@empresa.com"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Categoria e Observações */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Categoria / Motivo da Cortesia *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                disabled={loading}
              >
                {COMPLIMENTARY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Observações Internas (Opcional)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ex: Convidado pelo Diretor / Mesa 04"
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                disabled={loading}
              />
            </div>
          </div>

          {/* Opção de Envio no WhatsApp */}
          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">Enviar Ingressos no WhatsApp</span>
                <span className="text-[11px] text-emerald-700">Dispara a confirmação com o QR Code imediatamente</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Emitindo Cortesia...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Emitir Cortesia Agora
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminIssueComplimentaryModal;

