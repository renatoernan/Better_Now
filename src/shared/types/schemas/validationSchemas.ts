/**
 * Zod validation schemas for Better Now application
 * @fileoverview Comprehensive validation schemas for all form data and API inputs
 */

import { z } from 'zod';

// Base schemas
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

// Event schemas
export const eventTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  is_active: z.boolean(),
});

export const scheduleItemSchema = z.object({
  id: z.string().uuid(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  activity: z.string().min(1, 'Atividade é obrigatória').max(200, 'Atividade muito longa'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
});

export const priceBatchSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  price: z.number().min(0, 'Preço deve ser positivo'),
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  sold_quantity: z.number().int().min(0, 'Quantidade vendida deve ser positiva'),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  is_active: z.boolean(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['end_date'],
});

export const eventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  basic_description: z.string().max(300, 'Descrição básica muito longa').optional(),
  detailed_description: z.string().optional(),
  event_date: z.string().datetime(),
  event_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido').optional(),
  location: z.string().min(1, 'Local é obrigatório').max(300, 'Local muito longo'),
  location_link: z.string().url('Link inválido').optional().or(z.literal('')),
  capacity: z.number().int().min(1, 'Capacidade deve ser pelo menos 1'),
  current_participants: z.number().int().min(0, 'Participantes atuais deve ser positivo'),
  images: z.array(z.string().url('URL de imagem inválida')),
  videos: z.array(z.string().url('URL de vídeo inválida')).optional(),
  event_type_id: z.string().uuid(),
  is_active: z.boolean(),
  allow_ticket_sales: z.boolean(),
  price_batches: z.array(priceBatchSchema).optional(),
  schedule: z.array(scheduleItemSchema).optional(),
});

// Client schemas
// Função para validar telefone internacional
const validateInternationalPhone = (phone: string): boolean => {
  if (!phone) return true; // Campo opcional
  
  // Se começar com +55, valida formato brasileiro
  if (phone.startsWith('+55')) {
    const cleanPhone = phone.replace(/\D/g, '');
    // +55 + DDD (2 dígitos) + número (8 ou 9 dígitos) = 13 ou 14 dígitos total
    return cleanPhone.length >= 13 && cleanPhone.length <= 14;
  }
  
  // Para outros países, valida formato internacional básico
  const cleanPhone = phone.replace(/\D/g, '');
  return phone.startsWith('+') && cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido').optional(),
  address: z.string().max(300, 'Endereço muito longo').optional(),
  numero: z.string().max(20, 'Número muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  zip_code: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  is_active: z.boolean(),
});

// Purchase schemas
export const paymentMethodSchema = z.enum(['pix', 'credit_card', 'debit_card']);
export const paymentStatusSchema = z.enum(['pending', 'paid', 'cancelled', 'refunded']);

export const purchaseSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  client_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  unit_price: z.number().min(0, 'Preço unitário deve ser positivo'),
  total_amount: z.number().min(0, 'Valor total deve ser positivo'),
  payment_method: paymentMethodSchema,
  payment_status: paymentStatusSchema,
  qr_codes: z.array(z.string()),
  checked_in_codes: z.array(z.string()),
});

// Testimonial schemas
export const testimonialStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const testimonialSchema = z.object({
  id: z.string().uuid(),
  client_name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  client_email: z.string().email('Email inválido'),
  event_name: z.string().min(1, 'Nome do evento é obrigatório').max(200, 'Nome muito longo'),
  rating: z.number().int().min(1, 'Avaliação mínima é 1').max(5, 'Avaliação máxima é 5'),
  comment: z.string().min(10, 'Comentário deve ter pelo menos 10 caracteres').max(1000, 'Comentário muito longo'),
  is_approved: z.boolean(),
  is_featured: z.boolean(),
  event_type: z.string().min(1, 'Tipo de evento é obrigatório'),
  status: testimonialStatusSchema,
});

// Contact form schemas
export const contactFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }),
  event_type: z.string().min(1, 'Tipo de evento é obrigatório').max(100, 'Tipo muito longo'),
  guests: z.number().int().min(1, 'Número de convidados deve ser pelo menos 1').max(1000, 'Número muito alto'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  message: z.string().max(2000, 'Mensagem muito longa').optional(),
  status: z.enum(['unread', 'read', 'responded']).default('unread'),
  response: z.string().max(2000, 'Resposta muito longa').optional(),
  responded_at: z.string().datetime().optional(),
});

// Form data schemas (for creation/update)
export const eventFormDataSchema = eventSchema.omit({
  id: true,
  current_participants: true,
}).extend({
  price_batches: z.array(priceBatchSchema.omit({
    id: true,
    event_id: true,
    sold_quantity: true,
  })).optional(),
  schedule: z.array(scheduleItemSchema.omit({ id: true })).optional(),
});

export const clientFormDataSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  apelido: z.string()
    .max(255, 'Apelido deve ter no máximo 255 caracteres')
    .optional(),
  whatsapp: z.string()
    .optional()
    .refine(validateInternationalPhone, {
      message: 'WhatsApp deve estar no formato internacional válido'
    }),
  email: z.string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Email deve ter um formato válido'
    }),
  cep: z.string()
    .optional()
    .refine((val) => !val || /^\d{5}-?\d{3}$/.test(val), {
      message: 'CEP deve estar no formato XXXXX-XXX'
    }),
  logradouro: z.string()
    .max(200, 'Logradouro deve ter no máximo 200 caracteres')
    .optional(),
  numero: z.string()
    .max(20, 'Número deve ter no máximo 20 caracteres')
    .optional(),
  complemento: z.string()
    .max(100, 'Complemento deve ter no máximo 100 caracteres')
    .optional(),
  bairro: z.string()
    .max(100, 'Bairro deve ter no máximo 100 caracteres')
    .optional(),
  cidade: z.string()
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .optional(),
  uf: z.string()
    .optional()
    .refine((val) => !val || /^[A-Z]{2}$/.test(val), {
      message: 'UF deve ter 2 letras maiúsculas'
    }),
  notes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional(),
  validated: z.boolean().default(true),
  phone: z.string().optional().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }),
  event_date: z.string().optional(),
  message: z.string().optional(),
}).refine((data) => {
  // Se logradouro está preenchido, número é obrigatório
  if (data.logradouro && data.logradouro.trim() && (!data.numero || !data.numero.trim())) {
    return false;
  }
  return true;
}, {
  message: 'Número é obrigatório quando logradouro está preenchido',
  path: ['numero']
});

export const testimonialFormDataSchema = testimonialSchema.omit({
  id: true,
  is_approved: true,
  is_featured: true,
  status: true,
});

export const contactFormDataSchema = contactFormSchema.omit({
  id: true,
  status: true,
  response: true,
  responded_at: true,
}).extend({
  phone: z.string().optional().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }),
  event_date: z.string().optional(),
  message: z.string().optional(),
});

// Filter schemas
export const eventFiltersSchema = z.object({
  search: z.string().optional(),
  event_type_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
  allow_ticket_sales: z.boolean().optional(),
});

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
});

// Pagination schemas
export const paginationParamsSchema = z.object({
  page: z.number().int().min(1, 'Página deve ser pelo menos 1'),
  limit: z.number().int().min(1, 'Limite deve ser pelo menos 1').max(100, 'Limite máximo é 100'),
});

export const sortParamsSchema = z.object({
  field: z.string().min(1, 'Campo de ordenação é obrigatório'),
  order: z.enum(['asc', 'desc']),
});

// Settings schemas
export const businessHoursSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  closed: z.boolean(),
});

// Admin Settings schemas por categoria
export const siteSettingsSchema = z.object({
  site_title: z.string().min(1, 'Título do site é obrigatório').max(100, 'Título muito longo'),
});

export const contactSettingsSchema = z.object({
  contact_email: z.string().email('Email inválido'),
  phone: z.string().optional().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }).or(z.literal('')),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').max(500, 'Endereço muito longo').optional().or(z.literal('')),
  social_instagram: z.string().regex(/^@[a-zA-Z0-9._]{1,30}$/, 'Instagram deve começar com @ e ter formato válido').optional().or(z.literal('')),
  social_whatsapp: z.string().regex(/^\+\d{10,15}$/, 'WhatsApp deve ter formato internacional (+5511999999999)').optional().or(z.literal('')),
});

export const businessHoursSettingsSchema = z.object({
  business_hours_weekdays: z.string().min(1, 'Horário de funcionamento é obrigatório').max(100, 'Horário muito longo'),
  business_hours_weekend: z.string().max(100, 'Horário muito longo').optional().or(z.literal('')),
  business_hours_closed_days: z.string().max(200, 'Dias fechados muito longo').optional().or(z.literal('')),
});

