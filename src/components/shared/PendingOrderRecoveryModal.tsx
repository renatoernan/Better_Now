import React from 'react';
import { Clock, CheckCircle, RefreshCw, X, Ticket, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

export interface PendingOrderInfo {
  id: string;
  created_at: string;
  quantity: number;
  batch_name?: string;
  amount_total: number;
  payment_method?: string;
  client_name?: string;
}

interface PendingOrderRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrder: PendingOrderInfo | null;
  onContinueExisting: () => void;
  onDiscardAndCreateNew: () => void;
  loading?: boolean;
}

export const PendingOrderRecoveryModal: React.FC<PendingOrderRecoveryModalProps> = ({
  isOpen,
  onClose,
  pendingOrder,
  onContinueExisting,
  onDiscardAndCreateNew,
  loading = false,
}) => {
  if (!isOpen || !pendingOrder) return null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };

  const getMethodLabel = (method?: string) => {
    if (method === 'credit_card') return 'Cartão de Crédito';
    if (method === 'pix' || method === 'pix_stripe' || method === 'pix_chave') return 'Pix';
    if (method === 'boleto') return 'Boleto';
    return 'Mercado Pago';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header com Gradiente de Aviso */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white p-6 relative overflow-hidden">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-amber-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pedido Pendente Encontrado</h2>
              <p className="text-xs text-amber-100 mt-0.5">Evite pedidos duplicados</p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Identificamos que você já possui um pedido em andamento com a <strong className="text-gray-900">mesma quantidade de ingressos ({pendingOrder.quantity}x)</strong> gerado recentemente.
          </p>

          {/* Card com Detalhes do Pedido Pendente */}
          <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-100/40 p-4 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200/60 pb-2">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                Pedido #{pendingOrder.id.substring(0, 8).toUpperCase()}
              </span>
              <span className="px-2 py-0.5 bg-amber-200/80 text-amber-950 font-bold rounded-md text-[10px]">
                Aguardando Pagamento
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-700 pt-1">
              <div>
                <p className="text-gray-500 text-[11px]">Gerado em:</p>
                <p className="font-semibold">{formatDate(pendingOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11px]">Forma:</p>
                <p className="font-semibold">{getMethodLabel(pendingOrder.payment_method)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11px]">Quantidade:</p>
                <p className="font-semibold">{pendingOrder.quantity} ingresso(s)</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11px]">Valor Total:</p>
                <p className="font-extrabold text-indigo-700 text-sm">{formatPrice(pendingOrder.amount_total)}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>Você pode continuar o pagamento do pedido existente ou desconsiderá-lo para gerar um novo pedido.</span>
          </div>
        </div>

        {/* Footer com Botões de Decisão */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onDiscardAndCreateNew}
            disabled={loading}
            className="flex-1 px-4 py-3 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Desconsiderar e Criar Novo</span>
          </button>

          <button
            type="button"
            onClick={onContinueExisting}
            disabled={loading}
            className="flex-1 px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Continuar este Pedido</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingOrderRecoveryModal;
