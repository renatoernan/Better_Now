/**
 * Shared constants for Better Now application
 * @fileoverview Central constants and configuration values
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Supabase Configuration
export const SUPABASE_CONFIG = {
  STORAGE_BUCKET: 'event-images',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_QUALITY: 0.8,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LONG_TTL: 30 * 60 * 1000, // 30 minutes
  SHORT_TTL: 1 * 60 * 1000, // 1 minute
  MAX_CACHE_SIZE: 100,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// Form Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
} as const;

// Event Status
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// Contact Status
export const CONTACT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// Media Types
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
} as const;

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#64748B',
    ACCENT: '#F59E0B',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
  },
} as const;

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'better_now_auth_token',
  USER_PREFERENCES: 'better_now_user_preferences',
  LANGUAGE: 'better_now_language',
  THEME: 'better_now_theme',
  CACHE_PREFIX: 'better_now_cache_',
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  TIME: 'HH:mm',
} as const;

// File Upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 60,
  UPLOAD_REQUESTS_PER_HOUR: 10,
  LOGIN_ATTEMPTS_PER_HOUR: 5,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_PUSH_NOTIFICATIONS: false,
  ENABLE_DARK_MODE: true,
  ENABLE_OFFLINE_MODE: false,
} as const;

// Default Values
export const DEFAULTS = {
  EVENT_DURATION: 2, // hours
  MAX_PARTICIPANTS: 100,
  TESTIMONIAL_RATING: 5,
  NOTIFICATION_TIMEOUT: 5000, // ms
} as const;

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  URL: /^https?:\/\/.+/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

// Component Sizes
export const SIZES = {
  BUTTON: {
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
  },
  MODAL: {
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
  },
  AVATAR: {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  EXPIRATION_TIME: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiration
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
} as const;