import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, FileText, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface AdminPaymentProofAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  onApprove: (orderId: string) => Promise<boolean>;
  onReject: (orderId: string, reason: string) => Promise<boolean>;
}

export const AdminPaymentProofAuditModal: React.FC<AdminPaymentProofAuditModalProps> = ({
  isOpen,
  onClose,
  order,
  onApprove,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !order) return null;

  const handleApproveClick = async () => {
    setActionLoading(true);
    const ok = await onApprove(order.id);
    setActionLoading(false);
    if (ok) onClose();
  };

  const handleRejectClick = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    const ok = await onReject(order.id, rejectReason.trim());
    setActionLoading(false);
    if (ok) {
      setShowRejectInput(false);
      setRejectReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-950 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="absolute top-5 right-5 text-emerald-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 text-white rounded-xl border border-white/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Auditoria de Comprovante Pix</h2>
              <p className="text-xs text-emerald-200">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Informações da compra */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Comprador</p>
              <p className="font-semibold text-gray-900">{order.client_name || 'Cliente'}</p>
            </div>
            <div>
              <p className="text-gray-500">WhatsApp</p>
              <p className="font-semibold text-gray-900">{order.client_phone || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Quantidade</p>
              <p className="font-semibold text-gray-900">{order.quantity} ingresso(s)</p>
            </div>
            <div>
              <p className="text-gray-500">Valor Esperado</p>
              <p className="font-bold text-emerald-700 text-sm">{formatPrice(order.amount_total)}</p>
            </div>
          </div>

          {/* Visualização do Comprovante */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Comprovante Anexado</span>
              {order.payment_proof_url && (
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Abrir original</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="bg-gray-100 rounded-2xl p-2 border border-gray-200 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden">
              {order.payment_proof_url ? (
                <img
                  src={order.payment_proof_url}
                  alt="Comprovante de Pagamento"
                  className="max-h-[340px] w-auto object-contain rounded-xl shadow-sm"
                  onError={(e) => {
                    // Fallback para documento PDF ou erro de carregamento
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs">Nenhum arquivo de comprovante localizado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Seção de Motivo de Rejeição */}
          {showRejectInput && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2 animate-in fade-in">
              <label className="text-xs font-bold text-red-900 block">
                Motivo da Recusa (será registrado no pedido):
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Valor divergente, comprovante ilegível..."
                className="w-full px-3 py-2 text-xs border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-white"
                disabled={actionLoading}
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-red-100/50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRejectClick}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Recusa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        {!showRejectInput && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowRejectInput(true)}
              disabled={actionLoading}
              className="px-4 py-2.5 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Recusar Comprovante</span>
            </button>

            <button
              type="button"
              onClick={handleApproveClick}
              disabled={actionLoading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Aprovar Pagamento e Emitir Ingressos</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentProofAuditModal;
