import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  guests: number;
  event_date: string;
  message?: string;
  created_at: string;
  status: 'unread' | 'read' | 'responded';
}

export interface CarouselImage {
  id: string;
  filename: string;
  title?: string;
  active: boolean;
  deleted: boolean;
  order_position: number;
  uploaded_at: string;
  file_url: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'moderator';
  created_at: string;
  last_login?: string;
}

// Storage buckets
export const STORAGE_BUCKETS = {
  CAROUSEL_IMAGES: 'carousel-images'
} as const;

// Helper functions
export const uploadImage = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const deleteImage = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};