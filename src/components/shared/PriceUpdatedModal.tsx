import React from 'react';
import { AlertTriangle, RefreshCw, X, ArrowRight, Tag, ShieldAlert } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface PriceUpdatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldUnitPrice: number;
  newUnitPrice: number;
  batchName?: string;
  reason?: 'price_changed' | 'batch_expired' | 'batch_sold_out' | 'fee_changed';
}

export const PriceUpdatedModal: React.FC<PriceUpdatedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  oldUnitPrice,
  newUnitPrice,
  batchName = 'Lote',
  reason = 'price_changed',
}) => {
  if (!isOpen) return null;

  const getReasonTitle = () => {
    switch (reason) {
      case 'batch_expired':
        return 'Lote de Ingressos Expirado';
      case 'batch_sold_out':
        return 'Lote de Ingressos Esgotado';
      case 'fee_changed':
        return 'Taxas de Pagamento Atualizadas';
      case 'price_changed':
      default:
        return 'Valores dos Ingressos Atualizados';
    }
  };

  const getReasonDescription = () => {
    switch (reason) {
      case 'batch_expired':
        return 'O lote anterior expirou e os novos valores vigentes para o próximo lote já foram aplicados pela organização.';
      case 'batch_sold_out':
        return 'O lote anterior foi esgotado. Atualizamos a sua tela com os dados e valores do lote vigente.';
      case 'fee_changed':
        return 'As condições de pagamento ou taxas foram atualizadas recentemente pela organização do evento.';
      case 'price_changed':
      default:
        return 'Os valores deste lote foram atualizados recentemente pela organização do evento enquanto você navegava na página.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header com Gradiente de Alerta */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white p-6 relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-amber-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{getReasonTitle()}</h2>
              <p className="text-xs text-amber-100 mt-0.5">Aviso de segurança e atualização</p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            {getReasonDescription()}
          </p>

          {/* Comparativo de Preços */}
          <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-100/40 p-4 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200/60 pb-2">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                {batchName}
              </span>
              <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-md text-[10px]">
                Atualização em Tempo Real
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white/90 rounded-xl border border-amber-100">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Valor em Tela</p>
                <p className="text-base font-bold text-gray-400 line-through mt-0.5">
                  {formatPrice(oldUnitPrice)}
                </p>
                <span className="text-[10px] text-gray-400">Desatualizado</span>
              </div>

              <div className="p-3 bg-white rounded-xl border-2 border-indigo-500 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-bl-lg uppercase">
                  Vigente
                </div>
                <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Novo Valor</p>
                <p className="text-lg font-extrabold text-indigo-900 mt-0.5">
                  {formatPrice(newUnitPrice)}
                </p>
                <span className="text-[10px] text-indigo-600 font-semibold">Valor oficial</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-xs text-blue-800">
            <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Atualizamos os valores na sua tela para que você possa conferir antes de prosseguir com a compra.</span>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ver Novos Valores</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceUpdatedModal;
