// Core types for Better Now application
// Based on technical architecture documentation

import { EventType } from './eventTypes';

// Base entity interface
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Event related types



export interface PriceBatch extends BaseEntity {
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  sold_quantity: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  description?: string;
}

// Client related types
export interface Client extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  apelido?: string;
  cpf?: string;
  cnpj?: string;
  address?: string;
  numero?: string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  city?: string;
  state?: string;
  uf?: string;
  zip_code?: string;
  notes?: string;
  validated?: boolean;
  is_active: boolean;
}

// Purchase related types
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface Purchase extends BaseEntity {
  event_id: string;
  client_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  qr_codes: string[];
  checked_in_codes: string[];
  event?: Event;
  client?: Client;
}

// Testimonial related types
export interface Testimonial extends BaseEntity {
  name: string; // Client name
  client_name: string;
  client_email: string;
  event_name: string;
  rating: number;
  comment: string;
  testimonial_text: string; // Testimonial content
  is_approved: boolean;
  is_featured: boolean;
  event_type: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Contact form types
export interface ContactForm extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  message: string;
  is_read: boolean;
  response?: string;
  responded_at?: string;
}

// Settings types





// Utility types
export type SortOrder = 'asc' | 'desc';
export type SortField = string;

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  data?: T; // For backward compatibility
  expiresAt: number;
  createdAt: number;
  timestamp?: number; // For backward compatibility
  ttl?: number; // For backward compatibility
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableCompression?: boolean;
  enableMetrics?: boolean;
  cleanupInterval: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  last_sign_in_at?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Real-time types
export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  table: string;
}

// Export utility types
export type ExportFormat = 'csv' | 'excel' | 'pdf';



// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Dashboard types
export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalClients: number;
  totalPurchases: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentPurchases: Purchase[];
  upcomingEvents: Event[];
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  fullScreen?: boolean;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  error?: boolean;
  success?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  rules?: ValidationRule;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface FormErrors {
  [key: string]: string;
}

// Image and file types
export interface ImageUpload {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  multiple: boolean;
}

// Language and localization types
export type Language = 'pt' | 'en' | 'es';

export interface LanguageConfig {
  code: Language;
  name: string;
  flag: string;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  primaryColor: string;
  accentColor: string;
}

// Route types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  protected?: boolean;
  roles?: string[];
}

// Hook return types
export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: FormErrors;
  touched: { [K in keyof T]?: boolean };
  isValid: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e: React.FormEvent) => void;
  reset: () => void;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackPageViews: boolean;
  trackClicks: boolean;
  trackFormSubmissions: boolean;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  thresholds: {
    loadTime: number;
    renderTime: number;
    apiResponse: number;
  };
}

// Security types
export interface SecurityConfig {
  csrfProtection: boolean;
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cors: {
    enabled: boolean;
    origins: string[];
  };
}

// Backup and recovery types
export interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention: number;
  location: 'local' | 'cloud';
}

export interface BackupStatus {
  lastBackup: string;
  nextBackup: string;
  status: 'success' | 'failed' | 'in_progress';
  size: number;
}

// Audit log types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

// System health types
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheck[];
  uptime: number;
  version: string;
}