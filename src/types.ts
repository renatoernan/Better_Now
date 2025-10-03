// Tipos para o sistema de eventos

export interface EventType {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ServiceItem {
  title: string;
  description: string;
}

export interface PriceBatch {
  id?: string;
  name: string;
  value: number;
  start_date: string;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  event_type: string;
  event_type_data?: EventType;
  start_date: string;
  end_date?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  max_participants?: number;
  price_batches: PriceBatch[];
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  image_url?: string;
  gallery_urls?: string[];
  videos?: string[]; // Array de URLs dos vídeos
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EventRegistration {
  id?: string;
  event_id: string;
  client_id: string;
  registration_date: string;
  price_paid: number;
  batch_name: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos para formulários
export interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  price_batches: PriceBatch[];
  status: 'draft' | 'published';
}

export interface EventTypeFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
}

// Tipos para respostas da API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}