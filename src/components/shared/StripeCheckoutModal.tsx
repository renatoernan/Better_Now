import React from 'react';
import { X, CreditCard, ShieldCheck, Ticket, User, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  batchName: string;
  unitPrice: number;
  quantity: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  onConfirmCheckout: () => void;
  loading: boolean;
  errorMessage?: string | null;
}

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  batchName,
  unitPrice,
  quantity,
  clientName,
  clientPhone,
  clientEmail,
  onConfirmCheckout,
  loading,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const totalPrice = unitPrice * quantity;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Resumo do Pedido</h2>
              <p className="text-xs text-gray-300">Pagamento seguro via Stripe</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Informações do Evento e Ingressos */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{eventTitle}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  {batchName}
                </span>
              </div>
              <Ticket className="w-5 h-5 text-gray-400 mt-1" />
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm text-gray-600">
              <span>Preço unitário ({quantity}x)</span>
              <span className="font-medium text-gray-900">{formatPrice(unitPrice)}</span>
            </div>

            <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-1">
              <span>Total a pagar</span>
              <span className="text-xl text-amber-600 font-extrabold">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* Dados do Comprador */}
          <div className="space-y-3">
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
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pagamento 100% encriptado e processado pelo Stripe</span>
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
            className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
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
