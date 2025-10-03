import React from 'react';
import { DollarSign, ShoppingCart, Minus, Plus } from 'lucide-react';
import { TicketCardProps } from '../../shared/types';
import { formatPrice, getBatchStatus, formatBatchPeriod } from '../../shared/utils/utils/eventUtils';

const TicketCard: React.FC<TicketCardProps> = ({
  priceBatches,
  selectedBatch,
  quantity,
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <DollarSign className="w-5 h-5 mr-2" />
        Ingressos
      </h2>
    
      <div className="space-y-4">
        {priceBatches.map((batch, index) => {
          const status = getBatchStatus(batch);
          const period = formatBatchPeriod(batch);
          const isActive = status === 'active';
          const isExpired = status === 'expired';
          const isUpcoming = status === 'upcoming';
          
          return (
            <div 
              key={index}
              className={`border-2 rounded-lg p-4 transition-all relative overflow-hidden ${
                isExpired 
                  ? 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
                  : isUpcoming
                    ? 'border-yellow-200 bg-yellow-50 opacity-70 cursor-not-allowed'
                    : selectedBatch === index 
                      ? 'border-blue-600 bg-blue-50 cursor-pointer' 
                      : 'border-gray-200 hover:border-gray-300 cursor-pointer'
              }`}
              onClick={() => isActive && onBatchSelect(index)}
            >
              {/* Marca d'água "Esgotado" */}
              {isExpired && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="transform rotate-[-25deg] bg-red-600 bg-opacity-90 text-white font-bold text-lg px-8 py-2 rounded-lg shadow-lg">
                    ESGOTADO
                  </div>
                </div>
              )}
              
              {/* Marca d'água "Em Breve" */}
              {isUpcoming && (
                <div className="absolute top-2 right-2 pointer-events-none">
                  <span className="text-xs font-medium px-2 py-1 rounded opacity-60 bg-yellow-100 text-yellow-600">
                    Em Breve
                  </span>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-semibold ${
                    isExpired ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : 'text-gray-800'
                  }`}>
                    {batch.name}
                  </h3>
                </div>
                
                {/* Preço */}
                <div className="mb-2">
                  <span className={`text-2xl font-bold ${
                    isExpired ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : 'text-blue-600'
                  }`}>
                    {formatPrice(batch.price)}
                  </span>
                </div>
                
                {/* Período de validade */}
                {period && (
                  <p className={`text-xs ${
                    isExpired ? 'text-red-500' : isUpcoming ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {period}
                  </p>
                )}
                
                {/* Descrição do lote */}
                {batch.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {batch.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controles de quantidade e compra */}
      {selectedBatchStatus === 'active' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Quantidade:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onQuantityChange(false)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => onQuantityChange(true)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-blue-600">
                {formatPrice(selectedBatchData.price * quantity)}
              </span>
            </div>
          </div>
          
          <button
            onClick={onPurchase}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Comprar Ingresso
          </button>
        </div>
      )}
      
      {/* Prazo de inscrição */}
      {registrationDeadline && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Prazo de inscrição:</strong> {new Date(registrationDeadline).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketCard;