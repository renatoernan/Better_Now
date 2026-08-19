import React from 'react';
import { X, CreditCard, ShieldCheck, Ticket, User, Phone, Mail, AlertCircle, Loader2, FileText, QrCode, ExternalLink, Clock } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  batchName: string;
  unitPrice: number;
  quantity: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  feePercentage?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  onConfirmCheckout: () => void;
  loading: boolean;
  errorMessage?: string | null;
  awaitingPayment?: boolean;
}

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  batchName,
  unitPrice,
  quantity,
  paymentMethod,
  paymentMethodLabel,
  feePercentage = 0,
  clientName,
  clientPhone,
  clientEmail,
  onConfirmCheckout,
  loading,
  errorMessage,
  awaitingPayment = false,
}) => {
  if (!isOpen) return null;

  const subtotal = unitPrice * quantity;
  const feeAmount = subtotal * (feePercentage / 100);
  const totalPrice = subtotal + feeAmount;

  const getMethodIcon = () => {
    if (paymentMethod === 'boleto') return <FileText className="w-4 h-4 text-indigo-600" />;
    if (paymentMethod === 'pix' || paymentMethod === 'pix_stripe') return <QrCode className="w-4 h-4 text-emerald-600" />;
    return <CreditCard className="w-4 h-4 text-indigo-600" />;
  };

  // Tela de "Aguardando Pagamento" quando o checkout foi aberto na outra aba
  if (awaitingPayment) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 text-white rounded-xl border border-white/30">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Aguardando Pagamento</h2>
                <p className="text-xs text-amber-100">Complete o pagamento na aba do Mercado Pago</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Animação de Aguardando */}
            <div className="text-center py-6 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 animate-ping opacity-30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Pagamento em andamento</h3>
                <p className="text-sm text-gray-600 max-w-xs mx-auto">
                  Complete o pagamento na aba do <span className="font-semibold text-blue-600">Mercado Pago</span> que foi aberta.
                </p>
                <p className="text-xs text-gray-500">
                  Esta tela será atualizada automaticamente quando o pagamento for confirmado.
                </p>
              </div>
            </div>

            {/* Resumo do Pedido Compacto */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">{eventTitle}</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                  {batchName}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-200 pt-2">
                <span>{quantity}x {formatPrice(unitPrice)}</span>
                <span className="font-bold text-base text-indigo-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* Dica */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
              <ExternalLink className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Não encontrou a aba do Mercado Pago?</p>
                <p className="mt-0.5 text-blue-700">
                  Verifique se o navegador bloqueou pop-ups. Caso tenha fechado a aba sem querer, clique em "Cancelar" e refaça o processo.
                </p>
              </div>
            </div>

            {/* Indicador Visual de Polling */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Verificando status do pagamento...</span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar e Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Resumo do Pedido</h2>
              <p className="text-xs text-blue-200">Pagamento seguro via Mercado Pago • Em até 12x</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Informações do Evento e Ingressos */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{eventTitle}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                  {batchName}
                </span>
              </div>
              <Ticket className="w-5 h-5 text-gray-400 mt-1" />
            </div>

            {paymentMethodLabel && (
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-white rounded-lg border border-gray-200/70">
                <span className="text-gray-500 font-medium">Forma de pagamento:</span>
                <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                  {getMethodIcon()}
                  <span>{paymentMethodLabel}</span>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>Subtotal ({quantity}x {formatPrice(unitPrice)})</span>
                <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {feeAmount > 0 && (
                <div className="flex justify-between items-center text-amber-700">
                  <span>Taxa de conveniência ({feePercentage}%)</span>
                  <span className="font-semibold">+{formatPrice(feeAmount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-base font-bold text-gray-900">
              <span>Total a pagar</span>
              <span className="text-xl text-indigo-600 font-extrabold">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* Dados do Comprador */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dados do Comprador</h4>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-sm">
              {clientName && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{clientName}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{clientPhone}</span>
                </div>
              )}
              {clientEmail && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{clientEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Não foi possível prosseguir</p>
                <p className="text-xs mt-0.5 text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Selo de Segurança */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Pagamento 100% encriptado e processado pelo Mercado Pago</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmCheckout}
            disabled={loading}
            className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pagar R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
