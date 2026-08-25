import React, { useState } from 'react';
import { X, RotateCcw, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminRestoreOrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  onConfirmRestore: (orderId: string, targetStatus: 'pending' | 'paid') => Promise<boolean | void>;
}

export const AdminRestoreOrderConfirmModal: React.FC<AdminRestoreOrderConfirmModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmRestore,
}) => {
  const [targetStatus, setTargetStatus] = useState<'pending' | 'paid'>('pending');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmRestore(order.id, targetStatus);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-emerald-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-emerald-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 text-white rounded-2xl border border-white/30 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reativar Pedido</h2>
              <p className="text-xs text-emerald-100">Recuperação de pedido cancelado</p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4 text-sm">
          <p className="text-gray-600 leading-relaxed text-xs">
            Deseja reativar o pedido abaixo? Selecione o status de destino para o qual o pedido retornará:
          </p>

          {/* Card com Detalhes do Pedido */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
              <span className="font-bold text-emerald-950">Pedido #{order.id.substring(0, 8).toUpperCase()}</span>
              <span className="font-black text-emerald-700">{formatPrice(order.amount_total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-700 pt-1">
              <div>
                <span className="text-gray-500 block text-[11px]">Comprador:</span>
                <strong className="text-gray-900">{order.client_name || 'Cliente'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Ingressos:</span>
                <strong>{order.quantity} ingresso(s)</strong>
              </div>
            </div>
            {order.cancellation_reason && !order.cancellation_reason.trim().startsWith('[') && !order.cancellation_reason.trim().startsWith('{') && (
              <p className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100">
                Cancelado por: {order.cancellation_reason}
              </p>
            )}
          </div>

          {/* Seleção do Status de Destino */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-gray-700 block">
              Reativar como:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                targetStatus === 'pending'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="restore_status"
                  checked={targetStatus === 'pending'}
                  onChange={() => setTargetStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pendente</span>
                </div>
              </label>

              <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                targetStatus === 'paid'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="restore_status"
                  checked={targetStatus === 'paid'}
                  onChange={() => setTargetStatus('paid')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pago (Emitir)</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer com Botões */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>Confirmar Reativação</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRestoreOrderConfirmModal;
