import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { useSupabaseImages } from '../../shared/hooks/hooks/useSupabaseImages';
import { useAppSettings } from '../../shared/hooks/hooks/useAppSettings';

const Hero: React.FC = () => {
  const { translations } = useLanguage();
  const { getActiveImages, loading } = useSupabaseImages();
  const { settings } = useAppSettings();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Obter apenas as imagens ativas e não deletadas do Supabase
  const activeImages = getActiveImages();
  const images = activeImages.map(image => image.file_url || `/images/${image.filename}`);
  
  // Fallback para caso nenhuma imagem esteja ativa ou ainda carregando
  const fallbackImages = ['/images/hero-fallback.svg'];
  const finalImages = images.length > 0 ? images : fallbackImages;

  useEffect(() => {
    // Só inicia o carrossel automático se estiver habilitado nas configurações
    if (!settings.carousel_autoplay) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % finalImages.length);
    }, settings.carousel_interval || 5000);

    return () => clearInterval(interval);
  }, [finalImages.length, settings.carousel_autoplay, settings.carousel_interval]);

  return (
    <section 
      id="home" 
      className="relative min-h-[400px] h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] xl:h-[85vh] 
                 flex items-center justify-center text-center text-white 
                 pt-16 sm:pt-20 md:pt-24 lg:pt-28"
    >
      {/* Carrossel de imagens de fundo */}
      {finalImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image}
            alt={`Hero image ${index + 1}`}
            className="w-full h-full object-cover sm:object-fill"
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </div>
      ))}
      
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/40 sm:bg-black/50"></div>
      
      {/* Conteúdo principal - Mobile First */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Título principal */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 
                         font-bold leading-tight tracking-tight" 
              style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
            <span className="block mb-2 sm:mb-3">{translations.heroTitle}</span>
            <span className="block text-blue-300 sm:text-blue-400">{translations.heroSubtitle}</span>
          </h1>
          
          {/* Descrição */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 
                        max-w-3xl mx-auto leading-relaxed px-2 sm:px-4" 
             style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
            {translations.heroDescription}
          </p>
          
          {/* Call to Action */}
          <div className="pt-2 sm:pt-4">
            <a 
              href="#contact" 
              className="inline-block bg-blue-600 hover:bg-blue-700 
                         text-white font-bold 
                         py-3 px-6 sm:py-4 sm:px-8 lg:py-5 lg:px-10
                         text-sm sm:text-base lg:text-lg xl:text-xl
                         rounded-full 
                         transition-all duration-300 transform hover:scale-105 
                         shadow-lg hover:shadow-xl
                         focus:outline-none focus:ring-4 focus:ring-blue-300/50"
              aria-label="Solicitar orçamento"
            >
              {translations.heroCta}
            </a>
          </div>
        </div>
      </div>
      
      {/* Indicadores visuais (dots) - Mobile First */}
      {finalImages.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 
                        left-1/2 transform -translate-x-1/2 
                        flex space-x-2 sm:space-x-3 z-20">
          {finalImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 
                         rounded-full transition-all duration-300 
                         focus:outline-none focus:ring-2 focus:ring-white/50
                         ${index === currentImageIndex
                           ? 'bg-white scale-125 shadow-lg'
                           : 'bg-white/50 hover:bg-white/75 hover:scale-110'
                         }`}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;