import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ShoppingCart, Minus, Plus, CreditCard, FileText, 
  QrCode, ShieldCheck, ChevronDown, Ticket, Tag, X, Check, Loader2, Gift, Sparkles 
} from 'lucide-react';
import { TicketCardProps, PaymentMethodFee } from '../../shared/types';
import { formatPrice, getBatchStatus, formatBatchPeriod, formatBrazilDate } from '../../shared/utils/utils/eventUtils';
import { validateCouponPreview } from '../../shared/services/couponService';

const TicketCard: React.FC<TicketCardProps> = ({
  priceBatches,
  selectedBatch,
  quantity,
  paymentMethods = [],
  selectedPaymentMethod,
  onPaymentMethodSelect,
  selectedInstallments,
  onInstallmentsSelect,
  onBatchSelect,
  onQuantityChange,
  onPurchase,
  registrationDeadline,
  eventId,
  appliedCoupon = null,
  onCouponApply,
  clientDocument,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (priceBatches.length === 0) {
    return null;
  }

  const selectedBatchData = priceBatches[selectedBatch];
  const selectedBatchStatus = getBatchStatus(selectedBatchData);

  // Formas de pagamento efetivas do lote selecionado (se tiver customizado e ativo, usa o do lote; senão, herda do evento)
  const effectiveBatchPaymentMethods = (selectedBatchData?.use_custom_payment_methods && selectedBatchData?.payment_methods && selectedBatchData.payment_methods.length > 0)
    ? selectedBatchData.payment_methods
    : (paymentMethods || []);

  // Filtrar e normalizar métodos de pagamento habilitados para exibição pública no lote selecionado
  const activeMethods: { id: string; methodKey: 'boleto' | 'credit_card' | 'pix_stripe' | 'pix_chave'; label: string; icon: React.ReactNode; feePercentage: number }[] = [];

  const boleto = effectiveBatchPaymentMethods.find(pm => pm.method === 'boleto' && pm.enabled);
  if (boleto) {
    activeMethods.push({
      id: 'boleto',
      methodKey: 'boleto',
      label: 'Boleto',
      icon: <FileText className="w-4 h-4" />,
      feePercentage: boleto.fee_percentage || 0
    });
  }

  const card = effectiveBatchPaymentMethods.find(pm => pm.method === 'credit_card' && pm.enabled);
  if (card) {
    activeMethods.push({
      id: 'credit_card',
      methodKey: 'credit_card',
      label: 'Cartão',
      icon: <CreditCard className="w-4 h-4" />,
      feePercentage: card.fee_percentage || 0
    });
  }

  const pixStripe = effectiveBatchPaymentMethods.find(pm => pm.method === 'pix_stripe' && pm.enabled);
  const pixChave = effectiveBatchPaymentMethods.find(pm => pm.method === 'pix_chave' && pm.enabled);

  if (pixStripe) {
    activeMethods.push({
      id: 'pix',
      methodKey: 'pix_stripe',
      label: 'Pix',
      icon: <QrCode className="w-4 h-4" />,
      feePercentage: pixStripe.fee_percentage || 0
    });
  } else if (pixChave) {
    activeMethods.push({
      id: 'pix',
      methodKey: 'pix_chave',
      label: 'Pix',
      icon: <QrCode className="w-4 h-4" />,
      feePercentage: pixChave.fee_percentage || 0
    });
  }

  // Auto-ajustar método selecionado se o lote mudar e o método atual não estiver ativo
  useEffect(() => {
    if (activeMethods.length > 0) {
      const isCurrentActive = activeMethods.some(m => m.methodKey === selectedPaymentMethod || m.id === selectedPaymentMethod);
      if (!isCurrentActive && onPaymentMethodSelect) {
        onPaymentMethodSelect(activeMethods[0].methodKey);
      }
    }
  }, [selectedBatch, selectedBatchData]);

  // Identificar método selecionado ativo apenas entre os métodos habilitados no lote
  const hasPaymentMethodsConfigured = activeMethods.length > 0;
  const isMethodSelected = !hasPaymentMethodsConfigured || Boolean(selectedPaymentMethod);
  const currentActiveMethod = activeMethods.find(m => m.methodKey === selectedPaymentMethod || m.id === selectedPaymentMethod);
  const feePercentage = (hasPaymentMethodsConfigured && selectedPaymentMethod && currentActiveMethod) 
    ? currentActiveMethod.feePercentage 
    : 0;

  // Cálculo financeiro com suporte a cupom de desconto
  const rawSubtotal = (selectedBatchData?.price || 0) * quantity;
  
  // Calcular desconto aplicado
  let discountAmount = 0;
  if (appliedCoupon && appliedCoupon.valid) {
    if (appliedCoupon.discount_type === 'percentage') {
      const pct = Math.min(appliedCoupon.discount_value || 0, 100);
      discountAmount = Number(((rawSubtotal * pct) / 100).toFixed(2));
    } else {
      discountAmount = Math.min(Number(appliedCoupon.discount_value || 0), rawSubtotal);
    }
  }

  const subtotalAfterDiscount = Math.max(0, Number((rawSubtotal - discountAmount).toFixed(2)));
  const feeAmount = subtotalAfterDiscount * (feePercentage / 100);
  const totalWithFee = subtotalAfterDiscount + feeAmount;

  const isFreeOrComplimentary = totalWithFee === 0;
  const isReadyToPurchase = isFreeOrComplimentary || isMethodSelected;

  const getButtonText = () => {
    if (isFreeOrComplimentary) return 'Garantir Ingresso Cortesia • Grátis';
    if (!isMethodSelected) return 'Selecione a forma de pagamento';
    return `Comprar Ingresso • ${formatPrice(totalWithFee)}`;
  };

  // Manipulador de aplicação de cupom
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) {
      setCouponError('Digite o código do cupom.');
      return;
    }
    if (!eventId) {
      setCouponError('Evento não identificado.');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const result = await validateCouponPreview({
        eventId,
        code: couponInput.trim(),
        batchIndex: selectedBatch,
        originalAmount: rawSubtotal,
        clientDocument
      });

      if (!result.valid) {
        setCouponError(result.error || 'Cupom inválido.');
        if (onCouponApply) onCouponApply(null);
      } else {
        setCouponError(null);
        if (onCouponApply) onCouponApply(result);
      }
    } catch {
      setCouponError('Erro ao validar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Remover cupom
  const handleRemoveCoupon = () => {
    setCouponInput('');
    setCouponError(null);
    if (onCouponApply) onCouponApply(null);
  };

  // Revalidar cupom se mudar quantidade ou lote
  useEffect(() => {
    if (appliedCoupon && eventId) {
      validateCouponPreview({
        eventId,
        code: appliedCoupon.code || '',
        batchIndex: selectedBatch,
        originalAmount: rawSubtotal,
        clientDocument
      }).then(res => {
        if (!res.valid && onCouponApply) {
          onCouponApply(null);
          setCouponError(res.error || 'Cupom não aplicável a esta alteração.');
        } else if (onCouponApply) {
          onCouponApply(res);
        }
      });
    }
  }, [selectedBatch, quantity, rawSubtotal]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-600" />
          Ingressos
        </h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          {priceBatches.length} {priceBatches.length === 1 ? 'lote' : 'lotes'}
        </span>
      </div>
    
      {/* Lista de Lotes de Preço */}
      <div className="space-y-3.5">
        {priceBatches.map((batch, index) => {
          const status = getBatchStatus(batch);
          const period = formatBatchPeriod(batch);
          const isActive = status === 'active';
          const isExpired = status === 'expired';
          const isUpcoming = status === 'upcoming';
          const isSelected = selectedBatch === index;
          const remainingTickets = batch.quantity && batch.quantity > 0 
            ? Math.max(0, batch.quantity - (batch.sold_quantity || 0)) 
            : null;
          const isSoldOut = remainingTickets === 0 || isExpired;
          const isBatchActive = isActive && !isSoldOut;

          // Verificar se o lote possui apenas 1 forma de pagamento habilitada com taxa 0%
          const batchMethods = (batch.use_custom_payment_methods && batch.payment_methods && batch.payment_methods.length > 0)
            ? batch.payment_methods
            : (paymentMethods || []);
          const activeBatchMethods = batchMethods.filter(m => m.enabled);
          const isSingleMethodZeroFee = activeBatchMethods.length === 1 && (Number(activeBatchMethods[0].fee_percentage) || 0) === 0;

          return (
            <div 
              key={index}
              className={`border-2 rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden select-none ${
                isBatchActive
                  ? isSelected
                    ? 'border-indigo-600 bg-white shadow-xs cursor-pointer'
                    : 'border-indigo-300 bg-white hover:border-indigo-500 cursor-pointer'
                  : isSoldOut
                    ? 'border-red-300 bg-red-50/25 cursor-not-allowed'
                    : 'border-amber-300 bg-amber-50/20 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isBatchActive) {
                  onBatchSelect(index);
                }
              }}
            >
              {/* Faixa Diagonal ESGOTADO ocupando o card com transparência e cantos arredondados */}
              {isSoldOut && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 p-2">
                  <div className="w-[92%] sm:w-[90%] py-1.5 sm:py-2 bg-gradient-to-r from-red-600/70 via-rose-600/70 to-red-600/70 backdrop-blur-xs text-white font-black text-xs sm:text-sm tracking-[0.25em] text-center uppercase shadow-md shadow-red-950/20 -rotate-12 transform rounded-xl border border-white/40 flex items-center justify-center gap-2 select-none">
                    <span className="text-[9px] opacity-80">●</span>
                    <span>ESGOTADO</span>
                    <span className="text-[9px] opacity-80">●</span>
                  </div>
                </div>
              )}

              {isBatchActive ? (
                /* Lote Ativo (Estilo Azul / Índigo) */
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-indigo-950 text-base">{batch.name}</h3>
                    <div className="w-5 h-5 rounded-full bg-indigo-50 border-2 border-indigo-600 flex items-center justify-center shrink-0">
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                    </div>
                  </div>

                  <div className="flex items-baseline mt-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-600">
                      {formatPrice(batch.price)}
                    </span>
                    <span className="text-xs text-gray-500 font-normal ml-1.5">/ ingresso</span>
                  </div>

                  {period && (
                    <p className="text-[11px] text-gray-500 font-normal mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{period}</p>
                  )}

                  {isSingleMethodZeroFee && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Sem taxa de conveniência
                      </span>
                    </div>
                  )}

                  {batch.description && (
                    <p className="text-xs text-gray-500 mt-1">{batch.description}</p>
                  )}

                  {remainingTickets !== null && remainingTickets <= 5 && remainingTickets > 0 && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        Últimos {remainingTickets} ingressos!
                      </span>
                    </div>
                  )}
                </div>
              ) : isSoldOut ? (
                /* Lote Esgotado / Encerrado (Estilo Vermelho / Rose) */
                <div className="opacity-90">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-red-950 text-base">{batch.name}</h3>
                  </div>

                  <div className="flex items-baseline mt-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-red-600">
                      {formatPrice(batch.price)}
                    </span>
                    <span className="text-xs text-red-700/70 font-normal ml-1.5">/ ingresso</span>
                  </div>

                  {period && (
                    <p className="text-[11px] text-red-700/80 font-normal mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{period}</p>
                  )}

                  {isSingleMethodZeroFee && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-100/80 text-red-900 border border-red-200/80">
                        <Sparkles className="w-3 h-3 text-red-600" />
                        Sem taxa de conveniência
                      </span>
                    </div>
                  )}

                  {batch.description && (
                    <p className="text-xs text-red-700/70 mt-1">{batch.description}</p>
                  )}
                </div>
              ) : (
                /* Lote Em Breve (Estilo Amarelo / Âmbar) */
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-amber-800 text-base">{batch.name}</h3>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg shrink-0">
                      Em Breve
                    </span>
                  </div>

                  <div className="flex items-baseline mt-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600">
                      {formatPrice(batch.price)}
                    </span>
                    <span className="text-xs text-gray-500 font-normal ml-1.5">/ ingresso</span>
                  </div>

                  {period && (
                    <p className="text-[11px] text-amber-700 font-normal mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{period}</p>
                  )}

                  {isSingleMethodZeroFee && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300/80">
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        Sem taxa de conveniência
                      </span>
                    </div>
                  )}

                  {batch.description && (
                    <p className="text-xs text-amber-700/80 mt-1">{batch.description}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seção de Compra (Quantidade + Formas de Pagamento + Cupom) */}
      {selectedBatchData && selectedBatchStatus === 'active' && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          {/* Controle de Quantidade */}
          {(() => {
            const batchRemaining = selectedBatchData.quantity && selectedBatchData.quantity > 0 
              ? Math.max(0, selectedBatchData.quantity - (selectedBatchData.sold_quantity || 0)) 
              : null;
            const maxAllowed = batchRemaining !== null ? Math.min(10, batchRemaining) : 10;
            
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-200/60">
                  <div>
                    <span className="text-xs font-bold text-gray-700 block">Quantidade de Ingressos</span>
                    <span className="text-[11px] text-gray-500">
                      {batchRemaining !== null ? `Máximo de ${maxAllowed} neste lote` : 'Limite de compra por pedido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(false)}
                      disabled={quantity <= 1}
                      className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-gray-900 text-base">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(true)}
                      disabled={quantity >= maxAllowed}
                      className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                      title={quantity >= maxAllowed ? 'Limite disponível atingido' : 'Adicionar mais 1'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {batchRemaining !== null && batchRemaining <= 5 && batchRemaining > 0 && (
                  <p className="text-xs text-amber-700 font-medium px-1">
                    ⚠️ Restam apenas {batchRemaining} ingressos para o {selectedBatchData.name}!
                  </p>
                )}
              </div>
            );
          })()}

          {/* Formas de Pagamento ou Indicação de Cortesia */}
          {isFreeOrComplimentary ? (
            <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200/80 flex items-center gap-3 shadow-xs animate-in fade-in">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-950 block">Inscrição Gratuita / Cortesia</span>
                <span className="text-[11px] text-emerald-700 leading-tight block">
                  Total de R$ 0,00. Nenhuma cobrança ou dados bancários serão solicitados.
                </span>
              </div>
            </div>
          ) : (
            hasPaymentMethodsConfigured && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Forma de Pagamento
                  </label>
                  <span className="text-[11px] text-gray-400">Escolha uma opção</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeMethods.map((m) => {
                    const isSelected = selectedPaymentMethod === m.methodKey || selectedPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onPaymentMethodSelect && onPaymentMethodSelect(m.methodKey)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm ring-1 ring-indigo-600'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`mb-1.5 p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {m.icon}
                        </div>
                        <span>{m.label}</span>
                        {m.feePercentage > 0 ? (
                          <span className="text-[10px] text-amber-700 font-normal mt-0.5">
                            +{m.feePercentage}% taxa
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-normal mt-0.5">
                            Sem taxa
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Campo de Cupom de Desconto */}
          <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                <span>Possui Cupom de Desconto?</span>
              </label>
            </div>

            {appliedCoupon && appliedCoupon.valid ? (
              /* Cupom Ativo Aplicado */
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 font-mono tracking-wider">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-[11px] text-emerald-700 block font-medium">
                      {appliedCoupon.discount_type === 'percentage'
                        ? `${appliedCoupon.discount_value}% de desconto aplicado`
                        : `${formatPrice(appliedCoupon.discount_value || 0)} de desconto aplicado`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold p-1 hover:bg-red-50 rounded flex items-center gap-0.5"
                  title="Remover cupom"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              </div>
            ) : (
              /* Formulário de Inserção do Cupom */
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="CÓDIGO DO CUPOM"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                  >
                    {couponLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Aplicar</span>
                    )}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
                )}
              </form>
            )}
          </div>
          
          {/* Discriminação do Resumo Financeiro */}
          <div className="bg-gray-50/90 rounded-xl p-4 border border-gray-200/70 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Subtotal ({quantity}x {formatPrice(selectedBatchData.price)})</span>
              <span className="font-medium text-gray-900">{formatPrice(rawSubtotal)}</span>
            </div>

            {/* Linha de Desconto do Cupom */}
            {appliedCoupon && appliedCoupon.valid && discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 text-xs font-semibold animate-in fade-in duration-200 bg-emerald-50/80 px-2 py-1 rounded">
                <span>Cupom ({appliedCoupon.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}

            {isMethodSelected && feeAmount > 0 && (
              <div className="flex justify-between text-amber-700 text-xs animate-in fade-in duration-200">
                <span>Taxa de conveniência ({feePercentage}%)</span>
                <span className="font-semibold">+{formatPrice(feeAmount)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Total a pagar:</span>
              <span className="text-2xl font-extrabold text-indigo-600">
                {formatPrice(totalWithFee)}
              </span>
            </div>
          </div>
          
          {/* Botão de Compra */}
          <button
            type="button"
            onClick={onPurchase}
            disabled={!isReadyToPurchase}
            className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${
              isReadyToPurchase
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-600/20 active:scale-[0.99] cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70 shadow-none'
            }`}
          >
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>{getButtonText()}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Compra protegida com criptografia ponta a ponta</span>
          </div>
        </div>
      )}
      
      {/* Prazo de inscrição */}
      {registrationDeadline && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl">
          <p className="text-xs text-amber-900">
            <strong>Prazo limite:</strong> {formatBrazilDate(registrationDeadline)}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketCard;