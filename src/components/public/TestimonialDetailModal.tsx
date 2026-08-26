import React, { useEffect, useRef } from 'react';
import { X, Star, Sparkles, Calendar, Tag, HeartHandshake } from 'lucide-react';
import type { LocalTestimonial as SupabaseTestimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';

interface TestimonialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupabaseTestimonial | null;
}

const TestimonialDetailModal: React.FC<TestimonialDetailModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeButtonRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const rating = item.rating || 5;

  const getInitials = (name: string) => {
    if (!name) return 'BN';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="testimonial-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 transform animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com gradiente decorativo sutil */}
        <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 p-6 sm:p-7 border-b border-slate-100">
          {/* Botão de Fechar */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-white p-2 rounded-full shadow-xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Fechar depoimento"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-8">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {getInitials(item.name)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="testimonial-modal-title" className="text-xl font-bold text-[#2c3e50] truncate">
                  {item.name}
                </h3>
                {item.is_featured && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Destaque
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-sm text-blue-600 font-medium flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {item.event_type}
                </span>
                {item.event_name && (
                  <span className="text-slate-400">• {item.event_name}</span>
                )}
              </div>

              {/* Avaliação em estrelas */}
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs font-semibold text-slate-500 ml-1.5">
                  {rating}.0 / 5.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Corpo com scroll se o texto for muito grande */}
        <div className="p-6 sm:p-7 overflow-y-auto flex-grow space-y-4">
          <div className="relative bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-100">
            {/* Ícone de aspas gigantes */}
            <div className="text-blue-200 font-serif text-5xl leading-none absolute top-2 left-4 select-none opacity-60">
              “
            </div>
            
            <p className="relative z-10 text-slate-700 text-sm sm:text-base leading-relaxed italic whitespace-pre-line pt-2">
              {item.testimonial_text}
            </p>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <HeartHandshake className="w-4 h-4 text-blue-500" />
            <span>Depoimento verificado</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonialDetailModal;
