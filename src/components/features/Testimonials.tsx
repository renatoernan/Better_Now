import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useSupabaseTestimonials } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { useAppSettings } from '../../shared/hooks/hooks/useAppSettings';
import TestimonialFormModal from '../shared/TestimonialFormModal';
import TestimonialCarousel from '../public/TestimonialCarousel';
import TestimonialCard from '../public/TestimonialCard';
import TestimonialDetailModal from '../public/TestimonialDetailModal';
import type { LocalTestimonial as SupabaseTestimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';

const Testimonials: React.FC = () => {
  const { translations } = useLanguage();
  const { approvedTestimonials, loading, fetchApprovedTestimonials } = useSupabaseTestimonials();
  const { settings } = useAppSettings();
  const [showModal, setShowModal] = useState(false);
  const [selectedDetailTestimonial, setSelectedDetailTestimonial] = useState<SupabaseTestimonial | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Carregar depoimentos aprovados quando o componente monta
  useEffect(() => {
    fetchApprovedTestimonials();
  }, [fetchApprovedTestimonials]);

  // Determinar se deve usar carrossel ou layout fixo
  const shouldUseCarousel = approvedTestimonials.length > 3;
  const carouselInterval = settings?.testimonial_carousel_interval || 5000;

  const handleOpenDetailModal = (testimonial: SupabaseTestimonial) => {
    setSelectedDetailTestimonial(testimonial);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDetailTestimonial(null);
  };

  return (
    <section 
      id="testimonials" 
      className="py-12 sm:py-16 lg:py-20 xl:py-24 
                 bg-gray-50 sm:bg-gray-100"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da seção */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 
                         font-bold text-[#2c3e50] 
                         mb-3 sm:mb-4 lg:mb-6 
                         leading-tight">
            {translations.testimonialsTitle}
          </h2>
          
          {/* Botão para adicionar depoimento */}
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
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 
                            group-hover:scale-110 
                            transition-transform" />
            <span className="underline-offset-4 group-hover:underline">
              Compartilhe sua experiência
            </span>
          </button>
        </div>
        
        {/* Conteúdo dos depoimentos */}
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
          <div className="max-w-5xl mx-auto">
            <TestimonialCarousel 
              testimonials={approvedTestimonials} 
              interval={carouselInterval}
            />
          </div>
        ) : (
          // Layout fixo centralizado quando há 3 ou menos depoimentos
          <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
            {approvedTestimonials.map((testimonial) => (
              <div 
                key={testimonial.id}
                className="w-full sm:w-[320px] md:w-[340px]"
              >
                <TestimonialCard 
                  item={testimonial} 
                  onReadMore={handleOpenDetailModal}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal do formulário de envio de depoimento */}
      <TestimonialFormModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      {/* Modal premium de leitura completa para o modo de layout fixo */}
      <TestimonialDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        item={selectedDetailTestimonial}
      />
    </section>
  );
};

export default Testimonials;
