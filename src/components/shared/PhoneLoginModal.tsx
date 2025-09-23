import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';

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

  const formatPhone = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove formatação para validação
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 11) {
      setError('Por favor, insira um número de telefone válido');
      return;
    }
    
    onSubmit(cleanPhone);
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
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
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