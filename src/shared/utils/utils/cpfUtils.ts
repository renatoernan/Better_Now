/**
 * Utilitários para validação e formatação de CPF e CEP
 */

/**
 * Validação algorítmica completa de CPF brasileiro (dígitos verificadores)
 */
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // CPF deve ter 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Bloquear CPFs com todos os dígitos repetidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  let digit1 = rest >= 10 ? 0 : rest;
  if (digit1 !== parseInt(cleanCPF.charAt(9), 10)) return false;
  
  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  let digit2 = rest >= 10 ? 0 : rest;
  if (digit2 !== parseInt(cleanCPF.charAt(10), 10)) return false;
  
  return true;
};

/**
 * Formata um CPF no padrão 000.000.000-00
 */
export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Formata um CEP no padrão 00000-000
 */
export const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Busca endereço na API ViaCEP pelo CEP digitado
 */
export const fetchAddressByCEP = async (cep: string): Promise<ViaCepResponse | null> => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!response.ok) return null;
    const data: ViaCepResponse = await response.json();
    if (data.erro) return null;
    return data;
  } catch (error) {
    console.error('Erro ao consultar ViaCEP:', error);
    return null;
  }
};
