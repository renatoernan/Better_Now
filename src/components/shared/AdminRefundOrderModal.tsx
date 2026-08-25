import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, Loader2, DollarSign, Info } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminRefundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  onConfirmRefund: (params: {
    orderId: string;
    amount: number;
    reason: string;
    isPartial: boolean;
  }) => Promise<boolean | void>;
}

export const AdminRefundOrderModal: React.FC<AdminRefundOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmRefund,
}) => {
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (order) {
      setRefundAmount(Number(order.amount_total) || 0);
      setReason('');
      setErrorMsg('');
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const totalOrderAmount = Number(order.amount_total) || 0;
  const isPartial = refundAmount > 0 && refundAmount < totalOrderAmount;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (refundAmount <= 0) {
      setErrorMsg('Informe um valor de reembolso maior que zero.');
      return;
    }

    if (refundAmount > totalOrderAmount) {
      setErrorMsg(`O valor de reembolso não pode ser superior ao total do pedido (${formatPrice(totalOrderAmount)}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Informe o motivo do reembolso.');
      return;
    }

    setLoading(true);
    try {
      await onConfirmRefund({
        orderId: order.id,
        amount: refundAmount,
        reason: reason.trim(),
        isPartial,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar reembolso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-purple-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header com tom Roxo / Violeta */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-purple-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 text-purple-100 rounded-2xl border border-white/20 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registrar Reembolso</h2>
              <p className="text-xs text-purple-200">Controle de Devoluções e Reembolsos</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-sm flex-1">
          {/* Card com Detalhes do Pedido */}
          <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-purple-200/60 pb-2">
              <span className="font-bold text-purple-950">Pedido #{order.id.substring(0, 8).toUpperCase()}</span>
              <span className="font-black text-purple-900 text-sm">{formatPrice(totalOrderAmount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-700 pt-1">
              <div>
                <span className="text-gray-500 block text-[11px]">Comprador:</span>
                <strong className="text-gray-900">{order.client_name || 'Cliente'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Ingressos vinculados:</span>
                <strong className="text-purple-700">{order.quantity} ingresso(s)</strong>
              </div>
            </div>
          </div>

          {/* Tipo de Reembolso Badge */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-700">Tipo de Reembolso:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isPartial
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {isPartial ? 'Reembolso Parcial' : 'Reembolso Total'}
            </span>
          </div>

          {/* Campo de Valor do Reembolso */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Valor a ser Reembolsado (R$):</span>
              <span className="text-[11px] text-gray-400 font-normal">
                Máximo: {formatPrice(totalOrderAmount)}
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                R$
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={totalOrderAmount}
                value={refundAmount || ''}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white font-bold text-gray-900 transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Campo de Motivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Motivo do Reembolso: *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Desistência do cliente, evento reagendado, estorno solicitado no gateway..."
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-gray-800 resize-none"
              disabled={loading}
              required
            />
          </div>

          {/* Alerta explicativo */}
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            isPartial ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {isPartial ? 'Atenção ao Reembolso Parcial:' : 'Atenção ao Reembolso Total:'}
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                {isPartial
                  ? 'O pedido continuará como PAGO, com registro do valor devolvido. Os ingressos permanecem válidos para o evento.'
                  : 'O pedido mudará para status REEMBOLSADO e todos os ingressos vinculados serão automaticamente CANCELADOS.'}
              </p>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer com Botões */}
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>Confirmar Reembolso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRefundOrderModal;
