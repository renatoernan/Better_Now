import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Hero: React.FC = () => {
  const { translations } = useLanguage();

  return (
    <section id="home" className="relative h-screen flex items-center justify-center text-center text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/1920/1080?image=1018')" }}></div>
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative z-10 p-6">
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>
          {translations.heroTitle}
          <br />
          <span className="text-blue-400">{translations.heroSubtitle}</span>
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>
          {translations.heroDescription}
        </p>
        <a href="#contact" className="bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
          {translations.heroCta}
        </a>
      </div>
    </section>
  );
};

export default Hero;
