import { ActivityLogger } from './activityLogger';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onSuccess?: (result: any, attempts: number) => void;
  onFailure?: (error: any, attempts: number) => void;
}

interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

export class RetrySystem {

  /**
   * Executar operação com retry automático
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = this.defaultRetryCondition,
      onRetry,
      onSuccess,
      onFailure
    } = options;

    const startTime = Date.now();
    let lastError: any;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        
        // Log de sucesso
        ActivityLogger.logSystem(
          'retry_success',
          `Operação '${operationName}' executada com sucesso`,
          'success',
          { 
            attempts, 
            totalTime,
            operationName
          }
        );

        if (onSuccess) {
          onSuccess(result, attempts);
        }

        return {
          success: true,
          result,
          attempts,
          totalTime
        };
      } catch (error) {
        lastError = error;
        
        // Verificar se deve tentar novamente
        if (attempts >= maxAttempts || !retryCondition(error)) {
          break;
        }

        // Calcular delay com backoff exponencial
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempts - 1),
          maxDelay
        );

        // Log da tentativa
        ActivityLogger.logSystem(
          'retry_attempt',
          `Tentativa ${attempts} de '${operationName}' falhou, tentando novamente em ${delay}ms`,
          'warning',
          { 
            attempts, 
            maxAttempts, 
            delay, 
            error: error.message,
            operationName
          }
        );

        if (onRetry) {
          onRetry(attempts, error);
        }

        // Aguardar antes da próxima tentativa
        await this.delay(delay);
      }
    }

    // Todas as tentativas falharam
    const totalTime = Date.now() - startTime;
    
    ActivityLogger.logSystem(
      'retry_failure',
      `Operação '${operationName}' falhou após ${attempts} tentativas`,
      'error',
      { 
        attempts, 
        totalTime, 
        error: lastError?.message,
        operationName
      }
    );

    if (onFailure) {
      onFailure(lastError, attempts);
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalTime
    };
  }

  /**
   * Condição padrão para retry
   */
  private defaultRetryCondition(error: any): boolean {
    // Não tentar novamente para erros de autenticação ou permissão
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }

    // Não tentar novamente para erros de validação
    if (error?.status === 400 || error?.status === 422) {
      return false;
    }

    // Tentar novamente para erros de rede, servidor, timeout
    if (
      error?.status >= 500 || 
      error?.code === 'NETWORK_ERROR' ||
      error?.code === 'TIMEOUT' ||
      error?.name === 'NetworkError' ||
      error?.message?.includes('fetch')
    ) {
      return true;
    }

    // Tentar novamente para erros temporários do Supabase
    if (
      error?.message?.includes('connection') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('network')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Delay com Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrapper para operações do Supabase
   */
  async supabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        ...options
      }
    );

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  }

  /**
   * Wrapper para upload de arquivos
   */
  async fileUploadOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 15000,
        backoffMultiplier: 1.5,
        retryCondition: (error) => {
          // Retry para erros de rede e timeout em uploads
          return (
            error?.status >= 500 ||
            error?.code === 'NETWORK_ERROR' ||
            error?.code === 'TIMEOUT' ||
            error?.message?.includes('upload') ||
            error?.message?.includes('network')
          );
        },
        ...options
      }
    );

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  }

  /**
   * Wrapper para operações críticas
   */
  async criticalOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      {
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 8000,
        backoffMultiplier: 2,
        ...options
      }
    );

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  }

  /**
   * Batch de operações com retry
   */
  async executeBatch<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      options?: Partial<RetryOptions>;
    }>,
    batchOptions: {
      concurrent?: boolean;
      stopOnFirstError?: boolean;
    } = {}
  ): Promise<Array<RetryResult<T>>> {
    const { concurrent = false, stopOnFirstError = false } = batchOptions;
    const results: Array<RetryResult<T>> = [];

    if (concurrent) {
      // Executar todas as operações em paralelo
      const promises = operations.map(({ operation, name, options }) =>
        this.executeWithRetry(operation, name, options)
      );
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason,
            attempts: 1,
            totalTime: 0
          });
        }
      });
    } else {
      // Executar operações sequencialmente
      for (const { operation, name, options } of operations) {
        const result = await this.executeWithRetry(operation, name, options);
        results.push(result);
        
        if (stopOnFirstError && !result.success) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Obter estatísticas de retry
   */
  getRetryStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageAttempts: number;
    averageTime: number;
  } {
    const activities = ActivityLogger.getLogs().slice(-1000);
    
    const retryActivities = activities.filter(a => 
      a.action.startsWith('retry_')
    );

    const successActivities = retryActivities.filter(a => 
      a.action === 'retry_success'
    );

    const failureActivities = retryActivities.filter(a => 
      a.action === 'retry_failure'
    );

    const totalOperations = successActivities.length + failureActivities.length;
    
    const totalAttempts = [...successActivities, ...failureActivities]
      .reduce((sum, activity) => sum + (activity.metadata?.attempts || 0), 0);
    
    const totalTime = [...successActivities, ...failureActivities]
      .reduce((sum, activity) => sum + (activity.metadata?.totalTime || 0), 0);

    return {
      totalOperations,
      successfulOperations: successActivities.length,
      failedOperations: failureActivities.length,
      averageAttempts: totalOperations > 0 ? totalAttempts / totalOperations : 0,
      averageTime: totalOperations > 0 ? totalTime / totalOperations : 0
    };
  }
}

// Instância global do sistema de retry
export const retrySystem = new RetrySystem();

// Helpers para uso comum
export const withRetry = retrySystem.executeWithRetry.bind(retrySystem);
export const withSupabaseRetry = retrySystem.supabaseOperation.bind(retrySystem);
export const withFileUploadRetry = retrySystem.fileUploadOperation.bind(retrySystem);
export const withCriticalRetry = retrySystem.criticalOperation.bind(retrySystem);