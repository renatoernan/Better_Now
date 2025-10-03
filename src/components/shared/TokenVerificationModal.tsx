import React, { useState, useRef, useEffect } from 'react';
import { X, Shield } from 'lucide-react';

interface TokenVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: string) => void;
  onResend: () => void;
  phone: string;
  loading?: boolean;
  error?: string;
  timeRemaining: number;
  tokenTimestamp: number;
}

const TokenVerificationModal: React.FC<TokenVerificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onResend,
  phone,
  loading = false,
  error = '',
  timeRemaining: initialTimeRemaining,
  tokenTimestamp
}) => {
  const TOKEN_EXPIRATION_TIME = 59; // Tempo de expiração do token em segundos
  const [token, setToken] = useState(['', '', '', '', '', '']);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (isOpen && tokenTimestamp > 0) {
      // Calcular o tempo restante inicial baseado no timestamp
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - tokenTimestamp) / 1000);
      const initialRemaining = Math.max(0, TOKEN_EXPIRATION_TIME - elapsed);
      setTimeRemaining(initialRemaining);
      
      // Só criar o interval se ainda há tempo restante
      if (initialRemaining > 0) {
        intervalRef.current = setInterval(() => {
          const now = Date.now();
          const elapsedTime = Math.floor((now - tokenTimestamp) / 1000);
          const remaining = Math.max(0, TOKEN_EXPIRATION_TIME - elapsedTime);
          setTimeRemaining(remaining);
          
          if (remaining === 0) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
          }
        }, 1000);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, tokenTimestamp]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    // Auto-focus próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newToken = [...token];
    
    for (let i = 0; i < 6; i++) {
      newToken[i] = pastedData[i] || '';
    }
    
    setToken(newToken);
    
    // Focus no último input preenchido ou no próximo vazio
    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullToken = token.join('');
    
    if (fullToken.length !== 6) {
      return;
    }
    
    onSubmit(fullToken);
  };

  const handleClose = () => {
    setToken(['', '', '', '', '', '']);
    onClose();
  };

  const handleResend = () => {
    // Limpar o campo de token quando reenviar
    setToken(['', '', '', '', '', '']);
    // Limpar o timer atual
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onResend();
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const isTokenComplete = token.every(digit => digit !== '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Verificação de Token</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-gray-600">
            Enviamos um código de 6 dígitos para o número{' '}
            <span className="font-semibold">{formatPhone(phone)}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Digite o código recebido abaixo:
          </p>
          
          <div className="mt-2">
            {timeRemaining > 0 && (
              <p className="text-sm text-green-600 font-medium">
                Token expira em: {timeRemaining}s
              </p>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-4">
            {token.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            ))}
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
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
              disabled={loading || !isTokenComplete}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || timeRemaining > 0}
            className={`text-sm font-medium transition-colors ${
              loading || timeRemaining > 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {timeRemaining > 0 ? `Reenviar Código em ${timeRemaining}s` : 'Reenviar Código'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenVerificationModal;