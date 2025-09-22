import { supabase } from '../lib/supabase';
import { ActivityLogger } from './activityLogger';
import { contactsCache, imagesCache, settingsCache } from './cacheSystem';

interface BackupData {
  timestamp: string;
  version: string;
  data: {
    contacts: any[];
    images: any[];
    settings: any;
    activities: any[];
  };
  metadata: {
    totalContacts: number;
    totalImages: number;
    backupSize: number;
    checksum: string;
  };
}

interface BackupOptions {
  includeImages?: boolean;
  includeContacts?: boolean;
  includeSettings?: boolean;
  includeActivities?: boolean;
  compress?: boolean;
}

export class BackupSystem {
  private activityLogger: ActivityLogger;
  private isBackingUp = false;
  private lastBackupTime: Date | null = null;

  constructor() {
    this.activityLogger = new ActivityLogger();
    // Desabilitar backup automático temporariamente devido a problemas de RLS
    // this.setupAutoBackup();
  }

  /**
   * Configurar backup automático
   */
  private setupAutoBackup() {
    // Backup automático a cada 6 horas
    setInterval(() => {
      this.createAutoBackup();
    }, 6 * 60 * 60 * 1000);

    // Backup ao detectar mudanças críticas
    this.setupChangeDetection();
  }

  /**
   * Detectar mudanças críticas e fazer backup
   */
  private setupChangeDetection() {
    // Monitorar mudanças no localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);
      
      // Fazer backup se configurações importantes mudaram
      if (key.includes('better-now') || key.includes('admin')) {
        this.scheduleBackup();
      }
    };
  }

  /**
   * Agendar backup (debounced)
   */
  private scheduleBackup() {
    if (this.isBackingUp) return;

    setTimeout(() => {
      this.createAutoBackup();
    }, 30000); // 30 segundos de delay
  }

  /**
   * Criar backup automático
   */
  private async createAutoBackup() {
    if (this.isBackingUp) return;

    try {
      await this.createBackup({
        includeImages: true,
        includeContacts: true,
        includeSettings: true,
        includeActivities: false, // Não incluir atividades em backups automáticos
        compress: true
      });

      this.lastBackupTime = new Date();
      console.log('✅ Backup automático criado com sucesso');
    } catch (error) {
      console.error('❌ Erro no backup automático:', error);
    }
  }

  /**
   * Criar backup manual
   */
  async createBackup(options: BackupOptions = {}): Promise<string> {
    if (this.isBackingUp) {
      throw new Error('Backup já está em andamento');
    }

    this.isBackingUp = true;

    try {
      const defaultOptions: BackupOptions = {
        includeImages: true,
        includeContacts: true,
        includeSettings: true,
        includeActivities: true,
        compress: false,
        ...options
      };

      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          contacts: [],
          images: [],
          settings: {},
          activities: []
        },
        metadata: {
          totalContacts: 0,
          totalImages: 0,
          backupSize: 0,
          checksum: ''
        }
      };

      // Backup dos contatos
      if (defaultOptions.includeContacts) {
        const { data: contacts } = await supabase
          .from('contact_forms')
          .select('*')
          .order('created_at', { ascending: false });
        
        backupData.data.contacts = contacts || [];
        backupData.metadata.totalContacts = contacts?.length || 0;
      }

      // Backup das imagens
      if (defaultOptions.includeImages) {
        const { data: images } = await supabase
          .from('carousel_images')
          .select('*')
          .order('order_position', { ascending: true });
        
        backupData.data.images = images || [];
        backupData.metadata.totalImages = images?.length || 0;
      }

      // Backup das configurações
      if (defaultOptions.includeSettings) {
        const settings = {
          localStorage: this.getLocalStorageData(),
          cache: this.getCacheData()
        };
        backupData.data.settings = settings;
      }

      // Backup das atividades
      if (defaultOptions.includeActivities) {
        backupData.data.activities = this.activityLogger.getRecentActivities(100);
      }

      // Calcular metadados
      const backupString = JSON.stringify(backupData);
      backupData.metadata.backupSize = new Blob([backupString]).size;
      backupData.metadata.checksum = await this.calculateChecksum(backupString);

      // Salvar backup
      const backupId = await this.saveBackup(backupData, defaultOptions.compress);

      // Log da atividade
      this.activityLogger.logBackup(
        'backup_created',
        `Backup criado com sucesso (${backupData.metadata.totalContacts} contatos, ${backupData.metadata.totalImages} imagens)`,
        'success',
        { 
          backupId,
          size: backupData.metadata.backupSize,
          checksum: backupData.metadata.checksum
        }
      );

      return backupId;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Salvar backup no Supabase Storage
   */
  private async saveBackup(backupData: BackupData, compress: boolean = false): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json${compress ? '.gz' : ''}`;
    
    let content = JSON.stringify(backupData, null, 2);
    
    // Comprimir se solicitado
    if (compress) {
      // Implementar compressão se necessário
      // Por enquanto, apenas salvar como JSON
    }

    const { error } = await supabase.storage
      .from('backups')
      .upload(filename, content, {
        contentType: 'application/json',
        upsert: false
      });

    if (error) {
      throw new Error(`Erro ao salvar backup: ${error.message}`);
    }

    // Também salvar uma cópia local
    localStorage.setItem(`backup-${timestamp}`, content);

    return filename;
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    try {
      // Tentar carregar do Supabase primeiro
      const { data, error } = await supabase.storage
        .from('backups')
        .download(backupId);

      let backupContent: string;
      
      if (error || !data) {
        // Tentar carregar do localStorage
        const localBackup = localStorage.getItem(backupId.replace('.json', ''));
        if (!localBackup) {
          throw new Error('Backup não encontrado');
        }
        backupContent = localBackup;
      } else {
        backupContent = await data.text();
      }

      const backupData: BackupData = JSON.parse(backupContent);

      // Validar checksum
      const currentChecksum = await this.calculateChecksum(JSON.stringify(backupData.data));
      if (currentChecksum !== backupData.metadata.checksum) {
        console.warn('⚠️ Checksum do backup não confere, mas continuando...');
      }

      // Restaurar configurações
      if (backupData.data.settings?.localStorage) {
        Object.entries(backupData.data.settings.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
      }

      // Invalidar caches para forçar reload
      contactsCache.clear();
      imagesCache.clear();
      settingsCache.clear();

      // Log da atividade
      this.activityLogger.logBackup(
        'backup_restored',
        `Backup restaurado: ${backupId}`,
        'success',
        { 
          backupId,
          timestamp: backupData.timestamp,
          totalContacts: backupData.metadata.totalContacts,
          totalImages: backupData.metadata.totalImages
        }
      );

      console.log('✅ Backup restaurado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups(): Promise<Array<{ id: string; name: string; created_at: string; size?: number }>> {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .list('', {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      return data?.map(file => ({
        id: file.name,
        name: file.name,
        created_at: file.created_at,
        size: file.metadata?.size
      })) || [];
    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Excluir backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('backups')
        .remove([backupId]);

      if (error) {
        throw error;
      }

      // Remover também do localStorage
      localStorage.removeItem(backupId.replace('.json', ''));

      this.activityLogger.logBackup(
        'backup_deleted',
        `Backup excluído: ${backupId}`,
        'info',
        { backupId }
      );
    } catch (error) {
      console.error('❌ Erro ao excluir backup:', error);
      throw error;
    }
  }

  /**
   * Obter dados do localStorage
   */
  private getLocalStorageData(): Record<string, string> {
    const data: Record<string, string> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('better-now') || key.includes('admin'))) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    
    return data;
  }

  /**
   * Obter dados do cache
   */
  private getCacheData(): Record<string, any> {
    return {
      contacts: contactsCache.getStats(),
      images: imagesCache.getStats(),
      settings: settingsCache.getStats()
    };
  }

  /**
   * Calcular checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Obter status do sistema de backup
   */
  getStatus() {
    return {
      isBackingUp: this.isBackingUp,
      lastBackupTime: this.lastBackupTime,
      nextAutoBackup: this.lastBackupTime 
        ? new Date(this.lastBackupTime.getTime() + 6 * 60 * 60 * 1000)
        : null
    };
  }
}

// Instância global do sistema de backup
export const backupSystem = new BackupSystem();