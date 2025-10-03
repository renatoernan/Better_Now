import { z } from 'zod';

export const testimonialSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  whatsapp: z
    .string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(15, 'WhatsApp deve ter no máximo 15 dígitos')
    .regex(/^[\d\s\(\)\+\-]+$/, 'WhatsApp deve conter apenas números e símbolos válidos')
    .transform((val) => val.replace(/\D/g, '')), // Remove caracteres não numéricos
  
  event_type: z
    .string()
    .min(1, 'Selecione o tipo de evento')
    .max(50, 'Tipo de evento deve ter no máximo 50 caracteres'),
  
  testimonial_text: z
    .string()
    .min(10, 'Depoimento deve ter pelo menos 10 caracteres')
    .max(1000, 'Depoimento deve ter no máximo 1000 caracteres')
    .refine(
      (val) => val.trim().length >= 10,
      'Depoimento deve ter pelo menos 10 caracteres válidos'
    ),
  
  status: z
    .enum(['pending', 'approved', 'rejected'])
    .default('pending')
});

export type TestimonialFormData = z.infer<typeof testimonialSchema>;

// Opções de status
export const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' }
];

// Opções de tipos de eventos
export const eventTypeOptions = [
  { value: 'Casamento', label: 'Casamento' },
  { value: 'Festa Infantil', label: 'Festa Infantil' },
  { value: 'Aniversário', label: 'Aniversário' },
  { value: 'Evento Corporativo', label: 'Evento Corporativo' },
  { value: 'Formatura', label: 'Formatura' },
  { value: 'Chá de Bebê', label: 'Chá de Bebê' },
  { value: 'Chá de Panela', label: 'Chá de Panela' },
  { value: 'Evento Esportivo', label: 'Evento Esportivo' },
  { value: 'Confraternização', label: 'Confraternização' },
  { value: 'Outro', label: 'Outro' }
];