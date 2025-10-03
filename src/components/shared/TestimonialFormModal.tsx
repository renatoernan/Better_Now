import React, { useState } from 'react';
import { X, Send, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { testimonialFormDataSchema, type TestimonialFormData } from '../../shared/types/schemas/validationSchemas';
import { useSupabaseTestimonials } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import { toast } from 'sonner';

interface TestimonialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({ isOpen, onClose }) => {
  const { createTestimonial, loading } = useSupabaseTestimonials();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialFormDataSchema),
    mode: 'onChange',
    defaultValues: {
      client_name: '',
      client_email: '',
      event_name: '',
      rating: 5,
      comment: '',
      event_type: ''
    }
  });

  const comment = watch('comment');
  const remainingChars = 1000 - (comment?.length || 0);

  const onSubmit = async (data: TestimonialFormData) => {
    try {
      setIsSubmitting(true);
      // Map TestimonialFormData to LocalTestimonialFormData
      const localData = {
        name: data.client_name,
        whatsapp: data.client_email, // Using email as placeholder for whatsapp
        event_type: data.event_type,
        testimonial_text: data.comment
      };
      await createTestimonial(localData);
      reset();
      toast.success('Depoimento enviado!', {
        description: 'Obrigado por compartilhar sua experiência. Seu depoimento será analisado em breve.',
        duration: 6000
      });
      onClose();
    } catch (error) {
      console.error('Erro ao enviar depoimento:', error);
      toast.error('Erro ao enviar depoimento', {
        description: 'Ocorreu um erro ao processar seu depoimento. Tente novamente.',
        duration: 8000
      });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#2c3e50]">
            Compartilhe sua Experiência
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
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">
              Seu Nome *
            </label>
            <input
              {...register('client_name')}
              type="text"
              id="client_name"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.client_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Digite seu nome completo"
              disabled={isSubmitting}
            />
            {errors.client_name && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.client_name.message}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-2">
              Seu Email *
            </label>
            <input
              {...register('client_email')}
              type="email"
              id="client_email"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.client_email ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="seu@email.com"
              disabled={isSubmitting}
            />
            {errors.client_email && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.client_email.message}</span>
              </div>
            )}
          </div>

          {/* Nome do Evento */}
          <div>
            <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Evento *
            </label>
            <input
              {...register('event_name')}
              type="text"
              id="event_name"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.event_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Nome do evento que você participou"
              disabled={isSubmitting}
            />
            {errors.event_name && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.event_name.message}</span>
              </div>
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
                errors.event_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Selecione o tipo de evento</option>
              <option value="Casamento">Casamento</option>
              <option value="Aniversário">Aniversário</option>
              <option value="Formatura">Formatura</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Infantil">Infantil</option>
              <option value="Debutante">Debutante</option>
              <option value="Outro">Outro</option>
            </select>
            {errors.event_type && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.event_type.message}</span>
              </div>
            )}
          </div>

          {/* Avaliação */}
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
              Avaliação *
            </label>
            <select
              {...register('rating', { valueAsNumber: true })}
              id="rating"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.rating ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value={5}>⭐⭐⭐⭐⭐ - Excelente</option>
              <option value={4}>⭐⭐⭐⭐ - Muito Bom</option>
              <option value={3}>⭐⭐⭐ - Bom</option>
              <option value={2}>⭐⭐ - Regular</option>
              <option value={1}>⭐ - Ruim</option>
            </select>
            {errors.rating && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.rating.message}</span>
              </div>
            )}
          </div>

          {/* Depoimento */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Seu Depoimento *
            </label>
            <textarea
              {...register('comment')}
              id="comment"
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                errors.comment ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Conte-nos sobre sua experiência conosco. Como foi o evento? O que mais gostou? Recomendaria nossos serviços?"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.comment && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.comment.message}</span>
                </div>
              )}
              <p className={`text-sm ml-auto ${
                remainingChars < 100 ? 'text-orange-600' : 
                remainingChars < 50 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {remainingChars} caracteres restantes
              </p>
            </div>
          </div>

          {/* Aviso sobre moderação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Seu depoimento será analisado por nossa equipe antes de ser publicado. 
              Isso garante a qualidade e autenticidade dos comentários em nosso site.
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
              disabled={isSubmitting || !isValid}
              className={`flex-1 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isSubmitting || !isValid
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Depoimento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestimonialFormModal;