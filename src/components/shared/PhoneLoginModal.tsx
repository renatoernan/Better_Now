import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';
import { PhoneInput } from '../ui/PhoneInput';

interface PhoneLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phone: string) => void;
  loading?: boolean;
}

const PhoneLoginModal: React.FC<PhoneLoginModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove formatação para validação - agora suporta formato internacional
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validação para formato internacional (mínimo 10 dígitos, máximo 15)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setError('Por favor, insira um número de telefone válido');
      return;
    }
    
    // Se for brasileiro (+55), deve ter 13 dígitos no total (55 + 11 dígitos)
    if (phone.startsWith('+55') && cleanPhone.length !== 13) {
      setError('Para números brasileiros, insira o DDD e o número completo');
      return;
    }
    
    onSubmit(phone); // Envia o número no formato internacional
  };

  const handleClose = () => {
    setPhone('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Login Necessário</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Este é um evento privado. Por favor, informe seu número de telefone para continuar.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Telefone
            </label>
            <PhoneInput
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Ex: (11) 99999-9999"
              defaultCountry="+55"
              disabled={loading}
              className="w-full"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PhoneLoginModal;