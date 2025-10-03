import React, { useState, useEffect, forwardRef } from 'react';
import { cn } from '../../shared/utils/utils/cn';
import { ChevronDown } from 'lucide-react';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
  mask?: string;
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  name?: string;
}

const countryCodes: CountryCode[] = [
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+1', name: 'EUA/Canadá', flag: '🇺🇸' },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '+49', name: 'Alemanha', flag: '🇩🇪' },
  { code: '+33', name: 'França', flag: '🇫🇷' },
  { code: '+39', name: 'Itália', flag: '🇮🇹' },
  { code: '+34', name: 'Espanha', flag: '🇪🇸' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
];

const formatBrazilianPhone = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica máscara baseada no tamanho
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
};

const formatInternationalPhone = (value: string): string => {
  // Para outros países, apenas números
  return value.replace(/\D/g, '');
};

const parsePhoneValue = (fullValue: string): { countryCode: string; phoneNumber: string } => {
  if (!fullValue) return { countryCode: '+55', phoneNumber: '' };
  
  // Encontra o código do país no valor
  const foundCountry = countryCodes.find(country => fullValue.startsWith(country.code));
  
  if (foundCountry) {
    return {
      countryCode: foundCountry.code,
      phoneNumber: fullValue.slice(foundCountry.code.length)
    };
  }
  
  // Se não encontrou, assume +55
  return { countryCode: '+55', phoneNumber: fullValue };
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, onBlur, placeholder, className, error, disabled, name }, ref) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('+55');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Inicializa os valores baseado no value prop
    useEffect(() => {
      const parsed = parsePhoneValue(value);
      setSelectedCountry(parsed.countryCode);
      setPhoneNumber(parsed.phoneNumber);
    }, [value]);

    const handleCountryChange = (countryCode: string) => {
      setSelectedCountry(countryCode);
      setIsDropdownOpen(false);
      
      // Reformata o número para o novo país
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const formattedNumber = countryCode === '+55' 
        ? formatBrazilianPhone(cleanNumber)
        : formatInternationalPhone(cleanNumber);
      
      setPhoneNumber(formattedNumber);
      onChange?.(countryCode + formattedNumber);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      let formattedValue: string;
      if (selectedCountry === '+55') {
        formattedValue = formatBrazilianPhone(inputValue);
      } else {
        formattedValue = formatInternationalPhone(inputValue);
      }
      
      setPhoneNumber(formattedValue);
      onChange?.(selectedCountry + formattedValue);
    };

    const selectedCountryData = countryCodes.find(c => c.code === selectedCountry);

    return (
      <div className={cn('relative flex', className)}>
        {/* Dropdown do código do país */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-2 border border-r-0 rounded-l-md bg-background text-sm',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-red-500' : 'border-input'
            )}
          >
            <span className="text-base">{selectedCountryData?.flag}</span>
            <span className="font-mono text-sm">{selectedCountry}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {countryCodes.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country.code)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <span className="text-base">{country.flag}</span>
                  <span className="font-mono">{country.code}</span>
                  <span className="text-gray-600">{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input do número */}
        <input
          ref={ref}
          type="tel"
          name={name}
          value={phoneNumber}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          placeholder={placeholder || (selectedCountry === '+55' ? '(11) 99999-9999' : 'Número do telefone')}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-r-md border border-l-0 bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'
          )}
        />

        {/* Overlay para fechar dropdown */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';