import React from 'react';
import { Star, Sparkles, ArrowRight } from 'lucide-react';
import type { LocalTestimonial as SupabaseTestimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';

interface TestimonialCardProps {
  item: SupabaseTestimonial;
  onReadMore?: (item: SupabaseTestimonial) => void;
  className?: string;
}

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={`text-blue-100 ${className}`} 
    fill="currentColor" 
    viewBox="0 0 32 32"
    aria-hidden="true"
  >
    <path d="M9.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667zM29.333 22.667h-6.667v-8h6.667v-2.667c0-3.68 2.987-6.667 6.667-6.667h2.667v6.667h-2.667c-0.733 0-1.333 0.6-1.333 1.333v1.333h4l-1.333 8h-2.667v10.667h-6.667v-10.667z"></path>
  </svg>
);

const MAX_CHAR_LENGTH = 140;

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  item, 
  onReadMore,
  className = '' 
}) => {
  const text = item.testimonial_text || '';
  const isLongText = text.length > MAX_CHAR_LENGTH;
  const displayText = isLongText ? `${text.slice(0, MAX_CHAR_LENGTH).trim()}...` : text;
  const rating = item.rating || 5;

  const handleCardClick = () => {
    if (isLongText && onReadMore) {
      onReadMore(item);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'BN';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <div 
      onClick={isLongText && onReadMore ? handleCardClick : undefined}
      className={`group bg-white rounded-2xl border border-gray-100/90 shadow-md hover:shadow-xl transition-all duration-300 
                 p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between 
                 h-[260px] sm:h-[280px] w-full max-w-[340px] mx-auto select-none
                 ${isLongText && onReadMore ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Ícone de aspas decorativo de fundo */}
      <QuoteIcon className="absolute -top-1 -left-1 opacity-70 w-12 h-12 sm:w-14 sm:h-14 pointer-events-none group-hover:scale-105 transition-transform duration-300" />

      {/* Badge de Destaque */}
      {item.is_featured && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Destaque
          </span>
        </div>
      )}

      {/* Topo do card: Avaliação em estrelas */}
      <div className="relative z-10 flex items-center gap-1 mb-2 pt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              i < rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 fill-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Corpo: Texto do Depoimento */}
      <div className="relative z-10 flex-grow my-auto flex flex-col justify-center">
        <p className="text-gray-600 italic text-xs sm:text-sm leading-relaxed">
          &ldquo;{displayText}&rdquo;
        </p>

        {/* Link / Botão Leia Mais */}
        {isLongText && onReadMore && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReadMore(item);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 
                         transition-colors group-hover:gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-0.5"
              aria-label={`Ler depoimento completo de ${item.name}`}
            >
              <span>Leia mais</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Rodapé: Informações do Autor */}
      <div className="relative z-10 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 mt-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {getInitials(item.name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#2c3e50] text-xs sm:text-sm truncate leading-tight">
              {item.name}
            </p>
            <p className="text-[11px] sm:text-xs text-blue-600 font-medium truncate mt-0.5">
              {item.event_type}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
