import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSupabaseTestimonials } from '../../hooks/useSupabaseTestimonials';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import TestimonialFormModal from '../shared/TestimonialFormModal';
import TestimonialCarousel from './TestimonialCarousel';
import type { Testimonial as SupabaseTestimonial } from '../../hooks/useSupabaseTestimonials';

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`h-12 w-12 text-blue-200 ${className}`} fill="currentColor" viewBox="0 0 32 32">
        <path d="M9.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667zM29.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667z"></path>
    </svg>
);

const TestimonialCard: React.FC<{ item: SupabaseTestimonial }> = ({ item }) => (
    <div className="bg-white rounded-lg shadow-lg p-8 relative overflow-hidden">
        <QuoteIcon className="absolute -top-2 -left-2" />
        <p className="text-gray-600 italic mb-6 z-10 relative">"{item.testimonial_text}"</p>
        <div className="text-right">
            <p className="font-bold text-[#2c3e50]">{item.name}</p>
            <p className="text-sm text-blue-600">{item.event_type}</p>
        </div>
        {item.is_featured && (
            <div className="absolute top-4 right-4">
                <div className="bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
                    Destaque
                </div>
            </div>
        )}
    </div>
);

const Testimonials: React.FC = () => {
  const { translations } = useLanguage();
  const { approvedTestimonials, loading } = useSupabaseTestimonials();
  const { settings } = useAppSettings();
  const [showModal, setShowModal] = useState(false);

  // Determinar se deve usar carrossel ou layout fixo
  const shouldUseCarousel = approvedTestimonials.length > 3;
  const carouselInterval = settings?.testimonial_carousel_interval || 5000;

  return (
    <section id="testimonials" className="py-20 bg-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.testimonialsTitle}</h2>
          
          {/* Botão discreto para adicionar depoimento */}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 mt-2 group"
            title="Compartilhe sua experiência conosco"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="underline-offset-4 group-hover:underline">
              Compartilhe sua experiência
            </span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : approvedTestimonials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum depoimento disponível no momento.</p>
          </div>
        ) : shouldUseCarousel ? (
          // Usar carrossel quando há mais de 3 depoimentos
          <TestimonialCarousel 
            testimonials={approvedTestimonials} 
            interval={carouselInterval}
          />
        ) : (
          // Layout fixo quando há 3 ou menos depoimentos
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
