import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'better-now-app'
    }
  }
});

// Tipos para as tabelas do banco
export interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  guests: number;
  event_date: string;
  message?: string;
  created_at?: string;
  status?: 'unread' | 'read' | 'replied';
  updated_at?: string;
}

export interface CarouselImage {
  id: string;
  filename: string;
  title?: string;
  active: boolean;
  deleted: boolean;
  order_position: number;
  uploaded_at?: string;
  file_url: string;
  storage_path?: string;
  file_size?: number;
  mime_type?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'moderator';
  created_at?: string;
  last_login?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Funções auxiliares para operações comuns
export const supabaseHelpers = {
  // Verificar se o usuário está autenticado
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Verificar se o usuário é admin
  async isAdmin() {
    const { user } = await this.getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    return !error && data && ['admin', 'moderator'].includes(data.role);
  },

  // Fazer login
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Fazer logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Inserir formulário de contato
  async insertContactForm(formData: Omit<ContactForm, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('contact_forms')
      .insert([formData])
      .select()
      .single();
    return { data, error };
  },

  // Buscar formulários de contato (apenas para admins)
  async getContactForms(filters?: { status?: string; limit?: number; offset?: number }) {
    let query = supabase
      .from('contact_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Buscar imagens do carrossel
  async getCarouselImages(activeOnly = true) {
    let query = supabase
      .from('carousel_images')
      .select('*')
      .eq('deleted', false)
      .order('order_position', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Upload de imagem para o storage
  async uploadImage(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('carousel-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    return { data, error };
  },

  // Obter URL pública de uma imagem
  getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from('carousel-images')
      .getPublicUrl(path);
    return data.publicUrl;
  },

  // Buscar configurações da aplicação
  async getAppSettings(keys?: string[]) {
    let query = supabase
      .from('app_settings')
      .select('*');

    if (keys && keys.length > 0) {
      query = query.in('key', keys);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Atualizar configuração da aplicação
  async updateAppSetting(key: string, value: any, description?: string) {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  },

  // Registrar atividade no log
  async logActivity(action: string, description?: string, metadata?: Record<string, any>) {
    const { user } = await this.getCurrentUser();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        action,
        description,
        metadata,
        user_id: user?.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    return { data, error };
  },

  // Salvar configurações da aplicação
  async saveAppSettings(key: string, value: any) {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  }
};

// Helper functions for image management
export const uploadImage = async (file: File): Promise<{success: boolean, path?: string, error?: string}> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `carousel/${fileName}`;

    const { data, error } = await supabase.storage
      .from('carousel-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
};

export const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('carousel-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const deleteImage = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('carousel-images')
    .remove([path]);

  if (error) {
    console.error('Error deleting image from storage:', error);
  }
}

export default supabase;