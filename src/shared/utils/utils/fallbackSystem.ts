import { ActivityLogger } from './activityLogger';
import { retrySystem } from './retrySystem';

interface FallbackOptions {
  useLocalStorage?: boolean;
  syncOnReconnect?: boolean;
  maxLocalStorageSize?: number;
  compressionEnabled?: boolean;
}

interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface FallbackData {
  contactForms: any[];
  carouselImages: any[];
  adminSettings: any;
  pendingOperations: PendingOperation[];
  lastSync: number;
}

export class FallbackSystem {
  private options: FallbackOptions;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private pendingOperations: PendingOperation[] = [];
  private onlineHandler: () => void;
  private offlineHandler: () => void;
  private beforeUnloadHandler: () => void;

  constructor(options: FallbackOptions = {}) {
    this.options = {
      useLocalStorage: true,
      syncOnReconnect: true,
      maxLocalStorageSize: 5 * 1024 * 1024, // 5MB
      compressionEnabled: true,
      ...options
    };

    // Bind handlers
    this.onlineHandler = this.handleReconnection.bind(this);
    this.offlineHandler = this.handleDisconnection.bind(this);
    this.beforeUnloadHandler = this.savePendingOperations.bind(this);

    this.loadPendingOperations();
    this.setupEventListeners();
    this.startSyncInterval();
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Executar operação com fallback automático
   */
  async executeWithFallback<T>(
    supabaseOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T> | T,
    operationInfo: {
      type: 'insert' | 'update' | 'delete';
      table: string;
      data?: any;
      description: string;
    }
  ): Promise<T> {
    try {
      // Tentar operação no Supabase primeiro
      if (this.isOnline) {
        const result = await retrySystem.supabaseOperation(
          supabaseOperation,
          operationInfo.description
        );

        ActivityLogger.logSystem(
          'fallback_success_online',
          `Operação '${operationInfo.description}' executada online com sucesso`,
          'success',
          { table: operationInfo.table, type: operationInfo.type }
        );

        return result;
      }
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_supabase_failed',
        `Operação Supabase falhou: ${operationInfo.description}`,
        'error',
        { error: error.message, table: operationInfo.table }
      );

      // Adicionar à fila de operações pendentes se for modificação
      if (operationInfo.data) {
        const pendingOp: PendingOperation = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          retryCount: 0,
          type: operationInfo.type,
          table: operationInfo.table,
          data: operationInfo.data
        };
        this.addPendingOperation(pendingOp);
      }
    }

