import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Testimonial as SupabaseTestimonial } from '../../hooks/useSupabaseTestimonials';

interface TestimonialCarouselProps {
  testimonials: SupabaseTestimonial[];
  interval?: number; // Intervalo em milissegundos
}

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`text-blue-200 ${className}`} fill="currentColor" viewBox="0 0 32 32">
    <path d="M9.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667zM29.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667z"></path>
  </svg>
)

const TestimonialCard: React.FC<{ item: SupabaseTestimonial }> = ({ item }) => (
  <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-5 relative overflow-hidden h-full min-h-[180px] sm:min-h-[200px] flex flex-col">
    <QuoteIcon className="absolute -top-1 -left-1 opacity-40 h-8 w-8 sm:h-10 sm:w-10" />
    <p className="text-gray-600 italic mb-3 sm:mb-4 z-10 relative text-xs sm:text-sm lg:text-base leading-relaxed flex-grow">"{item.testimonial_text}"</p>
    <div className="text-right mt-auto">
      <p className="font-bold text-[#2c3e50] text-xs sm:text-sm lg:text-base">{item.name}</p>
      <p className="text-xs sm:text-xs lg:text-sm text-blue-600">{item.event_type}</p>
    </div>
    {item.is_featured && (
      <div className="absolute top-2 right-2">
        <div className="bg-yellow-400 text-yellow-800 px-1.5 py-0.5 rounded-full text-xs font-semibold">
          Destaque
        </div>
      </div>
    )}
  </div>
)

const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({ 
  testimonials, 
  interval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Determinar quantos cards mostrar por tela baseado no tamanho da tela
  const getCardsPerView = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 3; // lg: 3 cards
      if (window.innerWidth >= 768) return 2;  // md: 2 cards
      return 1; // sm: 1 card
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
    if (!isAutoPlaying || isPaused || testimonials.length <= cardsPerView) return;

    const autoPlayInterval = setInterval(() => {
      nextSlide();
    }, interval);

    return () => clearInterval(autoPlayInterval);
  }, [isAutoPlaying, isPaused, interval, nextSlide, testimonials.length, cardsPerView]);

  // Pausar auto-play quando o mouse estiver sobre o carrossel
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Obter depoimentos visíveis na tela atual
  const getVisibleTestimonials = () => {
    const endIndex = currentIndex + cardsPerView;
    return testimonials.slice(currentIndex, endIndex);
  };

  if (testimonials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Nenhum depoimento disponível no momento.</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Container do carrossel */}
      <div className="overflow-hidden px-2 sm:px-4">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
            width: `${(testimonials.length / cardsPerView) * 100}%`,
            gap: cardsPerView === 3 ? '1rem' : cardsPerView === 2 ? '1.5rem' : '2rem'
          }}
        >
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="flex-shrink-0"
              style={{ 
                width: cardsPerView === 3 
                  ? 'calc(33.333% - 0.667rem)' // (100% - 2rem gap total) / 3
                  : cardsPerView === 2 
                  ? 'calc(50% - 0.75rem)'     // (100% - 1.5rem gap total) / 2
                  : '100%'                     // Mobile: 1 card full width
              }}
            >
              <TestimonialCard item={testimonial} />
            </div>
          ))}
        </div>
      </div>

      {/* Controles de navegação - apenas se houver mais cards do que cabem na tela */}
      {testimonials.length > cardsPerView && (
        <>
          {/* Botões de navegação */}
          <button
            onClick={prevSlide}
            className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-10 touch-manipulation"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 sm:p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-10 touch-manipulation"
            aria-label="Próximo depoimento"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
          </button>

          {/* Indicadores de posição */}
          <div className="flex justify-center mt-6 sm:mt-8 space-x-2">
            {testimonials.map((_, index) => {
              const isVisible = index >= currentIndex && index < currentIndex + cardsPerView;
              const isClickable = index <= maxIndex;
              return (
                <button
                  key={index}
                  onClick={() => isClickable && goToIndex(index)}
                  disabled={!isClickable}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-200 touch-manipulation ${
                    isVisible
                      ? 'bg-blue-600 scale-110'
                      : isClickable
                      ? 'bg-gray-300 hover:bg-gray-400 cursor-pointer'
                      : 'bg-gray-200 cursor-not-allowed'
                  }`}
                  aria-label={`Ir para depoimento ${index + 1}`}
                />
              );
            })}
          </div>

          {/* Controle de auto-play */}
          <div className="flex justify-center mt-3 sm:mt-4">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 px-3 py-1 rounded-full hover:bg-gray-100 touch-manipulation"
            >
              {isAutoPlaying ? 'Pausar rotação automática' : 'Ativar rotação automática'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TestimonialCarousel;