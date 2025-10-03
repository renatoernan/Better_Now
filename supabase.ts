// Re-export do cliente Supabase para compatibilidade com imports existentes
export { supabase, supabaseHelpers } from './src/shared/services/lib/supabase';
export type {
  ContactForm,
  CarouselImage,
  AdminUser,
  ActivityLog,
  AppSetting
} from './src/shared/services/lib/supabase';