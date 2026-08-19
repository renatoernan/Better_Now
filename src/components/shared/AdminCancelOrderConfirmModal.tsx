import React, { useState } from 'react';
import { X, Ban, AlertTriangle, Loader2 } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminCancelOrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  onConfirmCancel: (orderId: string, reason: string) => Promise<boolean | void>;
}

export const AdminCancelOrderConfirmModal: React.FC<AdminCancelOrderConfirmModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState('Cancelado pelo administrador');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmCancel(order.id, reason.trim() || 'Cancelado pelo administrador');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header com tom de Alerta Vermelho */}
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-red-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 text-white rounded-2xl border border-white/30 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cancelar Pedido</h2>
              <p className="text-xs text-red-100">Confirmação de cancelamento</p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4 text-sm">
          <p className="text-gray-600 leading-relaxed text-xs">
            Você tem certeza que deseja cancelar o pedido abaixo? Esta ação invalidará quaisquer ingressos vinculados a esta compra.
          </p>

          {/* Card com Detalhes do Pedido */}
          <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-red-200/60 pb-2">
              <span className="font-bold text-red-950">Pedido #{order.id.substring(0, 8).toUpperCase()}</span>
              <span className="font-black text-red-700">{formatPrice(order.amount_total)}</span>
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
          </div>

          {/* Campo de Motivo do Cancelamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Motivo do Cancelamento:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pagamento não efetuado, solicitação do comprador..."
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-800"
              disabled={loading}
            />
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
            Manter Pedido
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            <span>Confirmar Cancelamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCancelOrderConfirmModal;