    // Usar fallback (localStorage)
    try {
      const result = await fallbackOperation();
      
      ActivityLogger.logSystem(
        'fallback_success_offline',
        `Operação '${operationInfo.description}' executada offline com sucesso`,
        'success',
        { table: operationInfo.table, type: operationInfo.type }
      );

      return result;
    } catch (fallbackError) {
      ActivityLogger.logSystem(
        'fallback_complete_failure',
        `Falha completa na operação: ${operationInfo.description}`,
        'error',
        { 
          error: fallbackError.message, 
          table: operationInfo.table,
          type: operationInfo.type
        }
      );

      throw fallbackError;
    }
  }

  /**
   * Adicionar operação pendente
   */
  private addPendingOperation(pendingOp: PendingOperation): void {
    this.pendingOperations.push(pendingOp);
    this.savePendingOperations();

    ActivityLogger.logSystem(
      'fallback_operation_queued',
      `Operação adicionada à fila: ${pendingOp.table}`,
      'info',
      { operationId: pendingOp.id, table: pendingOp.table }
    );
  }

  /**
   * Salvar operações pendentes no localStorage
   */
  private savePendingOperations(): void {
    if (!this.options.useLocalStorage) return;

    try {
      const data = JSON.stringify(this.pendingOperations);
      
      // Verificar tamanho
      if (data.length > this.options.maxLocalStorageSize!) {
        // Remover operações mais antigas
        this.pendingOperations = this.pendingOperations
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, Math.floor(this.pendingOperations.length * 0.7));
      }

      localStorage.setItem('fallback_pending_operations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_save_error',
        'Erro ao salvar operações pendentes',
        'error',
        { error: error.message }
      );
    }
  }

  /**
   * Carregar operações pendentes do localStorage
   */
  private loadPendingOperations(): void {
    if (!this.options.useLocalStorage) return;

    try {
      const stored = localStorage.getItem('fallback_pending_operations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
        
        // Remover operações muito antigas (mais de 7 dias)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.pendingOperations = this.pendingOperations.filter(
          op => op.timestamp > weekAgo
        );
      }
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_load_error',
        'Erro ao carregar operações pendentes',
        'error',
        { error: error.message }
      );
      this.pendingOperations = [];
    }
  }

  /**
   * Sincronizar operações pendentes
   */
  async syncPendingOperations(): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.isOnline || this.pendingOperations.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    const operationsToSync = [...this.pendingOperations];
    
    for (const operation of operationsToSync) {
      try {
        await this.executePendingOperation(operation);
        
        // Remover da lista de pendentes
        this.pendingOperations = this.pendingOperations.filter(
          op => op.id !== operation.id
        );
        
        results.successful++;
        
        ActivityLogger.logSystem(
          'fallback_sync_success',
          `Operação sincronizada: ${operation.table}`,
          'success',
          { operationId: operation.id, type: operation.type }
        );
      } catch (error) {
        operation.retryCount++;
        results.failed++;
        results.errors.push(`${operation.table}: ${error.message}`);
        
        // Remover operações que falharam muitas vezes
        if (operation.retryCount >= 5) {
          this.pendingOperations = this.pendingOperations.filter(
            op => op.id !== operation.id
          );
          
          ActivityLogger.logSystem(
            'fallback_sync_abandoned',
            `Operação abandonada após 5 tentativas: ${operation.table}`,
            'warning',
            { operationId: operation.id, error: error.message }
          );
        }
      }
    }

    this.savePendingOperations();
    
    ActivityLogger.logSystem(
      'fallback_sync_completed',
      `Sincronização concluída: ${results.successful} sucessos, ${results.failed} falhas`,
      'info',
      results
    );

    return results;
  }

  /**
   * Executar operação pendente específica
   */
  private async executePendingOperation(operation: PendingOperation): Promise<void> {
    // Esta função seria implementada com base no tipo de operação
    // Por enquanto, apenas um placeholder
    throw new Error('executePendingOperation não implementada ainda');
  }

  /**
   * Manipular reconexão
   */
  private async handleReconnection(): Promise<void> {
    this.isOnline = true;
    ActivityLogger.logSystem(
      'fallback_reconnected',
      'Conexão restaurada, iniciando sincronização',
      'info',
      { pendingOperations: this.pendingOperations.length }
    );

    if (this.options.syncOnReconnect) {
      try {
        await this.syncPendingOperations();
      } catch (error) {
        ActivityLogger.logSystem(
          'fallback_reconnect_sync_error',
          'Erro na sincronização após reconexão',
          'error',
          { error: error.message }
        );
      }
    }
  }

  /**
   * Manipular desconexão
   */
  private handleDisconnection(): void {
    this.isOnline = false;
    ActivityLogger.logSystem(
      'fallback_disconnected',
      'Conexão perdida, modo offline ativado',
      'warning',
      { pendingOperations: this.pendingOperations.length }
    );
  }

  /**
   * Iniciar intervalo de sincronização
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sincronizar a cada 5 minutos
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        try {
          await this.syncPendingOperations();
        } catch (error) {
          // Erro silencioso para não interromper a aplicação
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Obter dados do fallback (localStorage)
   */
  getFallbackData(): FallbackData {
    const defaultData: FallbackData = {
      contactForms: [],
      carouselImages: [],
      adminSettings: {},
      pendingOperations: this.pendingOperations,
      lastSync: 0
    };

    if (!this.options.useLocalStorage) {
      return defaultData;
    }

    try {
      const stored = localStorage.getItem('fallback_data');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          ...defaultData,
          ...data,
          pendingOperations: this.pendingOperations
        };
      }
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_data_load_error',
        'Erro ao carregar dados do fallback',
        'error',
        { error: error.message }
      );
    }

    return defaultData;
  }

  /**
   * Salvar dados no fallback
   */
  saveFallbackData(data: Partial<FallbackData>): void {
    if (!this.options.useLocalStorage) return;

    try {
      const currentData = this.getFallbackData();
      const updatedData = {
        ...currentData,
        ...data,
        lastSync: Date.now()
      };

      const serialized = JSON.stringify(updatedData);
      
      // Verificar tamanho
      if (serialized.length > this.options.maxLocalStorageSize!) {
        throw new Error('Dados excedem o limite de armazenamento local');
      }

      localStorage.setItem('fallback_data', serialized);
      
      ActivityLogger.logSystem(
        'fallback_data_saved',
        'Dados salvos no fallback',
        'info',
        { dataSize: serialized.length }
      );
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_data_save_error',
        'Erro ao salvar dados no fallback',
        'error',
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Limpar dados do fallback
   */
  clearFallbackData(): void {
    if (!this.options.useLocalStorage) return;

    try {
      localStorage.removeItem('fallback_data');
      localStorage.removeItem('fallback_pending_operations');
      this.pendingOperations = [];
      
      ActivityLogger.logSystem(
        'fallback_data_cleared',
        'Dados do fallback limpos',
        'info'
      );
    } catch (error) {
      ActivityLogger.logSystem(
        'fallback_clear_error',
        'Erro ao limpar dados do fallback',
        'error',
        { error: error.message }
      );
    }
  }

  /**
   * Obter estatísticas do fallback
   */
  getFallbackStats(): {
    isOnline: boolean;
    pendingOperations: number;
    fallbackDataSize: number;
    lastSync: number;
    syncErrors: number;
  } {
    const data = this.getFallbackData();
    const activities = ActivityLogger.getLogs().slice(-100);
    
    const syncErrors = activities.filter(a => 
      a.action.includes('fallback') && a.action.includes('error')
    ).length;

    let fallbackDataSize = 0;
    try {
      const stored = localStorage.getItem('fallback_data');
      fallbackDataSize = stored ? stored.length : 0;
    } catch (error) {
      // Ignorar erro
    }

    return {
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      fallbackDataSize,
      lastSync: data.lastSync,
      syncErrors
    };
  }

  /**
   * Destruir instância
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.savePendingOperations();
    
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }
}

// Instância global do sistema de fallback
export const fallbackSystem = new FallbackSystem();

// Helper para uso comum
export const withFallback = fallbackSystem.executeWithFallback.bind(fallbackSystem);