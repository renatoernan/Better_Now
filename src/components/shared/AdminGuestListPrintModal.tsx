import React, { useState, useMemo } from 'react';
import { 
  X, Printer, FileText, CheckCircle2, Clock, AlertTriangle, Users, 
  Search, SlidersHorizontal, Layers, Check, ExternalLink, ShieldCheck,
  Eye, RefreshCw, FileCheck2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Event } from '../../shared/types/types/event';
import { FlattenedTicketItem } from '../features/AdminEventOrders';
import { 
  GuestListPrintOptions, 
  prepareGuestListItems, 
  openGuestListPrintWindow 
} from '../../shared/utils/utils/guestListPrintService';
import { formatCPF } from '../../shared/utils/utils/cpfUtils';
import { formatPhone } from '../../shared/utils/utils/phoneUtils';

interface AdminGuestListPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  tickets: FlattenedTicketItem[];
}

export const AdminGuestListPrintModal: React.FC<AdminGuestListPrintModalProps> = ({
  isOpen,
  onClose,
  event,
  tickets,
}) => {
  // Configurações do Relatório
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('compact');
  const [statusFilter, setStatusFilter] = useState<'valid_only' | 'valid_and_pending' | 'all'>('valid_only');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [letterFilter, setLetterFilter] = useState<string>('all');
  const [includeSignatureLine, setIncludeSignatureLine] = useState<boolean>(true);
  const [includeInstructions, setIncludeInstructions] = useState<boolean>(true);
  const [includeBatchColumn, setIncludeBatchColumn] = useState<boolean>(true);
  
  // Busca na pré-visualização ao vivo
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [popupBlockedWarning, setPopupBlockedWarning] = useState<boolean>(false);

  // Lista de lotes únicos existentes nos ingressos
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      const bName = t.order.batch_name || `Lote ${t.order.batch_index || 1}`;
      if (bName) set.add(bName);
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Itens preparados e ordenados alfabeticamente para impressão
  const preparedItems = useMemo(() => {
    return prepareGuestListItems(tickets, {
      batchFilter,
      statusFilter,
      letterFilter,
    });
  }, [tickets, batchFilter, statusFilter, letterFilter]);

  // Estimativa de páginas A4
  const estimatedPages = useMemo(() => {
    if (preparedItems.length === 0) return 0;
    // Em landscape compact: ~32 por folha; comfortable: ~22 por folha
    // Em portrait compact: ~42 por folha; comfortable: ~28 por folha
    let perPage = 30;
    if (orientation === 'landscape') {
      perPage = density === 'compact' ? 32 : 22;
    } else {
      perPage = density === 'compact' ? 42 : 28;
    }
    return Math.ceil(preparedItems.length / perPage);
  }, [preparedItems.length, orientation, density]);

  // Contadores para os Cards de Resumo
  const kpis = useMemo(() => {
    const total = preparedItems.length;
    const complimentary = preparedItems.filter((i) => i.isComplimentary).length;
    const paid = total - complimentary;
    const used = preparedItems.filter((i) => i.ticketStatus === 'used' || !!i.usedAt).length;
    const remaining = total - used;

    return { total, complimentary, paid, used, remaining };
  }, [preparedItems]);

  // Itens filtrados pela busca da prévia
  const previewItems = useMemo(() => {
    if (!previewSearch.trim()) return preparedItems;
    const q = previewSearch.toLowerCase().trim();
    return preparedItems.filter(
      (item) =>
        item.holderName.toLowerCase().includes(q) ||
        item.holderDoc.includes(q) ||
        item.holderPhone.includes(q) ||
        item.buyerName.toLowerCase().includes(q) ||
        item.orderId.toLowerCase().includes(q)
    );
  }, [preparedItems, previewSearch]);

  if (!isOpen) return null;

  const handlePrint = () => {
    setPopupBlockedWarning(false);
    const options: GuestListPrintOptions = {
      orientation,
      density,
      includeSignatureLine,
      includeInstructions,
      includeBatchColumn,
      batchFilter,
      statusFilter,
      letterFilter,
    };

    const success = openGuestListPrintWindow(event, tickets, options);
    if (!success) {
      setPopupBlockedWarning(true);
      toast.error('O navegador bloqueou a abertura da janela de impressão. Permita popups para este site.');
    } else {
      toast.success('Janela de impressão gerada com sucesso!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Lista de Convidados para Portaria
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Plano B de Contingência
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  Ordem Alfabética A-Z
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5 truncate max-w-xl">
                {event.title} &bull; Documento impresso pronto para validação manual de credenciamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso de Popup Bloqueado (se houver) */}
        {popupBlockedWarning && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <strong className="font-bold">A janela de impressão foi bloqueada pelo navegador.</strong>
              <p>Por favor, clique no ícone de pop-up bloqueado na barra de endereços do navegador e selecione &quot;Sempre permitir&quot;.</p>
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">

          {/* Cards de Resumo Rápido */}
          <div className={`grid gap-3 ${includeBatchColumn ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-1 sm:grid-cols-3'}`}>
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Total na Lista</span>
              <div className="text-xl font-black text-gray-900 mt-0.5">{kpis.total}</div>
              <span className="text-[10px] text-gray-400">Ingressos ordenados</span>
            </div>

            {includeBatchColumn && (
              <>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Pagantes</span>
                  <div className="text-xl font-black text-blue-700 mt-0.5">{kpis.paid}</div>
                  <span className="text-[10px] text-blue-500">Ingressos normais</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Cortesias</span>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">{kpis.complimentary}</div>
                  <span className="text-[10px] text-emerald-500">Valor zerado</span>
                </div>
              </>
            )}

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Já Entraram</span>
              <div className="text-xl font-black text-amber-700 mt-0.5">{kpis.used}</div>
              <span className="text-[10px] text-amber-500">Check-in prévio</span>
            </div>
            <div className={`bg-white p-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white shadow-2xs ${includeBatchColumn ? 'col-span-2 sm:col-span-1' : ''}`}>
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">Páginas A4</span>
              <div className="text-xl font-black text-indigo-700 mt-0.5">~{estimatedPages} {estimatedPages === 1 ? 'folha' : 'folhas'}</div>
              <span className="text-[10px] text-indigo-500 font-medium">Estimativa de impressão</span>
            </div>
          </div>

          {/* Painel de Opções e Filtros de Impressão */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4.5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Configurações do Relatório de Impressão</span>
              </div>
              <span className="text-[11px] text-gray-500">
                Ajuste o layout e filtros antes de imprimir
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              
              {/* Filtro de Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Status dos Ingressos
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                >
                  <option value="valid_only">Apenas Válidos e Confirmados (Recomendado)</option>
                  <option value="valid_and_pending">Válidos + Pendentes de Pagto</option>
                  <option value="all">Todos os Ingressos (Inclui Cancelados)</option>
                </select>
              </div>

              {/* Filtro de Lote */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Filtrar por Lote
                </label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                >
                  <option value="all">Todos os Lotes ({availableBatches.length})</option>
                  {availableBatches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faixa Alfabética */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Faixa Alfabética (Portaria)
                </label>
                <select
                  value={letterFilter}
                  onChange={(e) => setLetterFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                >
                  <option value="all">Todas as Letras (A &rarr; Z)</option>
                  <option value="A-F">Fila 1: Letras A até F</option>
                  <option value="G-M">Fila 2: Letras G até M</option>
                  <option value="N-S">Fila 3: Letras N até S</option>
                  <option value="T-Z">Fila 4: Letras T até Z</option>
                  <option disabled>──────────</option>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                    <option key={l} value={l}>Apenas Letra {l}</option>
                  ))}
                </select>
              </div>

              {/* Orientação da Folha */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Orientação da Página A4
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      orientation === 'landscape'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>Paisagem</span>
                    <span className="text-[10px] text-gray-400">(Ideal)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      orientation === 'portrait'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>Retrato</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Segunda linha de opções secundárias */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 text-xs text-gray-700">
              <div className="flex flex-wrap items-center gap-5">
                
                {/* Densidade */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600">Densidade:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="density"
                      checked={density === 'compact'}
                      onChange={() => setDensity('compact')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium">Econômica (mais pessoas por folha)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="density"
                      checked={density === 'comfortable'}
                      onChange={() => setDensity('comfortable')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium">Confortável (fonte maior)</span>
                  </label>
                </div>

                {/* Rubrica manual */}
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={includeSignatureLine}
                    onChange={(e) => setIncludeSignatureLine(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span>Linha de Rubrica / Assinatura Manual</span>
                </label>

                {/* Coluna Lote / Ingresso */}
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={includeBatchColumn}
                    onChange={(e) => setIncludeBatchColumn(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span>Coluna Lote / Ingresso</span>
                </label>

                {/* Instruções */}
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={includeInstructions}
                    onChange={(e) => setIncludeInstructions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span>Quadro de Orientações da Portaria</span>
                </label>

              </div>
            </div>
          </div>

          {/* Pré-visualização da Lista em Tempo Real */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            
            {/* Barra de Busca e Título da Prévia */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Prévia do Relatório ({previewItems.length} convidados exibidos)</span>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar convidado na prévia..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Tabela de Prévia com Altura Fixa e Scroll */}
            <div className="max-h-72 overflow-y-auto">
              {previewItems.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Nenhum convidado encontrado com os filtros selecionados.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white sticky top-0 z-10 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Titular / Convidado</th>
                      <th className="py-2.5 px-3">Documento</th>
                      <th className="py-2.5 px-3">Telefone</th>
                      {includeBatchColumn && <th className="py-2.5 px-3">Lote / Ingresso</th>}
                      <th className="py-2.5 px-3">Pedido / Cód</th>
                      <th className="py-2.5 px-3 text-center">Status Portaria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewItems.slice(0, 150).map((item) => {
                      const isUsed = item.ticketStatus === 'used' || !!item.usedAt;
                      return (
                        <tr key={`${item.orderId}-${item.ticketNumber}-${item.seq}`} className="hover:bg-indigo-50/40 transition">
                          <td className="py-2 px-3 text-center font-bold text-gray-400 text-[11px]">
                            {item.seq}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-gray-900">{item.holderName}</div>
                            {item.buyerName && item.buyerName !== item.holderName && !item.isVirtualOrGeneric && (
                              <div className="text-[10px] text-gray-400">Comprador: {item.buyerName}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-gray-600">
                            {formatCPF(item.holderDoc) || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-gray-600">
                            {formatPhone(item.holderPhone) || '-'}
                          </td>
                          {includeBatchColumn && (
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                item.isComplimentary
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {item.isComplimentary ? 'Cortesia' : item.batchName}
                              </span>
                            </td>
                          )}
                          <td className="py-2 px-3 font-mono text-[10px] text-gray-500">
                            #{item.orderId.substring(0, 8).toUpperCase()} (Ing #{item.ticketNumber})
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isUsed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Já Entrou
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                [ &nbsp; ] Disponível
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {previewItems.length > 150 && (
              <div className="p-2 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500">
                Mostrando os primeiros 150 convidados na prévia. Na impressão sairão todos os <strong>{previewItems.length}</strong>.
              </div>
            )}
          </div>

        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Documento otimizado para conferência rápida física de documentos e assinaturas.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              disabled={preparedItems.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório de Portaria (Plano B)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminGuestListPrintModal;
