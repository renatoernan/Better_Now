import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import { cacheSystem } from '../utils/cacheSystem';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
  cacheKey?: string;
  cacheTTL?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  searchQuery?: string;
  searchColumns?: string[];
}

interface PaginationResult<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refresh: () => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Record<string, any>) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (column: string, order: 'asc' | 'desc') => void;
}

interface PaginationCache {
  data: any[];
  totalItems: number;
  timestamp: number;
  filters: Record<string, any>;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function usePagination<T = any>(
  tableName: string,
  options: PaginationOptions = {}
): PaginationResult<T> {
  const {
    pageSize: initialPageSize = 10,
    initialPage = 1,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutos
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
    filters: initialFilters = {},
    searchQuery: initialSearchQuery = '',
    searchColumns = []
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState(initialFilters);
  const [searchQuery, setSearchQueryState] = useState(initialSearchQuery);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  const activityLogger = useMemo(() => new ActivityLogger(), []);

  // Calcular valores derivados
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Gerar chave de cache
  const getCacheKey = useMemo(() => {
    const baseKey = cacheKey || `pagination_${tableName}`;
    const filterKey = JSON.stringify(filters);
    const searchKey = searchQuery;
    const sortKey = `${sortBy}_${sortOrder}`;
    return `${baseKey}_${filterKey}_${searchKey}_${sortKey}`;
  }, [cacheKey, tableName, filters, searchQuery, sortBy, sortOrder]);

  /**
   * Verificar cache
   */
  const checkCache = (page: number): T[] | null => {
    if (!cacheKey) return null;

    const cached = cacheSystem.get<PaginationCache>(getCacheKey);
    if (!cached) return null;

    // Verificar se os filtros/busca/ordenação mudaram
    if (
      JSON.stringify(cached.filters) !== JSON.stringify(filters) ||
      cached.searchQuery !== searchQuery ||
      cached.sortBy !== sortBy ||
      cached.sortOrder !== sortOrder
    ) {
      return null;
    }

    // Calcular índices para a página
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Verificar se temos dados suficientes no cache
    if (cached.data.length >= endIndex || page === totalPages) {
      setTotalItems(cached.totalItems);
      return cached.data.slice(startIndex, endIndex);
    }

    return null;
  };

  /**
   * Salvar no cache
   */
  const saveToCache = (newData: T[], newTotalItems: number) => {
    if (!cacheKey) return;

    const cacheData: PaginationCache = {
      data: newData,
      totalItems: newTotalItems,
      timestamp: Date.now(),
      filters,
      searchQuery,
      sortBy,
      sortOrder
    };

    cacheSystem.set(getCacheKey, cacheData, cacheTTL);
  };

  /**
   * Construir query do Supabase
   */
  const buildQuery = () => {
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.like(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Aplicar busca
    if (searchQuery && searchColumns.length > 0) {
      const searchConditions = searchColumns
        .map(column => `${column}.ilike.%${searchQuery}%`)
        .join(',');
      query = query.or(searchConditions);
    }

    // Aplicar ordenação
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    return query;
  };

  /**
   * Carregar dados
   */
  const loadData = async (page: number, useCache: boolean = true) => {
    // Verificar cache primeiro
    if (useCache) {
      const cachedData = checkCache(page);
      if (cachedData) {
        setData(cachedData);
        setCurrentPage(page);
        setError(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const startIndex = (page - 1) * pageSize;
      
      const query = buildQuery()
        .range(startIndex, startIndex + pageSize - 1);

      const { data: result, count, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      const newData = result || [];
      const newTotalItems = count || 0;

      setData(newData);
      setTotalItems(newTotalItems);
      setCurrentPage(page);

      // Salvar no cache
      saveToCache(newData, newTotalItems);

      ActivityLogger.logSystem(
        'pagination_load_success',
        `Dados carregados: ${tableName} página ${page}`,
        'info',
        {
          tableName,
          page,
          pageSize,
          totalItems: newTotalItems,
          itemsLoaded: newData.length,
          filters,
          searchQuery
        }
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar dados';
      setError(errorMessage);
      
      ActivityLogger.logSystem(
        'pagination_load_error',
        `Erro ao carregar dados: ${tableName}`,
        'error',
        {
          tableName,
          page,
          error: errorMessage,
          filters,
          searchQuery
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ir para página específica
   */
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    loadData(page);
  };

  /**
   * Próxima página
   */
  const nextPage = () => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  };

  /**
   * Página anterior
   */
  const previousPage = () => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  };

  /**
   * Atualizar dados
   */
  const refresh = () => {
    // Limpar cache
    if (cacheKey) {
      cacheSystem.delete(getCacheKey);
    }
    loadData(currentPage, false);
  };

  /**
   * Alterar tamanho da página
   */
  const setPageSize = (newSize: number) => {
    if (newSize === pageSize) return;
    
    setPageSizeState(newSize);
    
    // Calcular nova página baseada no primeiro item atual
    const firstItemIndex = (currentPage - 1) * pageSize;
    const newPage = Math.floor(firstItemIndex / newSize) + 1;
    
    // Limpar cache
    if (cacheKey) {
      cacheSystem.delete(getCacheKey);
    }
    
    setCurrentPage(newPage);
  };

  /**
   * Alterar filtros
   */
  const setFilters = (newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
    
    // Limpar cache
    if (cacheKey) {
      cacheSystem.delete(getCacheKey);
    }
  };

  /**
   * Alterar busca
   */
  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
    setCurrentPage(1);
    
    // Limpar cache
    if (cacheKey) {
      cacheSystem.delete(getCacheKey);
    }
  };

  /**
   * Alterar ordenação
   */
  const setSorting = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
    setCurrentPage(1);
    
    // Limpar cache
    if (cacheKey) {
      cacheSystem.delete(getCacheKey);
    }
  };

  // Carregar dados quando dependências mudarem
  useEffect(() => {
    loadData(currentPage);
  }, [currentPage, pageSize, filters, searchQuery, sortBy, sortOrder]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData(1);
  }, []);

  return {
    data,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    goToPage,
    nextPage,
    previousPage,
    refresh,
    setPageSize,
    setFilters,
    setSearchQuery,
    setSorting
  };
}

/**
 * Hook para paginação de formulários de contato
 */
export function useContactFormsPagination(options: Omit<PaginationOptions, 'searchColumns'> = {}) {
  return usePagination('contact_forms', {
    ...options,
    searchColumns: ['name', 'email', 'event_type', 'message'],
    sortBy: 'created_at',
    sortOrder: 'desc',
    cacheKey: 'contact_forms_pagination'
  });
}

/**
 * Hook para paginação de imagens do carrossel
 */
export function useCarouselImagesPagination(options: Omit<PaginationOptions, 'searchColumns'> = {}) {
  return usePagination('carousel_images', {
    ...options,
    searchColumns: ['title', 'filename'],
    sortBy: 'order_position',
    sortOrder: 'asc',
    cacheKey: 'carousel_images_pagination',
    filters: { deleted: false, ...options.filters }
  });
}

/**
 * Hook para paginação de logs de atividade
 */
export function useActivityLogsPagination(options: Omit<PaginationOptions, 'searchColumns'> = {}) {
  return usePagination('activity_logs', {
    ...options,
    searchColumns: ['type', 'description', 'user_id'],
    sortBy: 'created_at',
    sortOrder: 'desc',
    cacheKey: 'activity_logs_pagination',
    pageSize: 20
  });
}