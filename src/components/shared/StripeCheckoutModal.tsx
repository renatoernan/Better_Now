import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  Ticket,
  User,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  FileText,
  QrCode,
  ExternalLink,
  Clock,
  Copy,
  Check,
  Lock,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatPrice } from '../../shared/utils/utils/eventUtils';
import {
  createMercadoPagoPixPayment,
  processMercadoPagoCardPayment,
  loadMercadoPagoSDK,
  getCardBrand,
  checkMercadoPagoPaymentStatus,
  PixPaymentResponse,
} from '../../shared/services/mercadoPagoService';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  batchIndex?: number;
  eventTitle: string;
  batchName: string;
  unitPrice: number;
  quantity: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  feePercentage?: number;
  appliedCoupon?: any;
  discountAmount?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientId?: string;
  existingOrderId?: string;
  maxInstallments?: number;
  selectedInstallments?: number;
  onPaymentSuccess?: (orderId: string) => void;
  onConfirmCheckout?: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  awaitingPayment?: boolean;
  checkoutUrl?: string | null;
  attendees?: any[];
}

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  eventId,
  batchIndex = 0,
  eventTitle,
  batchName,
  unitPrice,
  quantity,
  paymentMethod,
  paymentMethodLabel,
  feePercentage = 0,
  appliedCoupon,
  discountAmount = 0,
  clientName,
  clientPhone,
  clientEmail,
  clientDocument,
  clientId,
  existingOrderId,
  maxInstallments = 12,
  selectedInstallments: initialInstallments = 1,
  onPaymentSuccess,
  onConfirmCheckout,
  loading: externalLoading = false,
  errorMessage: externalErrorMessage,
  awaitingPayment: externalAwaitingPayment = false,
  checkoutUrl,
  attendees = [],
}) => {
  if (!isOpen) return null;

  const isPix = paymentMethod === 'pix' || paymentMethod === 'pix_stripe';
  const isCard = paymentMethod === 'credit_card' || !paymentMethod;
  const isBoleto = paymentMethod === 'boleto';

  const subtotal = unitPrice * quantity;
  const discount = discountAmount || (appliedCoupon?.discount_applied ?? 0);
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const feeAmount = subtotalAfterDiscount * (feePercentage / 100);
  const totalPrice = subtotalAfterDiscount + feeAmount;

  // Estados do PIX Transparente
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixTimer, setPixTimer] = useState(900); // 15 minutos em segundos

  // Estados do Cartão de Crédito Transparente
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(clientName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState(clientDocument || '');
  const [installments, setInstallments] = useState(initialInstallments || 1);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [detectedBrand, setDetectedBrand] = useState('');

  // Identificação da bandeira em tempo real
  useEffect(() => {
    const brand = getCardBrand(cardNumber);
    setDetectedBrand(brand);
  }, [cardNumber]);

  // Sincronizar dados do comprador
  useEffect(() => {
    if (clientName && !cardHolder) setCardHolder(clientName);
    if (clientDocument && !cardCpf) setCardCpf(clientDocument);
  }, [clientName, clientDocument]);

  // Geração Automática do Pix ao abrir com método Pix
  const hasGeneratedPixRef = useRef(false);
  useEffect(() => {
    if (isOpen && isPix && !pixData && !pixLoading && !hasGeneratedPixRef.current && eventId) {
      hasGeneratedPixRef.current = true;
      generatePix();
    }
  }, [isOpen, isPix, eventId]);

  // Timer regressivo do Pix
  useEffect(() => {
    if (!pixData || pixTimer <= 0) return;
    const interval = setInterval(() => {
      setPixTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pixData, pixTimer]);

  // Polling em tempo real para confirmação do Pix (para imediatamente após confirmação)
  const paymentConfirmedRef = useRef(false);
  useEffect(() => {
    if (!pixData?.orderId || paymentConfirmedRef.current) return;

    let pollInterval: any;

    const checkStatus = async () => {
      if (paymentConfirmedRef.current) return;
      try {
        const res = await checkMercadoPagoPaymentStatus(pixData.orderId);
        if (res.paid && !paymentConfirmedRef.current) {
          paymentConfirmedRef.current = true;
          if (pollInterval) clearInterval(pollInterval);
          if (onPaymentSuccess) {
            onPaymentSuccess(pixData.orderId);
          }
        }
      } catch (err) {
        // Silencioso
      }
    };

    pollInterval = setInterval(checkStatus, 3500);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pixData?.orderId, onPaymentSuccess]);

  const generatePix = async () => {
    if (!eventId) return;
    setPixLoading(true);
    setPixError(null);

    try {
      const res = await createMercadoPagoPixPayment({
        event_id: eventId,
        batch_index: batchIndex,
        batch_name: batchName,
        unit_price: unitPrice,
        quantity: quantity,
        convenience_fee: feeAmount,
        convenience_fee_percentage: feePercentage,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_document: clientDocument || cardCpf,
        client_id: clientId,
        existing_order_id: existingOrderId,
        coupon_id: appliedCoupon?.coupon_id,
        coupon_code: appliedCoupon?.code,
        discount_amount: discount,
        attendees: attendees,
      });

      if (res.success && res.qrCode) {
        setPixData(res);
        setPixTimer(900);
      } else {
        setPixError(res.error || 'Não foi possível gerar a chave Pix. Tente novamente.');
      }
    } catch (err: any) {
      setPixError(err.message || 'Erro ao gerar Pix.');
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  // Máscaras de entrada para Cartão de Crédito
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(val);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleCardCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCardCpf(val);
  };

  // Processamento do Cartão de Crédito Transparente
  const handlePayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    const cleanCard = cardNumber.replace(/\D/g, '');
    const cleanCpf = cardCpf.replace(/\D/g, '');
    const [month, year] = cardExpiry.split('/');

    if (cleanCard.length < 13 || cleanCard.length > 19) {
      setCardError('Digite um número de cartão válido.');
      return;
    }
    if (!cardHolder.trim()) {
      setCardError('Digite o nome do titular como está no cartão.');
      return;
    }
    if (!month || !year || Number(month) < 1 || Number(month) > 12 || year.length < 2) {
      setCardError('Data de validade inválida. Use o formato MM/AA.');
      return;
    }
    if (cardCvv.length < 3) {
      setCardError('Código de segurança (CVV) inválido.');
      return;
    }
    if (cleanCpf.length !== 11) {
      setCardError('CPF do titular deve ter 11 dígitos.');
      return;
    }

    setCardLoading(true);
    setCardError(null);

    try {
      const publicKey = (import.meta as any).env.VITE_MERCADOPAGO_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('Chave pública do Mercado Pago não configurada (VITE_MERCADOPAGO_PUBLIC_KEY).');
      }

      // Carregar SDK oficial do Mercado Pago
      const MercadoPagoClass = await loadMercadoPagoSDK();
      const mp = new MercadoPagoClass(publicKey, { locale: 'pt-BR' });

      const expYear = year.length === 2 ? `20${year}` : year;

      // Tokenizar o cartão de forma segura
      const tokenResponse = await mp.createCardToken({
        cardNumber: cleanCard,
        cardholderName: cardHolder.trim(),
        cardExpirationMonth: month.trim(),
        cardExpirationYear: expYear.trim(),
        securityCode: cardCvv.trim(),
        identificationType: 'CPF',
        identificationNumber: cleanCpf,
      });

      if (!tokenResponse || !tokenResponse.id) {
        throw new Error('Não foi possível validar os dados do cartão. Verifique o número, validade e CVV.');
      }

      const cardToken = tokenResponse.id;
      const paymentMethodId = detectedBrand || 'visa';

      // Sanitização Imediata de Memória (PCI DSS): remove dados brutos do estado React
      setCardNumber('');
      setCardCvv('');

      // Processar pagamento seguro via Edge Function do Supabase
      const paymentResult = await processMercadoPagoCardPayment({
        event_id: eventId,
        batch_index: batchIndex,
        batch_name: batchName,
        unit_price: unitPrice,
        quantity: quantity,
        convenience_fee: feeAmount,
        convenience_fee_percentage: feePercentage,
        client_name: clientName || cardHolder,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_document: cleanCpf,
        client_id: clientId,
        existing_order_id: existingOrderId,
        coupon_id: appliedCoupon?.coupon_id,
        coupon_code: appliedCoupon?.code,
        discount_amount: discount,
        cardToken,
        paymentMethodId,
        installments: Number(installments) || 1,
        attendees: attendees,
      });

      if (paymentResult.success && paymentResult.status === 'approved') {
        if (onPaymentSuccess && paymentResult.orderId) {
          onPaymentSuccess(paymentResult.orderId);
        }
      } else {
        setCardError(paymentResult.message || paymentResult.error || 'Pagamento recusado pela operadora.');
      }
    } catch (err: any) {
      console.error('Erro ao processar cartão transparente:', err);
      setCardError(err.message || 'Erro inesperado ao processar cartão.');
    } finally {
      setCardLoading(false);
    }
  };

  // Opções de parcelas
  const installmentOptions = useMemo(() => {
    const opts = [];
    const max = Math.min(12, Math.max(1, maxInstallments));
    for (let i = 1; i <= max; i++) {
      const val = totalPrice / i;
      opts.push({
        count: i,
        label: `${i}x de ${formatPrice(val)} sem juros`,
        total: totalPrice,
      });
    }
    return opts;
  }, [totalPrice, maxInstallments]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header Elegante Dinâmico */}
        <div
          className={`p-5 sm:p-6 text-white relative ${
            isPix
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
              : 'bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950'
          }`}
        >
          <button
            onClick={onClose}
            disabled={cardLoading || pixLoading || externalLoading}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50 p-1.5 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 text-white rounded-2xl border border-white/20 shadow-inner">
              {isPix ? <QrCode className="w-6 h-6" /> : isBoleto ? <FileText className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {isPix ? 'Pagamento Instantâneo Pix' : isBoleto ? 'Boleto Bancário' : 'Cartão de Crédito'}
              </h2>
              <p className="text-xs text-white/80">
                {isPix
                  ? 'Aprovação imediata e emissão automática do ingresso'
                  : `Pagamento seguro • Em até ${maxInstallments}x`}
              </p>
            </div>
          </div>
        </div>

        {/* Body com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Card Resumo do Pedido */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-4 border border-gray-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{eventTitle}</h3>
                <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-full">
                  {batchName}
                </span>
              </div>
              <Ticket className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            </div>

            <div className="border-t border-gray-200/70 pt-2.5 space-y-1 text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>Ingressos ({quantity}x {formatPrice(unitPrice)})</span>
                <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    🏷️ Cupom {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              {feeAmount > 0 && (
                <div className="flex justify-between items-center text-amber-800">
                  <span>Taxa de serviço ({feePercentage}%)</span>
                  <span className="font-semibold">+{formatPrice(feeAmount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200/80 pt-2.5 flex justify-between items-center text-sm sm:text-base font-bold text-gray-900">
              <span>Total a pagar</span>
              <span className="text-lg sm:text-xl text-indigo-600 font-extrabold">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO DO PIX TRANSPARENTE                                 */}
          {/* ========================================================= */}
          {isPix && (
            <div className="space-y-4">
              {pixLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">Gerando seu QR Code Pix exclusivo...</p>
                  <p className="text-xs text-gray-500">Conectando de forma segura ao Banco Central</p>
                </div>
              ) : pixError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5 text-red-700">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Erro ao gerar Pix</p>
                      <p className="text-xs mt-0.5 text-red-600">{pixError}</p>
                    </div>
                  </div>
                  <button
                    onClick={generatePix}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tentar Novamente
                  </button>
                </div>
              ) : pixData ? (
                <div className="space-y-4 animate-in fade-in">
                  {/* Timer de expiração */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Pague em até:
                    </span>
                    <span className="font-mono text-sm text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {formatTimer(pixTimer)}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-sm flex flex-col items-center justify-center gap-2">
                    {pixData.qrCodeBase64 ? (
                      <img
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="p-3 bg-white rounded-xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={pixData.qrCode} size={200} />
                      </div>
                    )}
                    <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Escaneie com o app de qualquer banco
                    </span>
                  </div>

                  {/* Copia e Cola */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Código Pix Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.qrCode}
                        className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-600 select-all truncate"
                      />
                      <button
                        onClick={handleCopyPix}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                          pixCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        }`}
                      >
                        {pixCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indicador de Polling */}
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-center gap-2 text-xs text-blue-800 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Aguardando confirmação do seu pagamento em tempo real...</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================= */}
          {/* SEÇÃO DO CARTÃO DE CRÉDITO TRANSPARENTE                   */}
          {/* ========================================================= */}
          {isCard && (
            <form onSubmit={handlePayWithCard} className="space-y-3.5">
              {/* Número do Cartão */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Número do Cartão</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    name="cc-number"
                    autoComplete="cc-number"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono tracking-wider"
                  />
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {detectedBrand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase rounded border border-indigo-200">
                      {detectedBrand}
                    </span>
                  )}
                </div>
              </div>

              {/* Nome do Titular */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Impresso no Cartão</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    name="cc-name"
                    autoComplete="cc-name"
                    placeholder="NOME COMO NO CARTÃO"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm uppercase"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Validade e CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Validade</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      name="cc-exp"
                      autoComplete="cc-exp"
                      inputMode="numeric"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                    />
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CVV / Segurança</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      name="cc-csc"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* CPF do Titular */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">CPF do Titular do Cartão</label>
                <input
                  type="text"
                  required
                  name="cpf"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cardCpf}
                  onChange={handleCardCpfChange}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                />
              </div>

              {/* Parcelamento */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Opções de Parcelamento</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white font-medium"
                >
                  {installmentOptions.map(opt => (
                    <option key={opt.count} value={opt.count}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erro do Cartão */}
              {(cardError || externalErrorMessage) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Não foi possível aprovar o pagamento</p>
                    <p className="mt-0.5 text-red-600">{cardError || externalErrorMessage}</p>
                  </div>
                </div>
              )}

              {/* Botão de Pagamento com Cartão */}
              <button
                type="submit"
                disabled={cardLoading || externalLoading}
                className="w-full py-3.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {cardLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando seu pagamento com segurança...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pagar {formatPrice(totalPrice)}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* SEÇÃO DE BOLETO BANCÁRIO                                  */}
          {/* ========================================================= */}
          {isBoleto && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
                <p className="font-bold text-sm">Boleto Bancário</p>
                <p>O boleto será gerado no Mercado Pago com prazo de até 3 dias úteis para compensação.</p>
              </div>
              <button
                type="button"
                onClick={onConfirmCheckout}
                disabled={externalLoading}
                className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {externalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando Boleto...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Gerar Boleto de {formatPrice(totalPrice)}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Link Alternativo / Fallback */}
          {checkoutUrl && (
            <div className="text-center pt-1 border-t border-gray-100">
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                <span>Prefere abrir a tela externa do Mercado Pago?</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Selos de Segurança PCI / SSL */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ambiente 100% Criptografado • Certificado SSL PCI-DSS</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={cardLoading || pixLoading || externalLoading}
            className="px-4 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <span className="text-[11px] text-gray-400 font-medium">Better Now Pagamentos</span>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
