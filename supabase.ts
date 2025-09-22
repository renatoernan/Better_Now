// Re-export do cliente Supabase para compatibilidade com imports existentes
export { supabase, supabaseHelpers } from './lib/supabase';
export type {
  ContactForm,
  CarouselImage,
  AdminUser,
  ActivityLog,
  AppSetting
} from './lib/supabase';