import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSupabaseImages } from '../../hooks/useSupabaseImages';
import { useAppSettings } from '../../hooks/useAppSettings';

const Hero: React.FC = () => {
  const { translations } = useLanguage();
  const { getActiveImages, loading } = useSupabaseImages();
  const { settings } = useAppSettings();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Obter apenas as imagens ativas e não deletadas do Supabase
  const activeImages = getActiveImages();
  const images = activeImages.map(image => image.file_url || `/images/${image.filename}`);
  
  // Fallback para caso nenhuma imagem esteja ativa ou ainda carregando
  const fallbackImages = ['/images/hero_1.png'];
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
    <section id="home" className="relative h-[60vh] min-h-[500px] flex items-center justify-center text-center text-white">
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
            className="w-full h-full object-fill"
          />
        </div>
      ))}
      
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-3 sm:mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>
          {translations.heroTitle}
          <br />
          <span className="text-blue-400">{translations.heroSubtitle}</span>
        </h1>
        <p className="text-sm xs:text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 px-2" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>
          {translations.heroDescription}
        </p>
        <a href="#contact" className="inline-block bg-blue-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-full text-base sm:text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
          {translations.heroCta}
        </a>
      </div>
      
      {/* Indicadores visuais (dots) */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 sm:space-x-3 z-20">
        {finalImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
              index === currentImageIndex
                ? 'bg-white scale-125'
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Ir para imagem ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
