import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LocalTestimonial as SupabaseTestimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import TestimonialCard from './TestimonialCard';
import TestimonialDetailModal from './TestimonialDetailModal';

interface TestimonialCarouselProps {
  testimonials: SupabaseTestimonial[];
  interval?: number; // Intervalo em milissegundos
}

const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({ 
  testimonials, 
  interval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<SupabaseTestimonial | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Determinar quantos cards mostrar por tela baseado no tamanho da tela
  const getCardsPerView = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 3; // lg: 3 cards
      if (window.innerWidth >= 640) return 2;  // sm/md: 2 cards
      return 1; // mobile: 1 card
    }
    return 3;
  };

  const [cardsPerView, setCardsPerView] = useState(getCardsPerView);

  // Atualizar cardsPerView quando a tela redimensionar
  useEffect(() => {
    const handleResize = () => {
      const newCardsPerView = getCardsPerView();
      setCardsPerView(newCardsPerView);
      // Ajustar currentIndex se necessário para evitar overflow
      setCurrentIndex(prevIndex => {
        const maxIndex = Math.max(0, testimonials.length - newCardsPerView);
        return Math.min(prevIndex, maxIndex);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [testimonials.length]);

  const maxIndex = Math.max(0, testimonials.length - cardsPerView);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= maxIndex ? 0 : prevIndex + 1
    );
  }, [maxIndex]);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex <= 0 ? maxIndex : prevIndex - 1
    );
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || isPaused || isDetailModalOpen || testimonials.length <= cardsPerView) return;

    const autoPlayInterval = setInterval(() => {
      nextSlide();
    }, interval);

    return () => clearInterval(autoPlayInterval);
  }, [isAutoPlaying, isPaused, isDetailModalOpen, interval, nextSlide, testimonials.length, cardsPerView]);

  // Pausar auto-play quando o mouse estiver sobre o carrossel
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handleReadMore = (testimonial: SupabaseTestimonial) => {
    setSelectedTestimonial(testimonial);
    setIsDetailModalOpen(true);
    setIsPaused(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTestimonial(null);
    setIsPaused(false);
  };

  if (testimonials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Nenhum depoimento disponível no momento.</p>
      </div>
    );
  }

  const gapValue = cardsPerView === 3 ? 16 : cardsPerView === 2 ? 16 : 0;

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto px-2 sm:px-8 py-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Container do carrossel */}
      <div className="overflow-hidden py-4 px-1">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
            width: `${(testimonials.length / cardsPerView) * 100}%`,
            columnGap: `${gapValue}px`
          }}
        >
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="flex-shrink-0 flex justify-center"
              style={{ 
                width: cardsPerView === 3 
                  ? `calc(${100 / testimonials.length}% - ${(gapValue * (testimonials.length - 1)) / testimonials.length}px)`
                  : cardsPerView === 2 
                  ? `calc(${100 / testimonials.length}% - ${(gapValue * (testimonials.length - 1)) / testimonials.length}px)`
                  : `${100 / testimonials.length}%`
              }}
            >
              <TestimonialCard 
                item={testimonial} 
                onReadMore={handleReadMore} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controles de navegação - apenas se houver mais cards do que cabem na tela */}
      {testimonials.length > cardsPerView && (
        <>
          {/* Botões de navegação */}
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-0 sm:-left-2 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm rounded-full p-2 sm:p-2.5 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-110 z-20 text-slate-700 hover:text-blue-600 border border-slate-100 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-0 sm:-right-2 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm rounded-full p-2 sm:p-2.5 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-110 z-20 text-slate-700 hover:text-blue-600 border border-slate-100 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Próximo depoimento"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </button>

          {/* Indicadores de posição (dots) */}
          <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 touch-manipulation ${
                    isActive
                      ? 'w-6 bg-blue-600'
                      : 'w-2 bg-gray-300 hover:bg-gray-400 cursor-pointer'
                  }`}
                  aria-label={`Ir para grupo de depoimentos ${index + 1}`}
                />
              );
            })}
          </div>

          {/* Controle de auto-play */}
          <div className="flex justify-center mt-2.5 sm:mt-3">
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200 px-3 py-1 rounded-full hover:bg-gray-200/50 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isAutoPlaying ? 'Pausar rotação automática dos depoimentos' : 'Ativar rotação automática dos depoimentos'}
            >
              {isAutoPlaying ? 'Pausar rotação automática' : 'Ativar rotação automática'}
            </button>
          </div>
        </>
      )}

      {/* Modal de Leitura Completa do Depoimento */}
      <TestimonialDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        item={selectedTestimonial}
      />
    </div>
  );
};

export default TestimonialCarousel;