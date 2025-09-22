import React, { useEffect, useRef } from 'react';
import { AlertTriangle, RotateCcw, Trash, Trash2, X } from 'lucide-react';

type ConfirmationType = 'soft_delete' | 'restore' | 'hard_delete';

interface TestimonialConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: ConfirmationType;
  testimonialName?: string;
}

const TestimonialConfirmModal: React.FC<TestimonialConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  testimonialName = 'este depoimento'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Configurações para cada tipo de confirmação
  const getConfirmationConfig = () => {
    switch (type) {
      case 'soft_delete':
        return {
          title: 'Mover para Lixeira',
          message: `Tem certeza que deseja mover ${testimonialName} para a lixeira?`,
          description: 'O depoimento será movido para a lixeira e poderá ser restaurado posteriormente.',
          icon: Trash2,
          iconColor: 'text-orange-600',
          iconBg: 'bg-orange-100',
          confirmText: 'Mover para Lixeira',
          confirmColor: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
          cancelColor: 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
        };
      case 'restore':
        return {
          title: 'Restaurar Depoimento',
          message: `Tem certeza que deseja restaurar ${testimonialName}?`,
          description: 'O depoimento será restaurado e voltará a ficar visível na lista principal.',
          icon: RotateCcw,
          iconColor: 'text-green-600',
          iconBg: 'bg-green-100',
          confirmText: 'Restaurar',
          confirmColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          cancelColor: 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
        };
      case 'hard_delete':
        return {
          title: 'Excluir Permanentemente',
          message: `Tem certeza que deseja excluir ${testimonialName} permanentemente?`,
          description: 'Esta ação não pode ser desfeita. O depoimento será removido definitivamente do sistema.',
          icon: Trash,
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmText: 'Excluir Permanentemente',
          confirmColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          cancelColor: 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
        };
      default:
        return {
          title: 'Confirmar Ação',
          message: 'Tem certeza que deseja continuar?',
          description: '',
          icon: AlertTriangle,
          iconColor: 'text-gray-600',
          iconBg: 'bg-gray-100',
          confirmText: 'Confirmar',
          confirmColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          cancelColor: 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
        };
    }
  };

  const config = getConfirmationConfig();
  const Icon = config.icon;

  // Gerenciar foco e acessibilidade
  useEffect(() => {
    if (isOpen) {
      // Focar no botão de confirmação quando o modal abrir
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);

      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
      
      // Gerenciar teclas
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Fechar ao clicar fora do modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.iconBg}`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {config.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p id="modal-description" className="text-gray-900 font-medium mb-2">
            {config.message}
          </p>
          {config.description && (
            <p className="text-gray-600 text-sm">
              {config.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.cancelColor}`}
          >
            Cancelar
          </button>
          <button
            ref={confirmButtonRef}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.confirmColor}`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonialConfirmModal;