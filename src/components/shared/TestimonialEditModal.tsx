import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { testimonialSchema, eventTypeOptions, statusOptions } from '../../shared/types/schemas/testimonialSchema';
import { useSupabaseTestimonials } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import type { TestimonialFormData, Testimonial } from '../../shared/types/schemas/testimonialSchema';

interface TestimonialEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  testimonial: Testimonial | null;
  onSave?: () => void;
}

const TestimonialEditModal: React.FC<TestimonialEditModalProps> = ({ isOpen, onClose, testimonial, onSave }) => {
  const { updateTestimonial, loading } = useSupabaseTestimonials();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
      event_type: '',
      testimonial_text: '',
      status: 'pending'
    }
  });

  const testimonialText = watch('testimonial_text');
  const remainingChars = 1000 - (testimonialText?.length || 0);

  // Preencher formulário quando o depoimento for carregado
  useEffect(() => {
    if (testimonial && isOpen) {
      setValue('name', testimonial.name);
      setValue('whatsapp', testimonial.whatsapp);
      setValue('event_type', testimonial.event_type);
      setValue('testimonial_text', testimonial.testimonial_text);
      setValue('status', testimonial.status);
    }
  }, [testimonial, isOpen, setValue]);

  const onSubmit = async (data: TestimonialFormData) => {
    if (!testimonial) return;
    
    try {
      setIsSubmitting(true);
      await updateTestimonial(testimonial.id, data);
      onSave?.(); // Chama o callback para re-renderizar a lista
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar depoimento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!isOpen || !testimonial) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#2c3e50]">
            Editar Depoimento
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Digite o nome completo"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp *
            </label>
            <input
              {...register('whatsapp')}
              type="tel"
              id="whatsapp"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.whatsapp ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(11) 99999-9999"
              disabled={isSubmitting}
            />
            {errors.whatsapp && (
              <p className="mt-1 text-sm text-red-600">{errors.whatsapp.message}</p>
            )}
          </div>

          {/* Tipo de Evento */}
          <div>
            <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento *
            </label>
            <select
              {...register('event_type')}
              id="event_type"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.event_type ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Selecione o tipo de evento</option>
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.event_type && (
              <p className="mt-1 text-sm text-red-600">{errors.event_type.message}</p>
            )}
          </div>

          {/* Depoimento */}
          <div>
            <label htmlFor="testimonial_text" className="block text-sm font-medium text-gray-700 mb-2">
              Depoimento *
            </label>
            <textarea
              {...register('testimonial_text')}
              id="testimonial_text"
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                errors.testimonial_text ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Conte-nos sobre sua experiência conosco. Como foi o evento? O que mais gostou? Recomendaria nossos serviços?"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.testimonial_text && (
                <p className="text-sm text-red-600">{errors.testimonial_text.message}</p>
              )}
              <p className={`text-sm ml-auto ${
                remainingChars < 100 ? 'text-orange-600' : 
                remainingChars < 50 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {remainingChars} caracteres restantes
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              {...register('status')}
              id="status"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          {/* Status do depoimento */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Status atual:</strong> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                testimonial.status === 'approved' ? 'bg-green-100 text-green-800' :
                testimonial.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {testimonial.status === 'approved' ? 'Aprovado' :
                 testimonial.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
              </span>
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestimonialEditModal;