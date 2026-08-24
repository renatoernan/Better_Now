import { PriceBatch } from '../../types/types/core';

/**
 * Formatar uma data para o padrão brasileiro (DD/MM/YYYY) respeitando o fuso BRT (America/Sao_Paulo)
 */
export const formatBrazilDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // Se for string no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm...
    const datePart = dateInput.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

/**
 * Formatar data considerando BRT (Brasil UTC-3)
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  const datePart = dateString.split('T')[0].split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Formatar horário de uma data
 */
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Formatar horário de string (HH:MM:SS para HH:MM)
 */
export const formatTimeFromString = (timeString: string): string => {
  if (!timeString) return '';
  return timeString.substring(0, 5);
};

/**
 * Formatar preço em Real brasileiro
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

/**
 * Verificar se uma data expirou
 */
export const isExpired = (deadline: string): boolean => {
  if (!deadline) return false;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return now > deadlineDate;
};

/**
 * Verificar se o lote está esgotado por quantidade de ingressos definida
 */
export const isBatchSoldOut = (batch: PriceBatch): boolean => {
  if (!batch || !batch.quantity || batch.quantity <= 0) return false;
  const sold = Number(batch.sold_quantity) || 0;
  return sold >= batch.quantity;
};

/**
 * Retorna a quantidade de ingressos restantes no lote (ou null se for ilimitado)
 */
export const getBatchRemainingTickets = (batch: PriceBatch): number | null => {
  if (!batch || !batch.quantity || batch.quantity <= 0) return null;
  const sold = Number(batch.sold_quantity) || 0;
  return Math.max(0, batch.quantity - sold);
};

/**
 * Verificar o status do lote baseado em esgotamento de quantidade e datas (UTC-3 BRT)
 */
export const getBatchStatus = (batch: PriceBatch): 'active' | 'expired' | 'upcoming' => {
  if (!batch) return 'active';

  // 1. Bloquear se a quantidade limite foi atingida (Lote Esgotado)
  if (isBatchSoldOut(batch)) {
    return 'expired';
  }

  const now = new Date();

  // 2. Bloquear se a data de término expirou
  if (batch.end_date) {
    let endDate: Date;
    if (typeof batch.end_date === 'string' && batch.end_date.includes('T')) {
      endDate = new Date(batch.end_date);
    } else if (typeof batch.end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(batch.end_date)) {
      endDate = new Date(`${batch.end_date}T23:59:59-03:00`);
    } else {
      endDate = new Date(batch.end_date);
    }

    if (!isNaN(endDate.getTime()) && now > endDate) {
      return 'expired';
    }
  }

  // 3. Bloquear se a data de início ainda não chegou
  if (batch.start_date) {
    let startDate: Date;
    if (typeof batch.start_date === 'string' && batch.start_date.includes('T')) {
      startDate = new Date(batch.start_date);
    } else if (typeof batch.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(batch.start_date)) {
      startDate = new Date(`${batch.start_date}T00:00:00-03:00`);
    } else {
      startDate = new Date(batch.start_date);
    }

    if (!isNaN(startDate.getTime()) && now < startDate) {
      return 'upcoming';
    }
  }

  return 'active';
};

/**
 * Formatar período de validade do lote considerando BRT (UTC-3)
 */
export const formatBatchPeriod = (batch: PriceBatch): string | null => {
  if (!batch) return null;

  const startDate = batch.start_date;
  const endDate = batch.end_date;
  const status = getBatchStatus(batch);

  const formattedStart = formatBrazilDate(startDate);
  const formattedEnd = formatBrazilDate(endDate);

  // Para lotes ativos, mostrar a data de vencimento correta
  if (status === 'active' && formattedEnd) {
    return `Validade até ${formattedEnd}`;
  }

  // Para lotes não ativos ou períodos completos
  if (formattedStart && formattedEnd) {
    return `Disponível de ${formattedStart} a ${formattedEnd}`;
  } else if (formattedEnd) {
    return `Disponível até ${formattedEnd}`;
  } else if (formattedStart) {
    return `Disponível a partir de ${formattedStart}`;
  }

  return null;
};

/**
 * Processar price_batches que podem vir como string ou array
 */
export const processPriceBatches = (priceBatches: any): PriceBatch[] => {
  try {
    if (!priceBatches) return [];

    if (Array.isArray(priceBatches) || typeof priceBatches === 'object') {
      return Array.isArray(priceBatches) ? priceBatches : [priceBatches];
    } else if (typeof priceBatches === 'string') {
      return JSON.parse(priceBatches);
    }

    return [];
  } catch (error) {
    console.error('❌ Erro ao processar price_batches:', error);
    return [];
  }
};

/**
 * Converte uma data (Date, ISO string ou timestamp) para o formato YYYY-MM-DDTHH:mm
 * exatamente no fuso horário do Brasil (UTC-3 / America/Sao_Paulo) para inputs datetime-local
 */
export const toBrtDateTimeInput = (dateInput?: Date | string | null): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';

  // Obter partes da data formatadas no timezone America/Sao_Paulo (UTC-3)
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');
  let hour = findPart('hour');
  // Ajuste para caso retorne '24'
  if (hour === '24') hour = '00';
  const minute = findPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

/**
 * Converte o valor retornado de um input datetime-local (YYYY-MM-DDTHH:mm)
 * considerando explicitamente o fuso horário BRT (UTC-3) para formato ISO UTC padronizado
 */
export const fromBrtDateTimeInputToIso = (dateTimeLocalStr: string): string => {
  if (!dateTimeLocalStr) return new Date().toISOString();

  // Se já tiver offset ou 'Z', passar direto para Date
  if (dateTimeLocalStr.includes('Z') || dateTimeLocalStr.includes('+') || (dateTimeLocalStr.length > 19 && dateTimeLocalStr.slice(19).includes('-'))) {
    return new Date(dateTimeLocalStr).toISOString();
  }

  // Se for YYYY-MM-DDTHH:mm ou YYYY-MM-DDTHH:mm:ss, fixar offset -03:00
  const normalized = dateTimeLocalStr.length === 16 ? `${dateTimeLocalStr}:00` : dateTimeLocalStr;
  const withBrtOffset = `${normalized}-03:00`;
  const parsed = new Date(withBrtOffset);

  if (isNaN(parsed.getTime())) {
    return new Date(dateTimeLocalStr).toISOString();
  }

  return parsed.toISOString();
};

/**
 * Formata data e hora para exibição amigável considerando o fuso horário BRT (UTC-3)
 */
export const formatBrtDateTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};