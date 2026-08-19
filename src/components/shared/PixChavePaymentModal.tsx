import React, { useState } from 'react';
import { X, QrCode, Ticket, ArrowRight, ShieldCheck, Copy, Check, Info } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { toast } from 'sonner';

interface PixChavePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  batchName: string;
  unitPrice: number;
  quantity: number;
  feePercentage?: number;
  qrCodeUrl?: string;
  pixKey?: string;
  clientName?: string;
  clientPhone?: string;
  onProceedToProofUpload: () => void;
}

const PixChavePaymentModal: React.FC<PixChavePaymentModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  batchName,
  unitPrice,
  quantity,
  feePercentage = 0,
  qrCodeUrl,
  pixKey = '',
  clientName,
  clientPhone,
  onProceedToProofUpload,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const subtotal = unitPrice * quantity;
  const feeAmount = subtotal * (feePercentage / 100);
  const totalPrice = subtotal + feeAmount;

  const handleCopyPixKey = async () => {
    const textToCopy = pixKey || qrCodeUrl || '';
    if (!textToCopy) {
      toast.info('Chave Pix não informada pelo organizador. Utilize a leitura do QR Code.');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Código Pix copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar chave Pix:', err);
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header Superior */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 text-white p-5 px-6 relative flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Pagamento via Pix</h2>
              <p className="text-xs text-emerald-300/90">{eventTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Card Principal do Pix - Inspirado no Design Referência com a Identidade Visual do Better Now */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white text-center shadow-lg border border-indigo-800/40 relative overflow-hidden">
            {/* Efeito sutil de iluminação de fundo */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Título & Subtítulo */}
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold tracking-tight text-white">
                  Use o QR Code do Pix para pagar
                </h3>
                <p className="text-xs text-indigo-200/80 max-w-xs mx-auto leading-relaxed">
                  Abra o app em que vai fazer a transferência, escaneie a imagem ou cole o código do QR Code
                </p>
              </div>

              {/* QR Code Frame */}
              <div className="inline-block p-3 bg-white rounded-2xl shadow-xl shadow-black/20 border-2 border-white/90">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Pix do Evento"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50 rounded-xl">
                    <QrCode className="w-14 h-14 stroke-1 text-gray-300" />
                    <span className="text-xs font-medium text-gray-500">QR Code da Chave</span>
                  </div>
                )}
              </div>

              {/* Valor em Grande Destaque */}
              <div className="pt-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {formatPrice(totalPrice)}
                </span>
                {feeAmount > 0 && (
                  <p className="text-[11px] text-emerald-300/90 font-medium mt-0.5">
                    (Inclui taxa de conveniência de {feePercentage}%)
                  </p>
                )}
              </div>

              {/* Botão de Copiar Código / Chave Pix */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyPixKey}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-white text-indigo-950 hover:bg-indigo-50 active:scale-[0.99] shadow-black/20'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Código copiado com sucesso!</span>
                    </>
                  ) : (
                    <>
                      <span>Copiar código do QR Code</span>
                      <Copy className="w-4 h-4 text-indigo-700" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resumo Discriminado da Compra */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-500 pb-2 border-b border-gray-100">
              <span className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">Resumo do Pedido</span>
              <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                {batchName} • {quantity}x
              </span>
            </div>

            <div className="space-y-1.5 text-gray-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal ({quantity}x {formatPrice(unitPrice)})</span>
                <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {feeAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Taxa de conveniência ({feePercentage}%)</span>
                  <span>+{formatPrice(feeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100 text-sm">
                <span>Total:</span>
                <span className="text-indigo-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Instruções de envio de comprovante */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-900">Importante:</p>
              <p className="text-emerald-800/90 leading-relaxed">
                Após efetuar o Pix no seu aplicativo bancário, salve o comprovante e clique no botão abaixo para enviá-lo e garantir seus ingressos.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Seu pedido será validado pela equipe do evento após o envio</span>
          </div>
        </div>

        {/* Footer com Botão de Ação */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onProceedToProofUpload}
            className="flex-1 px-4 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 group active:scale-[0.99]"
          >
            <span>Já realizei o pagamento</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PixChavePaymentModal;
