import { PriceBatch } from '../../types/types/core';

/**
 * Formatar data considerando UTC-3 (Brasil)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Ajustar para UTC-3 (Brasil) - adicionar 3 horas para compensar o fuso
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  const brazilDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
  
  return brazilDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatar horário de uma data
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatar horário de string (HH:MM:SS para HH:MM)
 */
export const formatTimeFromString = (timeString: string): string => {
  if (!timeString) return '';
  // Extrair HH:MM do formato HH:MM:SS
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
 * Verificar o status do lote baseado nas datas de início e fim considerando UTC-3
 */
export const getBatchStatus = (batch: PriceBatch): 'active' | 'expired' | 'upcoming' => {
  const now = new Date();
  const startDate = batch.start_date ? new Date(batch.start_date) : null;
  // Verificar apenas 'end_date'
  const endDate = batch.end_date ? new Date(batch.end_date) : null;

  if (endDate) {
    // Ajustar para UTC-3 (horário do Brasil)
    const utcEnd = new Date(endDate.getTime());
    const brazilEnd = new Date(utcEnd.getTime() - (3 * 60 * 60 * 1000));
    
    if (now > brazilEnd) {
      return 'expired';
    }
  }

  if (startDate) {
    const utcStart = new Date(startDate.getTime());
    const brazilStart = new Date(utcStart.getTime() - (3 * 60 * 60 * 1000));
    
    if (now < brazilStart) {
      return 'upcoming';
    }
  }

  return 'active';
};

/**
 * Formatar período de validade do lote considerando UTC-3
 */
export const formatBatchPeriod = (batch: PriceBatch): string | null => {
  const startDate = batch.start_date ? new Date(batch.start_date) : null;
  const endDate = batch.end_date ? new Date(batch.end_date) : null;
  const status = getBatchStatus(batch);
  
  // Para lotes ativos, mostrar apenas a data de vencimento
  if (status === 'active' && endDate) {
    const utcEnd = new Date(endDate.getTime() + (endDate.getTimezoneOffset() * 60000));
    const brazilEnd = new Date(utcEnd.getTime() + (3 * 60 * 60 * 1000));
    return `Validade até ${brazilEnd.toLocaleDateString('pt-BR')}`;
  }
  
  // Para lotes não ativos, manter a lógica original
  if (startDate && endDate) {
    // Ajustar para UTC-3 (Brasil) para ambas as datas
    const utcStart = new Date(startDate.getTime() + (startDate.getTimezoneOffset() * 60000));
    const brazilStart = new Date(utcStart.getTime() + (3 * 60 * 60 * 1000));
    
    const utcEnd = new Date(endDate.getTime() + (endDate.getTimezoneOffset() * 60000));
    const brazilEnd = new Date(utcEnd.getTime() + (3 * 60 * 60 * 1000));
    
    return `Disponível de ${brazilStart.toLocaleDateString('pt-BR')} a ${brazilEnd.toLocaleDateString('pt-BR')}`;
  } else if (endDate) {
    const utcEnd = new Date(endDate.getTime() + (endDate.getTimezoneOffset() * 60000));
    const brazilEnd = new Date(utcEnd.getTime() + (3 * 60 * 60 * 1000));
    return `Disponível até ${brazilEnd.toLocaleDateString('pt-BR')}`;
  } else if (startDate) {
    const utcStart = new Date(startDate.getTime() + (startDate.getTimezoneOffset() * 60000));
    const brazilStart = new Date(utcStart.getTime() + (3 * 60 * 60 * 1000));
    return `Disponível a partir de ${brazilStart.toLocaleDateString('pt-BR')}`;
  }
  
  return null;
};

/**
 * Processar price_batches que podem vir como string ou array
 */
export const processPriceBatches = (priceBatches: any): PriceBatch[] => {
  try {
    if (!priceBatches) return [];
    
    // Se já é um array/objeto, usar diretamente
    if (Array.isArray(priceBatches) || typeof priceBatches === 'object') {
      return Array.isArray(priceBatches) ? priceBatches : [priceBatches];
    } 
    // Se é string, tentar fazer parse
    else if (typeof priceBatches === 'string') {
      return JSON.parse(priceBatches);
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erro ao processar price_batches:', error);
    return [];
  }
};