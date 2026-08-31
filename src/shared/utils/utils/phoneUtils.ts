/**
 * Utilitários para formatação e padronização de números de telefone e WhatsApp
 */

/**
 * Formata um número de telefone no padrão brasileiro:
 * - Celular (11 dígitos): (11) 97336-0373
 * - Telefone fixo (10 dígitos): (11) 3336-0373
 * - Com DDI 55 (12 ou 13 dígitos): (11) 97336-0373
 * - Número incompleto / internacional: formatação adaptativa
 */
export const formatPhone = (phone?: string | null): string => {
  if (!phone) return '-';
  const trimmed = String(phone).trim();
  if (!trimmed || trimmed === '-') return '-';

  // Se for ID de grupo do WhatsApp, retorna como está
  if (trimmed.endsWith('@g.us') || trimmed.endsWith('@c.us')) {
    return trimmed;
  }

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  // Se vier com o DDI do Brasil (55) e tiver 12 ou 13 dígitos no total, remove o 55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Celular com DDD (11 dígitos): (XX) XXXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  // Telefone fixo com DDD (10 dígitos): (XX) XXXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // Celular sem DDD (9 dígitos): 9XXXX-XXXX
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  // Fixo sem DDD (8 dígitos): XXXX-XXXX
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // Se tiver mais de 11 dígitos e não começou com 55 (internacional)
  if (digits.length > 11) {
    return `+${digits}`;
  }

  return trimmed;
};

/**
 * Alias compatível para formatBrazilianPhone
 */
export const formatBrazilianPhone = formatPhone;
