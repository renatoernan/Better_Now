import React from 'react';
import { DollarSign, ShoppingCart, Minus, Plus, CreditCard, FileText, QrCode, ShieldCheck, ChevronDown } from 'lucide-react';
import { TicketCardProps, PaymentMethodFee } from '../../shared/types';
import { formatPrice, getBatchStatus, formatBatchPeriod } from '../../shared/utils/utils/eventUtils';

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
  registrationDeadline
}) => {
  if (priceBatches.length === 0) {
    return null;
  }

  const selectedBatchData = priceBatches[selectedBatch];
  const selectedBatchStatus = getBatchStatus(selectedBatchData);

  // Filtrar e normalizar métodos de pagamento habilitados para exibição pública
  const activeMethods: { id: string; methodKey: 'boleto' | 'credit_card' | 'pix_stripe' | 'pix_chave'; label: string; icon: React.ReactNode; feePercentage: number }[] = [];

  const boleto = paymentMethods.find(pm => pm.method === 'boleto' && pm.enabled);
  if (boleto) {
    activeMethods.push({
      id: 'boleto',
      methodKey: 'boleto',
      label: 'Boleto',
      icon: <FileText className="w-4 h-4" />,
      feePercentage: boleto.fee_percentage || 0
    });
  }

  const card = paymentMethods.find(pm => pm.method === 'credit_card' && pm.enabled);
  if (card) {
    activeMethods.push({
      id: 'credit_card',
      methodKey: 'credit_card',
      label: 'Cartão',
      icon: <CreditCard className="w-4 h-4" />,
      feePercentage: card.fee_percentage || 0
    });
  }

  const pixStripe = paymentMethods.find(pm => pm.method === 'pix_stripe' && pm.enabled);
  const pixChave = paymentMethods.find(pm => pm.method === 'pix_chave' && pm.enabled);

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

  // Identificar método selecionado ativo apenas entre os métodos habilitados no evento
  const hasPaymentMethodsConfigured = activeMethods.length > 0;
  const isMethodSelected = !hasPaymentMethodsConfigured || Boolean(selectedPaymentMethod);
  const currentActiveMethod = activeMethods.find(m => m.methodKey === selectedPaymentMethod || m.id === selectedPaymentMethod);
  const feePercentage = (hasPaymentMethodsConfigured && selectedPaymentMethod && currentActiveMethod) 
    ? currentActiveMethod.feePercentage 
    : 0;

  const subtotal = (selectedBatchData?.price || 0) * quantity;
  const feeAmount = subtotal * (feePercentage / 100);
  const totalWithFee = subtotal + feeAmount;

  // Lógica de parcelamento para cartão de crédito
  const isCard = selectedPaymentMethod === 'credit_card';
  const cardConfig = paymentMethods.find(pm => pm.method === 'credit_card');
  const configuredMaxInstallments = cardConfig?.max_installments || 12;
  const maxInstallments = Math.min(configuredMaxInstallments, Math.max(1, Math.floor(totalWithFee / 5)));

  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => {
    const count = i + 1;
    const installmentValue = totalWithFee / count;
    return {
      count,
      value: installmentValue,
      label: `${count}x de ${formatPrice(installmentValue)}${count === 1 ? ' (à vista)' : ''}`
    };
  });

  const isReadyToPurchase = isMethodSelected && (!isCard || Boolean(selectedInstallments));

  const getButtonText = () => {
    if (!isMethodSelected) return 'Selecione a forma de pagamento';
    if (isCard && !selectedInstallments) return 'Selecione o número de parcelas';
    if (isCard && selectedInstallments) {
      const instValue = totalWithFee / selectedInstallments;
      return `Comprar Ingresso • ${selectedInstallments}x de ${formatPrice(instValue)}`;
    }
    return `Comprar Ingresso • ${formatPrice(totalWithFee)}`;
  };

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
      <div className="space-y-3">
        {priceBatches.map((batch, index) => {
          const status = getBatchStatus(batch);
          const period = formatBatchPeriod(batch);
          const isActive = status === 'active';
          const isExpired = status === 'expired';
          const isUpcoming = status === 'upcoming';
          const isSelected = selectedBatch === index;
          
          return (
            <div 
              key={index}
              className={`border-2 rounded-xl p-4 transition-all relative overflow-hidden ${
                isExpired 
                  ? 'border-red-200 bg-red-50/60 opacity-50 cursor-not-allowed'
                  : isUpcoming
                    ? 'border-amber-200 bg-amber-50/60 opacity-75 cursor-not-allowed'
                    : isSelected 
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm cursor-pointer' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer'
              }`}
              onClick={() => isActive && onBatchSelect(index)}
            >
              {/* Marca d'água "Esgotado" */}
              {isExpired && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="transform rotate-[-15deg] bg-red-600/90 text-white font-bold text-sm px-6 py-1.5 rounded-md shadow-md">
                    ESGOTADO
                  </div>
                </div>
              )}
              
              {/* Marca d'água "Em Breve" */}
              {isUpcoming && (
                <div className="absolute top-2 right-2 pointer-events-none">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    Em Breve
                  </span>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-bold text-sm ${
                    isExpired ? 'text-red-700' : isUpcoming ? 'text-amber-700' : isSelected ? 'text-indigo-900' : 'text-gray-800'
                  }`}>
                    {batch.name}
                  </h3>
                  {isSelected && isActive && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                  )}
                </div>
                
                {/* Preço */}
                <div className="my-1">
                  <span className={`text-2xl font-extrabold ${
                    isExpired ? 'text-red-600' : isUpcoming ? 'text-amber-600' : isSelected ? 'text-indigo-600' : 'text-gray-900'
                  }`}>
                    {formatPrice(batch.price)}
                  </span>
                  <span className="text-xs text-gray-500 font-normal ml-1">/ ingresso</span>
                </div>
                
                {/* Período de validade */}
                {period && (
                  <p className={`text-xs ${
                    isExpired ? 'text-red-500' : isUpcoming ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {period}
                  </p>
                )}
                
                {/* Descrição do lote */}
                {batch.description && (
                  <p className="text-xs text-gray-600 mt-2 bg-white/70 p-1.5 rounded border border-gray-100">
                    {batch.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controles de quantidade e seleção de pagamento */}
      {selectedBatchStatus === 'active' && (
        <div className="space-y-5 pt-4 border-t border-gray-100">
          {/* Seletor de Quantidade */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Quantidade:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onQuantityChange(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(true)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Seleção de Formas de Pagamento (somente as cadastradas no evento) */}
          {hasPaymentMethodsConfigured && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span>Forma de Pagamento</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                {!isMethodSelected && (
                  <span className="text-[11px] text-indigo-600 font-medium animate-pulse">
                    Selecione para prosseguir
                  </span>
                )}
              </div>

              <div className={`grid gap-2 ${activeMethods.length === 3 ? 'grid-cols-3' : activeMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {activeMethods.map((method) => {
                  const isSelected = selectedPaymentMethod === method.methodKey || selectedPaymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onPaymentMethodSelect && onPaymentMethodSelect(method.methodKey)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-md ring-2 ring-indigo-500'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/70 text-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={isSelected ? 'text-indigo-600' : 'text-gray-500'}>
                            {method.icon}
                          </span>
                          <span className="text-xs font-bold">{method.label}</span>
                        </div>
                      </div>
                      <div className="text-[11px]">
                        {method.feePercentage > 0 ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            +{method.feePercentage}% taxa
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-medium">
                            Sem taxa
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Seletor de Parcelamento (Exibido quando Cartão for selecionado) */}
              {isCard && (
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Parcelas no Cartão:</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    {!selectedInstallments && (
                      <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">
                        Escolha uma opção
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={selectedInstallments || ''}
                      onChange={(e) => onInstallmentsSelect && onInstallmentsSelect(Number(e.target.value))}
                      className={`w-full pl-3 pr-8 py-2.5 text-xs font-semibold rounded-lg border appearance-none transition-all cursor-pointer bg-white shadow-sm ${
                        selectedInstallments
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                          : 'border-gray-300 text-gray-700 hover:border-indigo-400'
                      }`}
                    >
                      <option value="" disabled>
                        Selecione em quantas vezes quer pagar...
                      </option>
                      {installmentOptions.map(opt => (
                        <option key={opt.count} value={opt.count}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-indigo-700">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Discriminação do Resumo Financeiro */}
          <div className="bg-gray-50/90 rounded-xl p-4 border border-gray-200/70 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Subtotal ({quantity}x {formatPrice(selectedBatchData.price)})</span>
              <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
            </div>

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

            {isCard && selectedInstallments && selectedInstallments > 1 && (
              <div className="text-[11px] text-indigo-800 font-semibold bg-indigo-50 p-1.5 rounded text-center border border-indigo-100">
                {selectedInstallments}x de {formatPrice(totalWithFee / selectedInstallments)} no cartão
              </div>
            )}
          </div>
          
          {/* Botão de Compra - Habilitado somente quando tudo estiver selecionado */}
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
            <strong>Prazo limite:</strong> {new Date(registrationDeadline).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketCard;