export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Validação para email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação para telefone (formato brasileiro)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Validação para WhatsApp (formato internacional)
export const validateWhatsApp = (whatsapp: string): boolean => {
  const whatsappRegex = /^\+\d{10,15}$/;
  return whatsappRegex.test(whatsapp.replace(/\s/g, ''));
};

// Validação para Instagram (formato @usuario)
export const validateInstagram = (instagram: string): boolean => {
  if (!instagram) return true; // Campo opcional
  const instagramRegex = /^@[a-zA-Z0-9._]{1,30}$/;
  return instagramRegex.test(instagram);
};

// Validação para tamanho de arquivo (em bytes)
export const validateFileSize = (size: number): boolean => {
  const minSize = 1024 * 1024; // 1MB
  const maxSize = 50 * 1024 * 1024; // 50MB
  return size >= minSize && size <= maxSize;
};

// Validação para intervalo do carousel (em segundos)
export const validateCarouselInterval = (interval: number): boolean => {
  return interval >= 1 && interval <= 30;
};

// Validação para dias de retenção de backup
export const validateBackupRetention = (days: number): boolean => {
  return days >= 1 && days <= 365;
};

// Validação completa das configurações do site
export const validateSiteSettings = (data: {
  site_title?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.site_title || data.site_title.trim().length === 0) {
    errors.push({
      field: 'site_title',
      message: 'O título do site é obrigatório'
    });
  } else if (data.site_title.length > 100) {
    errors.push({
      field: 'site_title',
      message: 'O título do site deve ter no máximo 100 caracteres'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validação completa das configurações de contato
export const validateContactSettings = (data: {
  contact_email?: string;
  phone?: string;
  address?: string;
  social_instagram?: string;
  social_whatsapp?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Email de contato (obrigatório)
  if (!data.contact_email || data.contact_email.trim().length === 0) {
    errors.push({
      field: 'contact_email',
      message: 'O email de contato é obrigatório'
    });
  } else if (!validateEmail(data.contact_email)) {
    errors.push({
      field: 'contact_email',
      message: 'Digite um email válido'
    });
  }

  // Telefone (opcional, mas se preenchido deve ser válido)
  if (data.phone && !validatePhone(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Digite um telefone válido (ex: +55 11 99999-9999)'
    });
  }

  // Endereço (opcional, mas se preenchido deve ter pelo menos 5 caracteres)
  if (data.address && data.address.trim().length < 5) {
    errors.push({
      field: 'address',
      message: 'O endereço deve ter pelo menos 5 caracteres'
    });
  }

  // Instagram (opcional, mas se preenchido deve ser válido)
  if (data.social_instagram && !validateInstagram(data.social_instagram)) {
    errors.push({
      field: 'social_instagram',
      message: 'Digite um usuário válido do Instagram (ex: @usuario)'
    });
  }

  // WhatsApp (opcional, mas se preenchido deve ser válido)
  if (data.social_whatsapp && !validateWhatsApp(data.social_whatsapp)) {
    errors.push({
      field: 'social_whatsapp',
      message: 'Digite um WhatsApp válido (ex: +5511999999999)'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validação completa das configurações do carousel
export const validateCarouselSettings = (data: {
  carousel_autoplay?: boolean;
  carousel_interval?: number;
  testimonial_carousel_interval?: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Intervalo do carousel
  if (data.carousel_interval !== undefined && !validateCarouselInterval(data.carousel_interval)) {
    errors.push({
      field: 'carousel_interval',
      message: 'O intervalo deve estar entre 1s e 10s'
    });
  }

  // Intervalo do carousel de depoimentos
  if (data.testimonial_carousel_interval !== undefined && !validateCarouselInterval(data.testimonial_carousel_interval)) {
    errors.push({
      field: 'testimonial_carousel_interval',
      message: 'O intervalo deve estar entre 1s e 10s'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validação completa das configurações do sistema
export const validateSystemSettings = (data: {
  max_file_size?: number;
  allowed_file_types?: string[];
  backup_retention_days?: number;
  notification_email?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Tamanho máximo de arquivo
  if (data.max_file_size !== undefined && !validateFileSize(data.max_file_size)) {
    errors.push({
      field: 'max_file_size',
      message: 'O tamanho máximo deve estar entre 1MB e 50MB'
    });
  }

  // Tipos de arquivo permitidos
  if (data.allowed_file_types && data.allowed_file_types.length === 0) {
    errors.push({
      field: 'allowed_file_types',
      message: 'Selecione pelo menos um tipo de arquivo'
    });
  }

  // Dias de retenção de backup
  if (data.backup_retention_days !== undefined && !validateBackupRetention(data.backup_retention_days)) {
    errors.push({
      field: 'backup_retention_days',
      message: 'Os dias de retenção devem estar entre 1 e 365'
    });
  }

  // Email de notificação (opcional, mas se preenchido deve ser válido)
  if (data.notification_email && !validateEmail(data.notification_email)) {
    errors.push({
      field: 'notification_email',
      message: 'Digite um email válido para notificações'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Função principal de validação por categoria
export const validateSettingsByCategory = (
  category: 'site' | 'contact' | 'carousel' | 'system',
  data: any
): ValidationResult => {
  switch (category) {
    case 'site':
      return validateSiteSettings(data);
    case 'contact':
      return validateContactSettings(data);
    case 'carousel':
      return validateCarouselSettings(data);
    case 'system':
      return validateSystemSettings(data);
    default:
      return { isValid: true, errors: [] };
  }
};