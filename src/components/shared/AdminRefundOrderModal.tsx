import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, Loader2, DollarSign, Info, FileText, CheckCircle2 } from 'lucide-react';
import { EventOrderRecord } from '../../shared/hooks/hooks/useEventOrders';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { isMercadoPagoOrder } from '../../shared/services/mercadoPagoRefundService';
import { openRefundReceipt, RefundReceiptData } from '../../shared/utils/utils/refundReceipt';
import { toast } from 'sonner';

interface AdminRefundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EventOrderRecord | null;
  eventTitle: string;
  eventDate?: string | null;
  onConfirmRefund: (params: {
    orderId: string;
    amount: number;
    reason: string;
    isPartial: boolean;
    registerOnly?: boolean;
    payoutAmount?: number | null;
  }) => Promise<boolean | void>;
}

export const AdminRefundOrderModal: React.FC<AdminRefundOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  eventTitle,
  eventDate,
  onConfirmRefund,
}) => {
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [registerOnly, setRegisterOnly] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  // Reembolso concluído nesta abertura: o modal passa a oferecer o comprovante
  const [doneReceipt, setDoneReceipt] = useState<RefundReceiptData | null>(null);

  useEffect(() => {
    if (order) {
      setRefundAmount(Number(order.amount_total) || 0);
      setReason('');
      setErrorMsg('');
      setRegisterOnly(false);
      setPayoutAmount(order.refund_payout_amount != null ? String(order.refund_payout_amount) : '');
      setDoneReceipt(null);
    }
    // Só ao abrir ou trocar de pedido: o recarregamento da lista após o
    // reembolso não pode apagar a tela de conclusão
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  const totalOrderAmount = Number(order.amount_total) || 0;
  const isPartial = refundAmount > 0 && refundAmount < totalOrderAmount;
  const viaMp = isMercadoPagoOrder(order);
  const refundsOnMp = viaMp && !registerOnly;
  // Repasse que o pedido teria sem reembolso: ingressos menos a taxa assumida
  const originalPayout = order.tickets_amount != null
    ? Math.max(Number(order.tickets_amount) - Number(order.organizer_fee || 0), 0)
    : null;
  const payoutValue = parseFloat(payoutAmount.replace(',', '.'));

  const receiptFor = (amount: number, refundedAt: string, why?: string | null): RefundReceiptData => ({
    orderId: order.id,
    eventTitle,
    eventDate,
    buyerName: order.client_name || 'Cliente',
    buyerDocument: order.client_document,
    paymentMethod: order.payment_method,
    quantity: order.quantity,
    amountPaid: totalOrderAmount,
    amountRefunded: amount,
    refundedAt,
    reason: why,
    viaMercadoPago: viaMp,
  });

  // Reembolso já registrado antes desta abertura
  const existingReceipt = order.refunded_at
    ? receiptFor(Number(order.refund_amount || totalOrderAmount), order.refunded_at, order.refund_reason)
    : null;
  const fullyRefunded = order.status === 'refunded';

  const showReceipt = (r: RefundReceiptData) => {
    if (!openRefundReceipt(r)) toast.error('O navegador bloqueou a janela do comprovante. Permita pop-ups para este site.');
  };

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

    // Não há fórmula para o repasse no parcial: quem absorve a conveniência
    // devolvida muda caso a caso, então o valor é sempre informado
    if (isPartial && !(payoutValue >= 0)) {
      setErrorMsg('Informe o valor do repasse à organização após o reembolso.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Informe o motivo do reembolso.');
      return;
    }

    setLoading(true);
    try {
      const ok = await onConfirmRefund({
        orderId: order.id,
        amount: refundAmount,
        reason: reason.trim(),
        isPartial,
        registerOnly,
        payoutAmount: isPartial ? Math.round(payoutValue * 100) / 100 : null,
      });
      if (ok === false) {
        setErrorMsg('O reembolso não foi registrado. Tente novamente.');
        return;
      }
      setDoneReceipt(receiptFor(refundAmount, new Date().toISOString(), reason.trim()));
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
              <h2 className="text-xl font-bold text-white">
                {doneReceipt ? 'Reembolso concluído' : fullyRefunded ? 'Comprovante de Reembolso' : refundsOnMp ? 'Estornar no Mercado Pago' : 'Registrar Reembolso'}
              </h2>
              <p className="text-xs text-purple-200">Controle de Devoluções e Reembolsos</p>
            </div>
          </div>
        </div>

        {(doneReceipt || fullyRefunded) && (() => {
          const r = doneReceipt || existingReceipt!;
          return (
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {r.amountRefunded < r.amountPaid - 0.01 ? 'Reembolso parcial' : 'Reembolso total'} de {formatPrice(r.amountRefunded)}
                  </p>
                  <p className="text-xs opacity-80">
                    Pedido #{order.id.substring(0, 8).toUpperCase()} · {order.client_name || 'Cliente'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Gere o comprovante para enviar ao comprador. Ele abre pronto para imprimir: escolha <strong>Salvar como PDF</strong> para anexar no e-mail ou no WhatsApp.
              </p>
              <div className="pt-2 flex justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => showReceipt(r)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Gerar comprovante (PDF)
                </button>
              </div>
            </div>
          );
        })()}

        {/* Formulário */}
        {!doneReceipt && !fullyRefunded && (
        <form onSubmit={handleConfirm} className="p-6 space-y-4 text-sm flex-1">
          {existingReceipt && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 text-xs text-fuchsia-900">
              <span>
                Já há reembolso parcial de <strong>{formatPrice(existingReceipt.amountRefunded)}</strong> neste pedido.
              </span>
              <button
                type="button"
                onClick={() => showReceipt(existingReceipt)}
                className="shrink-0 inline-flex items-center gap-1 font-bold text-fuchsia-800 hover:text-fuchsia-950 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Comprovante
              </button>
            </div>
          )}
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

          {/* Repasse após reembolso parcial */}
          {isPartial && (
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-orange-200 bg-orange-50/60">
              <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Valor do Repasse à organização (R$): *</span>
                {originalPayout != null && (
                  <span className="text-[11px] text-gray-500 font-normal">
                    Repasse sem reembolso: {formatPrice(originalPayout)}
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 font-bold text-gray-900 transition-all"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-[11px] text-orange-900/80 leading-relaxed">
                Quanto a organização recebe deste pedido depois do reembolso. É o valor que entra no controle de repasses e no relatório compartilhado.
                {originalPayout != null && payoutValue >= 0 && (
                  <> Diferença: <strong>{formatPrice(originalPayout - payoutValue)}</strong> a menos.</>
                )}
              </p>
            </div>
          )}

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
                {refundsOnMp && 'O valor será estornado no Mercado Pago e devolvido ao comprador. '}
                {isPartial
                  ? 'O pedido continuará como PAGO, com registro do valor devolvido. Os ingressos permanecem válidos para o evento.'
                  : 'O pedido mudará para status REEMBOLSADO e todos os ingressos vinculados serão automaticamente CANCELADOS.'}
              </p>
            </div>
          </div>

          {viaMp && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={registerOnly}
                onChange={(e) => setRegisterOnly(e.target.checked)}
                disabled={loading}
                className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-700">
                <strong className="text-gray-900">Já estornei no painel do Mercado Pago</strong> — apenas registrar no sistema, sem estornar de novo.
              </span>
            </label>
          )}

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
              <span>{refundsOnMp ? 'Estornar no Mercado Pago' : 'Confirmar Reembolso'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default AdminRefundOrderModal;
