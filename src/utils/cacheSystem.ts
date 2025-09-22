import { ActivityLogger } from './activityLogger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
  key: string;
  size: number; // Tamanho estimado em bytes
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
}

interface CacheConfig {
  maxSize: number; // Tamanho máximo em bytes
  maxItems: number; // Número máximo de itens
  defaultTTL: number; // TTL padrão em milissegundos
  cleanupInterval: number; // Intervalo de limpeza em milissegundos
  enableStats: boolean;
}

class CacheSystem {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private activityLogger = new ActivityLogger();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxItems: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      cleanupInterval: 60 * 1000, // 1 minuto
      enableStats: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0
    };

    this.startCleanupTimer();
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const now = Date.now();
      const itemTTL = ttl || this.config.defaultTTL;
      const size = this.estimateSize(data);

      // Verificar se precisa fazer limpeza antes de adicionar
      this.ensureCapacity(size);

      const item: CacheItem<T> = {
        data,
        timestamp: now,
        ttl: itemTTL,
        key,
        size,
        accessCount: 0,
        lastAccessed: now
      };

      // Remover item existente se houver
      if (this.cache.has(key)) {
        const existingItem = this.cache.get(key)!;
        this.stats.totalSize -= existingItem.size;
      } else {
        this.stats.itemCount++;
      }

      this.cache.set(key, item);
      this.stats.totalSize += size;

      this.activityLogger.logSystem(
        'cache_set',
        `Item armazenado no cache: ${key}`,
        'info',
        { key, size, ttl: itemTTL }
      );
    } catch (error: any) {
      this.activityLogger.logSystem(
        'cache_set_error',
        `Erro ao armazenar no cache: ${key}`,
        'error',
        { key, error: error.message }
      );
    }
  }

  /**
   * Recupera um item do cache
   */
  get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key) as CacheItem<T> | undefined;

      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const now = Date.now();

      // Verificar se o item expirou
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.totalSize -= item.size;
        this.stats.itemCount--;
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Atualizar estatísticas de acesso
      item.accessCount++;
      item.lastAccessed = now;
      this.stats.hits++;
      this.updateHitRate();

      return item.data;
    } catch (error: any) {
      this.activityLogger.logSystem(
        'cache_get_error',
        `Erro ao recuperar do cache: ${key}`,
        'error',
        { key, error: error.message }
      );
      return null;
    }
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.stats.totalSize -= item.size;
      this.stats.itemCount--;
      return true;
    }
    return false;
  }

  /**
   * Verifica se um item existe no cache e não expirou
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.itemCount = 0;
    this.activityLogger.logSystem('cache_cleared', 'Cache limpo completamente', 'info');
  }

  /**
   * Obtém ou define um valor no cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    let value = this.get<T>(key);
    
    if (value === null) {
      value = await factory();
      this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Invalida itens do cache baseado em padrão
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    this.activityLogger.logSystem(
      'cache_invalidate_pattern',
      `${count} itens invalidados com padrão: ${pattern}`,
      'info',
      { pattern, count }
    );

    return count;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Obtém informações detalhadas do cache
   */
  getInfo(): {
    config: CacheConfig;
    stats: CacheStats;
    items: Array<{
      key: string;
      size: number;
      age: number;
      accessCount: number;
      lastAccessed: number;
    }>;
  } {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      size: item.size,
      age: now - item.timestamp,
      accessCount: item.accessCount,
      lastAccessed: item.lastAccessed
    }));

    return {
      config: this.config,
      stats: this.stats,
      items
    };
  }

  /**
   * Força limpeza de itens expirados
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.totalSize -= item.size;
        this.stats.itemCount--;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.activityLogger.logSystem(
        'cache_cleanup',
        `${cleaned} itens expirados removidos`,
        'info',
        { cleaned }
      );
    }

    return cleaned;
  }

  /**
   * Estima o tamanho de um objeto em bytes
   */
  private estimateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      // Fallback para estimativa simples
      const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
      return str.length * 2; // Aproximação para UTF-16
    }
  }

  /**
   * Garante que há capacidade suficiente no cache
   */
  private ensureCapacity(newItemSize: number): void {
    // Verificar limite de tamanho
    while (
      this.stats.totalSize + newItemSize > this.config.maxSize ||
      this.stats.itemCount >= this.config.maxItems
    ) {
      this.evictLeastUsed();
    }
  }

  /**
   * Remove o item menos usado (LRU)
   */
  private evictLeastUsed(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, item] of this.cache.entries()) {
      // Score baseado em frequência e recência
      const score = item.accessCount / (Date.now() - item.lastAccessed + 1);
      
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Atualiza a taxa de acerto
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Inicia o timer de limpeza automática
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Para o timer de limpeza
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Instância global do sistema de cache
export const cacheSystem = new CacheSystem();

// Helpers para uso comum
export const cache = {
  // Cache para dados do Supabase
  supabase: {
    get: <T>(key: string) => cacheSystem.get<T>(`supabase:${key}`),
    set: <T>(key: string, data: T, ttl = 5 * 60 * 1000) => 
      cacheSystem.set(`supabase:${key}`, data, ttl),
    invalidate: (pattern: string) => 
      cacheSystem.invalidatePattern(`supabase:${pattern}`)
  },

  // Cache para imagens
  images: {
    get: (key: string) => cacheSystem.get<string>(`image:${key}`),
    set: (key: string, url: string, ttl = 30 * 60 * 1000) => 
      cacheSystem.set(`image:${key}`, url, ttl),
    invalidate: () => cacheSystem.invalidatePattern('image:')
  },

  // Cache para configurações
  settings: {
    get: <T>(key: string) => cacheSystem.get<T>(`settings:${key}`),
    set: <T>(key: string, data: T, ttl = 60 * 60 * 1000) => 
      cacheSystem.set(`settings:${key}`, data, ttl),
    invalidate: () => cacheSystem.invalidatePattern('settings:')
  },

  // Cache para estatísticas
  stats: {
    get: <T>(key: string) => cacheSystem.get<T>(`stats:${key}`),
    set: <T>(key: string, data: T, ttl = 10 * 60 * 1000) => 
      cacheSystem.set(`stats:${key}`, data, ttl),
    invalidate: () => cacheSystem.invalidatePattern('stats:')
  }
};

// Caches específicos para compatibilidade
export const contactsCache = {
  get: <T>(key: string) => cacheSystem.get<T>(`contacts:${key}`),
  set: <T>(key: string, data: T, ttl = 5 * 60 * 1000) => 
    cacheSystem.set(`contacts:${key}`, data, ttl),
  invalidate: (pattern: string) => 
    cacheSystem.invalidatePattern(`contacts:${pattern}`),
  clear: () => cacheSystem.invalidatePattern('contacts:'),
  getStats: () => cacheSystem.getStats()
};

export const imagesCache = {
  get: (key: string) => cacheSystem.get<string>(`images:${key}`),
  set: (key: string, url: string, ttl = 30 * 60 * 1000) => 
    cacheSystem.set(`images:${key}`, url, ttl),
  invalidate: (pattern: string) => 
    cacheSystem.invalidatePattern(`images:${pattern}`),
  clear: () => cacheSystem.invalidatePattern('images:'),
  getStats: () => cacheSystem.getStats()
};

export const settingsCache = {
  get: <T>(key: string) => cacheSystem.get<T>(`settings:${key}`),
  set: <T>(key: string, data: T, ttl = 60 * 60 * 1000) => 
    cacheSystem.set(`settings:${key}`, data, ttl),
  invalidate: (pattern: string) => 
    cacheSystem.invalidatePattern(`settings:${pattern}`),
  clear: () => cacheSystem.invalidatePattern('settings:'),
  getStats: () => cacheSystem.getStats()
};

export default cacheSystem;