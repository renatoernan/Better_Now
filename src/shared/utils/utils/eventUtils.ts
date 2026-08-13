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
 * Verificar o status do lote baseado nas datas de início e fim considerando BRT (UTC-3)
 */
export const getBatchStatus = (batch: PriceBatch): 'active' | 'expired' | 'upcoming' => {
  if (!batch) return 'active';

  const now = new Date();

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