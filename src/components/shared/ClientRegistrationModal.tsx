import React, { useState, useEffect } from 'react';
import { X, User, Phone, MessageSquare } from 'lucide-react';

interface ClientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { nome: string; telefone: string; comoSoube: string }) => void;
  loading?: boolean;
  prefilledPhone?: string;
}

const ClientRegistrationModal: React.FC<ClientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  prefilledPhone = ''
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    comoSoube: ''
  });

  // Pré-preencher telefone quando modal abrir
  useEffect(() => {
    if (isOpen && prefilledPhone) {
      const formattedPhone = formatPhone(prefilledPhone);
      setFormData(prev => ({ ...prev, telefone: formattedPhone }));
    }
  }, [isOpen, prefilledPhone]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatPhone = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'telefone') {
      value = formatPhone(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Remove erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    const cleanPhone = formData.telefone.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (cleanPhone.length !== 11) {
      newErrors.telefone = 'Telefone deve ter 11 dígitos';
    }
    
    if (!formData.comoSoube.trim()) {
      newErrors.comoSoube = 'Este campo é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Remove formatação do telefone antes de enviar
    const cleanPhone = formData.telefone.replace(/\D/g, '');
    
    onSubmit({
      nome: formData.nome.trim(),
      telefone: cleanPhone,
      comoSoube: formData.comoSoube.trim()
    });
  };

  const handleClose = () => {
    setFormData({ nome: '', telefone: '', comoSoube: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Cadastro Necessário</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Para acessar este evento privado, precisamos de algumas informações:
        </p>
        
        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="mb-4">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              />
            </div>
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="mb-4">
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Telefone *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.telefone ? 'border-red-300' : 'border-gray-300'
                } ${prefilledPhone ? 'bg-gray-100' : ''}`}
                disabled={loading || !!prefilledPhone}
                readOnly={!!prefilledPhone}
                required
              />
            </div>
            {errors.telefone && (
              <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
            )}
          </div>

          {/* Como soube do evento */}
          <div className="mb-6">
            <label htmlFor="comoSoube" className="block text-sm font-medium text-gray-700 mb-2">
              Nos conte como soube do evento *
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="comoSoube"
                value={formData.comoSoube}
                onChange={(e) => handleInputChange('comoSoube', e.target.value)}
                placeholder="Ex: Redes sociais, indicação de amigo, site, etc."
                rows={3}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.comoSoube ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              />
            </div>
            {errors.comoSoube && (
              <p className="mt-1 text-sm text-red-600">{errors.comoSoube}</p>
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
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRegistrationModal;