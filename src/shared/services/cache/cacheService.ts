import type { CacheEntry, CacheConfig } from '../../types';

/**
 * Sistema de cache inteligente para otimização de performance
 * Implementa estratégias de cache com TTL, invalidação automática e compressão
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      maxSize: 100,
      enableCompression: true,
      enableMetrics: true,
      cleanupInterval: 60 * 1000, // 1 minuto
      ...config
    };

    this.startCleanup();
  }

  /**
   * Armazena um valor no cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    
    // Remove entradas antigas se o cache estiver cheio
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value: this.config.enableCompression ? this.compress(value) : value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(value),
      compressed: this.config.enableCompression
    };

    this.cache.set(key, entry);
  }

  /**
   * Recupera um valor do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Atualiza estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Descomprime se necessário
    return entry.compressed ? this.decompress(entry.value) : entry.value;
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalida cache por padrão de chave
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const expired = entries.filter(entry => Date.now() > entry.expiresAt).length;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalSize,
      expired,
      hitRate: this.calculateHitRate(),
      oldestEntry: Math.min(...entries.map(e => e.createdAt)),
      newestEntry: Math.max(...entries.map(e => e.createdAt))
    };
  }

  /**
   * Wrapper para operações assíncronas com cache
   */
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Tenta buscar no cache primeiro
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Executa a função e armazena o resultado
    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // Não armazena erros no cache
      throw error;
    }
  }

  /**
   * Cache com refresh automático em background
   */
  async memoizeWithRefresh<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    refreshThreshold = 0.8
  ): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (entry) {
      const timeLeft = entry.expiresAt - Date.now();
      const totalTTL = entry.expiresAt - entry.createdAt;
      
      // Se está próximo do vencimento, refresh em background
      if (timeLeft / totalTTL < refreshThreshold) {
        // Não aguarda o refresh, retorna o valor atual
        this.refreshInBackground(key, fn, ttl);
      }
      
      if (timeLeft > 0) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry.compressed ? this.decompress(entry.value) : entry.value;
      }
    }

    // Cache miss ou expirado, busca sincronamente
    return this.memoize(key, fn, ttl);
  }

  /**
   * Pré-aquece o cache com dados importantes
   */
  async warmup(entries: Array<{ key: string; fn: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = entries.map(async ({ key, fn, ttl }) => {
      try {
        const result = await fn();
        this.set(key, result, ttl);
      } catch (error) {
        console.warn(`Cache warmup failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Refresh em background
   */
  private async refreshInBackground<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      const result = await fn();
      this.set(key, result, ttl);
    } catch (error) {
      console.warn(`Background refresh failed for key ${key}:`, error);
    }
  }

  /**
   * Remove entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove a entrada mais antiga (LRU)
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Inicia limpeza automática
   */
  private startCleanup(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * Para a limpeza automática
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Comprime dados (simulação - em produção usar biblioteca real)
   */
  private compress<T>(data: T): string {
    return JSON.stringify(data);
  }

  /**
   * Descomprime dados
   */
  private decompress<T>(data: string): T {
    return JSON.parse(data);
  }

  /**
   * Calcula o tamanho aproximado dos dados
   */
  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  /**
   * Calcula taxa de acerto do cache
   */
  private calculateHitRate(): number {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return 0;
    
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccess / entries.length;
  }

  /**
   * Destrói o serviço de cache
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// Instância singleton do cache
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 200,
  enableCompression: true,
  enableMetrics: true,
  cleanupInterval: 2 * 60 * 1000 // 2 minutos
});

// Chaves de cache padronizadas
export const CACHE_KEYS = {
  EVENTS: {
    ALL: 'events:all',
    ACTIVE: 'events:active',
    BY_TYPE: (type: string) => `events:type:${type}`,
    BY_ID: (id: string) => `events:id:${id}`,
    STATS: 'events:stats'
  },
  CLIENTS: {
    ALL: 'clients:all',
    ACTIVE: 'clients:active',
    BY_ID: (id: string) => `clients:id:${id}`,
    STATS: 'clients:stats'
  },
  TESTIMONIALS: {
    ALL: 'testimonials:all',
    APPROVED: 'testimonials:approved',
    FEATURED: 'testimonials:featured',
    BY_ID: (id: string) => `testimonials:id:${id}`
  },
  SETTINGS: {
    ALL: 'settings:all',
    BY_KEY: (key: string) => `settings:key:${key}`
  },
  IMAGES: {
    CAROUSEL: 'images:carousel',
    BY_ID: (id: string) => `images:id:${id}`
  }
} as const;

// Utilitários para invalidação de cache
export const cacheUtils = {
  /**
   * Invalida cache relacionado a eventos
   */
  invalidateEvents(): void {
    cacheService.invalidatePattern('^events:');
  },

  /**
   * Invalida cache relacionado a clientes
   */
  invalidateClients(): void {
    cacheService.invalidatePattern('^clients:');
  },

  /**
   * Invalida cache relacionado a depoimentos
   */
  invalidateTestimonials(): void {
    cacheService.invalidatePattern('^testimonials:');
  },

  /**
   * Invalida cache relacionado a configurações
   */
  invalidateSettings(): void {
    cacheService.invalidatePattern('^settings:');
  },

  /**
   * Invalida cache relacionado a imagens
   */
  invalidateImages(): void {
    cacheService.invalidatePattern('^images:');
  },

  /**
   * Invalida todo o cache
   */
  invalidateAll(): void {
    cacheService.clear();
  }
};