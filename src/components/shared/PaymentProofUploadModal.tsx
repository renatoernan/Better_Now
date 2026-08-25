import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, FileCheck, User, Phone, Mail } from 'lucide-react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import { uploadPaymentProof, createPixChaveOrder } from '../../shared/services/stripeService';
import { toast } from 'sonner';

interface PaymentProofUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  batchIndex: number;
  batchName: string;
  unitPrice: number;
  quantity: number;
  feePercentage?: number;
  appliedCoupon?: any;
  discountAmount?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientId?: string;
  onSuccess: () => void;
}

const PaymentProofUploadModal: React.FC<PaymentProofUploadModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  batchIndex,
  batchName,
  unitPrice,
  quantity,
  feePercentage = 0,
  appliedCoupon,
  discountAmount = 0,
  clientName = '',
  clientPhone = '',
  clientEmail = '',
  clientDocument = '',
  clientId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  if (!isOpen) return null;

  const rawSubtotal = unitPrice * quantity;
  const discount = discountAmount || (appliedCoupon?.discount_applied ?? 0);
  const subtotal = Math.max(0, rawSubtotal - discount);
  const feeAmount = subtotal * (feePercentage / 100);
  const totalPrice = subtotal + feeAmount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validar tamanho (máx 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage('O arquivo deve ter no máximo 10MB.');
      return;
    }

    setErrorMessage(null);
    setFile(selected);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmitProof = async () => {
    if (!file) {
      setErrorMessage('Por favor, anexe a foto ou print do comprovante de pagamento.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Upload do comprovante
      const uploadRes = await uploadPaymentProof(file, eventId);
      if (uploadRes.error) {
        setErrorMessage(uploadRes.error);
        setLoading(false);
        return;
      }

      // 2. Registrar pedido no banco de dados com status 'pending_proof'
      const orderRes = await createPixChaveOrder({
        event_id: eventId,
        client_id: clientId || undefined,
        batch_index: batchIndex,
        batch_name: batchName,
        quantity: quantity,
        amount_total: totalPrice,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        client_document: clientDocument || undefined,
        payment_proof_url: uploadRes.url,
        convenience_fee: feeAmount,
        convenience_fee_percentage: feePercentage,
        coupon_id: appliedCoupon?.coupon_id || undefined,
        coupon_code: appliedCoupon?.code || undefined,
        discount_amount: discount,
      });

      if (orderRes.error) {
        setErrorMessage(orderRes.error);
        setLoading(false);
        return;
      }

      // Sucesso!
      setIsSuccessStep(true);
    } catch (err: any) {
      console.error('Erro ao enviar comprovante:', err);
      setErrorMessage(err.message || 'Erro ao processar envio do comprovante.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setIsSuccessStep(false);
    setFile(null);
    setPreviewUrl(null);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-gray-900 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Comprovante de Pagamento</h2>
              <p className="text-xs text-emerald-200">Envie a confirmação para validação do seu ingresso</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccessStep ? (
            /* Tela de Sucesso */
            <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-xl font-bold text-gray-900">Comprovante Enviado!</h3>
                <p className="text-xs text-gray-600">
                  Recebemos seu comprovante de pagamento no valor de <strong className="text-emerald-700">{formatPrice(totalPrice)}</strong>.
                </p>
                <p className="text-xs text-gray-500 pt-1">
                  Nossa equipe irá conferir a transferência e validar seus ingressos em breve. Você receberá uma notificação!
                </p>
              </div>

              <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-xs space-y-1.5 text-gray-600 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Evento:</span>
                  <span className="font-semibold text-gray-900">{eventTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lote:</span>
                  <span className="font-semibold text-gray-900">{batchName} ({quantity}x)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status do Pedido:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Aguardando Validação
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Formulário de Upload */
            <>
              {/* Resumo do Valor */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/70 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{eventTitle}</p>
                  <p className="text-sm font-bold text-gray-900">{batchName} ({quantity}x)</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">Total a comprovar</p>
                  <p className="text-lg font-extrabold text-emerald-600">{formatPrice(totalPrice)}</p>
                </div>
              </div>

              {/* Área de Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Foto ou PDF do Comprovante *
                </label>

                {previewUrl ? (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white max-h-56 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Comprovante de pagamento"
                        className="max-h-56 w-auto object-contain rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-gray-700 truncate max-w-[240px]">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium">{file?.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Trocar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50/70 hover:bg-emerald-50/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Clique para selecionar o comprovante</span>
                    <span className="text-xs text-gray-500 mt-0.5">Formatos suportados: PNG, JPG, JPEG, WEBP (máx. 10MB)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={loading}
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Dados do Comprador */}
              {(clientName || clientPhone || clientEmail) && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dados do Titular</h4>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/70 space-y-1.5 text-xs text-gray-700">
                    {clientName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{clientName}</span>
                      </div>
                    )}
                    {clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{clientPhone}</span>
                      </div>
                    )}
                    {clientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{clientEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Atenção</p>
                    <p className="text-red-600 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {isSuccessStep ? (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20"
            >
              Concluir
            </button>
          ) : (
            <>
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
                onClick={handleSubmitProof}
                disabled={loading || !file}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Enviar Comprovante</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentProofUploadModal;
