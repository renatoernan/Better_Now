import { supabase } from '../supabase';
import { ActivityLogger } from './activityLogger';
import { cacheSystem } from './cacheSystem';
import { retrySystem } from './retrySystem';

interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  details: Record<string, any>;
}

interface LocalStorageData {
  carouselImages?: any[];
  settings?: Record<string, any>;
  contacts?: any[];
  adminConfig?: Record<string, any>;
}

class DataMigration {

  /**
   * Executa migração completa dos dados
   */
  async migrateAll(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      details: {}
    };

    try {
      ActivityLogger.logSystem(
        'migration_started',
        'Iniciando migração de dados do localStorage para Supabase',
        'info'
      );

      // 1. Migrar imagens do carrossel
      const imagesResult = await this.migrateCarouselImages();
      result.migratedItems += imagesResult.migratedItems;
      result.errors.push(...imagesResult.errors);
      result.details.images = imagesResult.details;

      // 2. Migrar configurações
      const settingsResult = await this.migrateSettings();
      result.migratedItems += settingsResult.migratedItems;
      result.errors.push(...settingsResult.errors);
      result.details.settings = settingsResult.details;

      // 3. Migrar contatos (se houver)
      const contactsResult = await this.migrateContacts();
      result.migratedItems += contactsResult.migratedItems;
      result.errors.push(...contactsResult.errors);
      result.details.contacts = contactsResult.details;

      // 4. Migrar configurações administrativas
      const adminResult = await this.migrateAdminConfig();
      result.migratedItems += adminResult.migratedItems;
      result.errors.push(...adminResult.errors);
      result.details.admin = adminResult.details;

      result.success = result.errors.length === 0;

      ActivityLogger.logSystem(
        result.success ? 'migration_completed' : 'migration_completed_with_errors',
        `Migração concluída: ${result.migratedItems} itens migrados`,
        result.success ? 'success' : 'warning',
        result
      );

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      
      ActivityLogger.logSystem(
        'migration_failed',
        'Falha na migração de dados',
        'error',
        { error: error.message }
      );

      return result;
    }
  }

  /**
   * Migra imagens do carrossel
   */
  private async migrateCarouselImages(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      details: { processed: [], skipped: [], failed: [] }
    };

    try {
      // Buscar imagens do localStorage
      const localImages = this.getLocalStorageData('carouselImages') || [];
      
      if (localImages.length === 0) {
        result.details.message = 'Nenhuma imagem encontrada no localStorage';
        return result;
      }

      // Verificar quais imagens já existem no Supabase
      const { data: existingImages } = await supabase
        .from('carousel_images')
        .select('filename');

      const existingFilenames = new Set(
        existingImages?.map(img => img.filename) || []
      );

      for (const localImage of localImages) {
        try {
          // Pular se já existe
          if (existingFilenames.has(localImage.filename)) {
            result.details.skipped.push(localImage.filename);
            continue;
          }

          // Migrar imagem
          const migratedImage = await this.migrateImageToSupabase(localImage);
          
          if (migratedImage) {
            result.migratedItems++;
            result.details.processed.push(localImage.filename);
          } else {
            result.details.failed.push(localImage.filename);
            result.errors.push(`Falha ao migrar imagem: ${localImage.filename}`);
          }
        } catch (error: any) {
          result.details.failed.push(localImage.filename);
          result.errors.push(`Erro ao migrar ${localImage.filename}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erro na migração de imagens: ${error.message}`);
      return result;
    }
  }

  /**
   * Migra uma imagem específica para o Supabase
   */
  private async migrateImageToSupabase(localImage: any): Promise<boolean> {
    try {
      // Se a imagem está em base64, fazer upload
      if (localImage.data && localImage.data.startsWith('data:')) {
        const uploadResult = await this.uploadBase64Image(
          localImage.data,
          localImage.filename
        );
        
        if (!uploadResult.success) {
          return false;
        }
        
        localImage.file_url = uploadResult.url;
      }

      // Inserir registro na tabela
      const { error } = await retrySystem.executeWithRetry(
        () => supabase.from('carousel_images').insert({
          filename: localImage.filename,
          title: localImage.title || '',
          active: localImage.active !== false,
          deleted: localImage.deleted || false,
          order_position: localImage.order || 0,
          file_url: localImage.file_url || localImage.src
        }),
        { maxAttempts: 3 }
      );

      return !error;
    } catch (error) {
      console.error('Erro ao migrar imagem:', error);
      return false;
    }
  }

  /**
   * Faz upload de imagem base64 para o Supabase Storage
   */
  private async uploadBase64Image(base64Data: string, filename: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Converter base64 para blob
      const response = await fetch(base64Data);
      const blob = await response.blob();

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('carousel-images')
        .upload(filename, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(filename);

      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Migra configurações gerais
   */
  private async migrateSettings(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      details: {}
    };

    try {
      const settings = this.getLocalStorageData('appSettings') || {};
      
      if (Object.keys(settings).length === 0) {
        result.details.message = 'Nenhuma configuração encontrada';
        return result;
      }

      // Criar backup das configurações no Supabase Storage
      const backupData = {
        settings,
        migratedAt: new Date().toISOString(),
        version: '1.0'
      };

      const backupBlob = new Blob(
        [JSON.stringify(backupData, null, 2)],
        { type: 'application/json' }
      );

      const backupFilename = `settings-backup-${Date.now()}.json`;
      
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(backupFilename, backupBlob);

      if (uploadError) {
        result.errors.push(`Erro ao fazer backup das configurações: ${uploadError.message}`);
      } else {
        result.migratedItems++;
        result.details.backupFile = backupFilename;
      }

      // Armazenar configurações no cache para uso imediato
      Object.entries(settings).forEach(([key, value]) => {
        cacheSystem.set(`settings:${key}`, value, 24 * 60 * 60 * 1000); // 24 horas
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erro na migração de configurações: ${error.message}`);
      return result;
    }
  }

  /**
   * Migra contatos do localStorage (se houver)
   */
  private async migrateContacts(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      details: {}
    };

    try {
      const localContacts = this.getLocalStorageData('contacts') || [];
      
      if (localContacts.length === 0) {
        result.details.message = 'Nenhum contato encontrado no localStorage';
        return result;
      }

      for (const contact of localContacts) {
        try {
          const { error } = await retrySystem.executeWithRetry(
            () => supabase.from('contact_forms').insert({
              name: contact.name,
              email: contact.email,
              phone: contact.phone || '',
              event_type: contact.eventType || 'outros',
              guests: contact.guests || 0,
              event_date: contact.eventDate || null,
              message: contact.message || '',
              status: contact.status || 'new',
              created_at: contact.createdAt || new Date().toISOString()
            }),
            { maxAttempts: 3 }
          );

          if (!error) {
            result.migratedItems++;
          } else {
            result.errors.push(`Erro ao migrar contato ${contact.email}: ${error.message}`);
          }
        } catch (error: any) {
          result.errors.push(`Erro ao processar contato ${contact.email}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erro na migração de contatos: ${error.message}`);
      return result;
    }
  }

  /**
   * Migra configurações administrativas
   */
  private async migrateAdminConfig(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      details: {}
    };

    try {
      const adminConfig = this.getLocalStorageData('adminConfig') || {};
      
      if (Object.keys(adminConfig).length === 0) {
        result.details.message = 'Nenhuma configuração administrativa encontrada';
        return result;
      }

      // Criar backup das configurações administrativas
      const backupData = {
        adminConfig,
        migratedAt: new Date().toISOString(),
        version: '1.0'
      };

      const backupBlob = new Blob(
        [JSON.stringify(backupData, null, 2)],
        { type: 'application/json' }
      );

      const backupFilename = `admin-config-backup-${Date.now()}.json`;
      
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(backupFilename, backupBlob);

      if (uploadError) {
        result.errors.push(`Erro ao fazer backup da configuração admin: ${uploadError.message}`);
      } else {
        result.migratedItems++;
        result.details.backupFile = backupFilename;
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erro na migração de configurações admin: ${error.message}`);
      return result;
    }
  }

  /**
   * Obtém dados do localStorage
   */
  private getLocalStorageData(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Erro ao ler ${key} do localStorage:`, error);
      return null;
    }
  }

  /**
   * Limpa dados migrados do localStorage
   */
  async cleanupLocalStorage(keys: string[] = []): Promise<void> {
    const defaultKeys = [
      'carouselImages',
      'appSettings',
      'contacts',
      'adminConfig'
    ];

    const keysToClean = keys.length > 0 ? keys : defaultKeys;

    keysToClean.forEach(key => {
      try {
        localStorage.removeItem(key);
        ActivityLogger.logSystem(
          'localStorage_cleaned',
          `Chave ${key} removida do localStorage`,
          'info',
          { key }
        );
      } catch (error: any) {
        console.warn(`Erro ao limpar ${key} do localStorage:`, error);
      }
    });
  }

  /**
   * Verifica se há dados para migrar
   */
  hasDataToMigrate(): boolean {
    const keys = ['carouselImages', 'appSettings', 'contacts', 'adminConfig'];
    
    return keys.some(key => {
      const data = this.getLocalStorageData(key);
      return data && (
        Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0
      );
    });
  }

  /**
   * Obtém resumo dos dados disponíveis para migração
   */
  getMigrationSummary(): {
    carouselImages: number;
    settings: number;
    contacts: number;
    adminConfig: number;
    total: number;
  } {
    const carouselImages = this.getLocalStorageData('carouselImages') || [];
    const settings = this.getLocalStorageData('appSettings') || {};
    const contacts = this.getLocalStorageData('contacts') || [];
    const adminConfig = this.getLocalStorageData('adminConfig') || {};

    const summary = {
      carouselImages: Array.isArray(carouselImages) ? carouselImages.length : 0,
      settings: Object.keys(settings).length,
      contacts: Array.isArray(contacts) ? contacts.length : 0,
      adminConfig: Object.keys(adminConfig).length,
      total: 0
    };

    summary.total = summary.carouselImages + summary.settings + summary.contacts + summary.adminConfig;

    return summary;
  }
}

// Instância global do sistema de migração
export const dataMigration = new DataMigration();

export default dataMigration;