export const carouselSettingsSchema = z.object({
  carousel_autoplay: z.boolean(),
  carousel_interval: z.number().int().min(1, 'Intervalo mínimo é 1s').max(30, 'Intervalo máximo é 30s'),
  testimonial_carousel_interval: z.number().int().min(1, 'Intervalo mínimo é 1s').max(30, 'Intervalo máximo é 30s'),
});

export const systemSettingsSchema = z.object({
  max_file_size: z.number().int().min(1048576, 'Tamanho mínimo é 1MB').max(52428800, 'Tamanho máximo é 50MB'),
  allowed_file_types: z.array(z.string()).min(1, 'Selecione pelo menos um tipo de arquivo'),
  backup_retention_days: z.number().int().min(1, 'Mínimo 1 dia').max(365, 'Máximo 365 dias'),
  notification_email: z.string().email('Email inválido'),
});

export const appSettingsSchema = z.object({
  company_name: z.string().min(1, 'Nome da empresa é obrigatório').max(200, 'Nome muito longo'),
  company_email: z.string().email('Email inválido'),
  company_phone: z.string().refine(validateInternationalPhone, {
    message: 'Telefone deve estar no formato internacional válido'
  }),
  company_address: z.string().min(1, 'Endereço é obrigatório').max(500, 'Endereço muito longo'),
  business_hours: z.object({
    monday: businessHoursSchema,
    tuesday: businessHoursSchema,
    wednesday: businessHoursSchema,
    thursday: businessHoursSchema,
    friday: businessHoursSchema,
    saturday: businessHoursSchema,
    sunday: businessHoursSchema,
  }),
  testimonial_carousel_interval: z.number().int().min(1, 'Intervalo mínimo é 1s').max(30, 'Intervalo máximo é 30s'),
  max_file_size: z.number().int().min(1024, 'Tamanho mínimo é 1KB').max(10485760, 'Tamanho máximo é 10MB'),
  allowed_file_types: z.array(z.string()),
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().optional(),
  allowedTypes: z.array(z.string()).optional(),
});

export const imageUploadSchema = fileUploadSchema.extend({
  file: z.instanceof(File).refine(
    file => file.type.startsWith('image/'),
    'Arquivo deve ser uma imagem'
  ),
});

// Export schemas
export const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']),
  filename: z.string().optional(),
  includeHeaders: z.boolean().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

// Notification schemas
export const notificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
  type: z.enum(['info', 'success', 'warning', 'error']),
  timestamp: z.string().datetime(),
  read: z.boolean(),
  action: z.object({
    label: z.string().min(1, 'Label é obrigatório'),
    url: z.string().url('URL inválida'),
  }).optional(),
});

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const validateCPF = (cpf: string): boolean => {
  return z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).safeParse(cpf).success;
};

export const validateCNPJ = (cnpj: string): boolean => {
  return z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).safeParse(cnpj).success;
};

export const validatePhone = (phone: string): boolean => {
  return validateInternationalPhone(phone);
};

export const validateZipCode = (zipCode: string): boolean => {
  return z.string().regex(/^\d{5}-?\d{3}$/).safeParse(zipCode).success;
};

// Event Type schemas
export const eventTypeFormDataSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  icon: z.string()
    .min(1, 'Ícone é obrigatório'),
  active: z.boolean(),
});

// Type inference helpers
export type EventFormData = z.infer<typeof eventFormDataSchema>;
export type ClientFormData = z.infer<typeof clientFormDataSchema>;
export type TestimonialFormData = z.infer<typeof testimonialFormDataSchema>;
export type ContactFormData = z.infer<typeof contactFormDataSchema>;
export type EventTypeFormData = z.infer<typeof eventTypeFormDataSchema>;
export type EventFilters = z.infer<typeof eventFiltersSchema>;
export type ClientFilters = z.infer<typeof clientFiltersSchema>;
export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type SortParams = z.infer<typeof sortParamsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type ContactSettings = z.infer<typeof contactSettingsSchema>;
export type BusinessHoursSettings = z.infer<typeof businessHoursSettingsSchema>;
export type CarouselSettings = z.infer<typeof carouselSettingsSchema>;
export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
export type NotificationData = z.infer<typeof notificationSchema>;