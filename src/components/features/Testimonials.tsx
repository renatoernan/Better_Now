import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useSupabaseTestimonials } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { useAppSettings } from '../../shared/hooks/hooks/useAppSettings';
import TestimonialFormModal from '../shared/TestimonialFormModal';
import TestimonialCarousel from '../public/TestimonialCarousel';
import type { Testimonial as SupabaseTestimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-200 ${className}`} 
    fill="currentColor" 
    viewBox="0 0 32 32"
    aria-hidden="true"
  >
    <path d="M9.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667zM29.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667z"></path>
  </svg>
);

const TestimonialCard: React.FC<{ item: SupabaseTestimonial }> = ({ item }) => (
  <div className="bg-white rounded-lg shadow-lg 
                  p-4 sm:p-6 lg:p-8 
                  relative overflow-hidden 
                  hover:shadow-xl transition-shadow duration-300
                  focus-within:ring-2 focus-within:ring-blue-300/50">
    {/* Ícone de aspas */}
    <QuoteIcon className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2" />
    
    {/* Texto do depoimento */}
    <p className="text-sm sm:text-base lg:text-lg 
                  text-gray-600 italic 
                  mb-4 sm:mb-6 
                  z-10 relative 
                  leading-relaxed">
      &quot;{item.testimonial_text}&quot;
    </p>
    
    {/* Informações do autor */}
    <div className="text-right">
      <p className="text-sm sm:text-base lg:text-lg 
                    font-bold text-[#2c3e50] 
                    leading-tight">
        {item.name}
      </p>
      <p className="text-xs sm:text-sm lg:text-base 
                    text-blue-600 
                    mt-1">
        {item.event_type}
      </p>
    </div>
    
    {/* Badge de destaque */}
    {item.is_featured && (
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
        <div className="bg-yellow-400 text-yellow-800 
                        px-2 py-1 
                        rounded-full 
                        text-xs font-semibold
                        shadow-sm">
          Destaque
        </div>
      </div>
    )}
  </div>
);

const Testimonials: React.FC = () => {
  const { translations } = useLanguage();
  const { approvedTestimonials, loading, fetchApprovedTestimonials } = useSupabaseTestimonials();
  const { settings } = useAppSettings();
  const [showModal, setShowModal] = useState(false);

  // Carregar depoimentos aprovados quando o componente monta
  useEffect(() => {
    fetchApprovedTestimonials();
  }, [fetchApprovedTestimonials]);

  // Determinar se deve usar carrossel ou layout fixo
  const shouldUseCarousel = approvedTestimonials.length > 3;
  const carouselInterval = settings?.testimonial_carousel_interval || 5000;

  return (
    <section 
      id="testimonials" 
      className="py-12 sm:py-16 lg:py-20 xl:py-24 
                 bg-gray-50 sm:bg-gray-100"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da seção - Mobile First */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 
                         font-bold text-[#2c3e50] 
                         mb-3 sm:mb-4 lg:mb-6 
                         leading-tight">
            {translations.testimonialsTitle}
          </h2>
          
          {/* Botão para adicionar depoimento - Mobile First */}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 
                       text-xs sm:text-sm lg:text-base 
                       text-blue-600 hover:text-blue-800 
                       transition-colors duration-200 
                       mt-2 sm:mt-3 lg:mt-4 
                       group
                       focus:outline-none focus:ring-2 focus:ring-blue-300/50 
                       rounded-md px-2 py-1"
            title="Compartilhe sua experiência conosco"
            aria-label="Adicionar novo depoimento"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 
                            group-hover:scale-110 
                            transition-transform" />
            <span className="underline-offset-4 group-hover:underline">
              Compartilhe sua experiência
            </span>
          </button>
        </div>
        
        {/* Conteúdo dos depoimentos - Mobile First */}
        {loading ? (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <div className="animate-spin rounded-full 
                            h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 
                            border-b-2 border-blue-600">
            </div>
          </div>
        ) : approvedTestimonials.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 
                          text-base sm:text-lg lg:text-xl 
                          leading-relaxed">
              Nenhum depoimento disponível no momento.
            </p>
          </div>
        ) : shouldUseCarousel ? (
          // Usar carrossel quando há mais de 3 depoimentos
          <div className="max-w-6xl mx-auto">
            <TestimonialCarousel 
              testimonials={approvedTestimonials} 
              interval={carouselInterval}
            />
          </div>
        ) : (
          // Layout fixo quando há 3 ou menos depoimentos - Mobile First
          <div className="grid grid-cols-1 
                          sm:grid-cols-2 
                          lg:grid-cols-3 
                          gap-4 sm:gap-6 lg:gap-8 
                          max-w-6xl mx-auto">
            {approvedTestimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} item={testimonial} />
            ))}
          </div>
        )}
      </div>
      
      {/* Modal do formulário */}
      <TestimonialFormModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </section>
  );
};

export default Testimonials;
