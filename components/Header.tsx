import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Base64 encoded logo
const logoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAACDCAYAAAC0TjJeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAHplSURBVHgB7J0JXBxV1sc3FwWJAEGIkAQgqgCKIlZstbHWWrG1VqutVqut1lpbrLG1VqutVqutrY211g7WWrG11tpijYg6AIog4AICggiyIAIguSD3Jff3/TO7293Z3d3d3d3ZzLw8j0dmd2d2ZubcM++cmZlHSElJSBCTlBSJISVFRpCSAjUkB5CMpCQUkpyoIjlZSWZSSjKTlpScnCQ5JclKkpGclJycLClJaUomJSVZUnKyFBUpISWpISVpISUpKSnJSUpKSkJSUpLkJCUJSUpCUhKSkpQUJcUlKcmJS/JLclKyS7LzS3LyclNS8nPTC3MK8nLzC3MKCzLys/KLcnPyC/Pz8nMLCvNy8gvzC/IL8gvKCvPzCgry8gtL8gvL8wvL8wvL8gsLCvIKC/Pz8gtL8gsLCnMKCvMLC/MKC/PzCgvzCwvzCwsKC/Pz8gtzc/MLC/ML8gvzC/ILCwvzCgvz8/ILS/IK8gvzC/PzC/Pz8/Nz8/PzCgvL8/MKCvMLC/MKC/MK8vMLC/MLC/MLC/MKC/ML8gvL8/OL8vNzC/IL8gvL8wsL8/Pz8/MLC/MLCgvzCwsL8/MK8vNz8/NzCgvz8/PzC/ML8gvL8wvzC/MLC/MLC/ML8gvL8wsLCvPzC/NzC/Pz8wsL8/MLCwsLC/ML8gvz8/PzC/MLCwsL8/PzC/PzCwvL8wsLCvMLCgvL8/Pz8wsLC/MLC/MLC/MLCwsLCwsL8wsL8wsL8wsLC/ML8wsLCwvz8/Pz8/Pz8/Pz8/Pz8wsLCwsL8wsLC/PzCwsL8wsLC/PzC/MLCwsL8wsLC/PzC/ML8/PzCwvzCwvzCwvzC/PzCwvzCwvL8/MLC/PzCwsL8/MLCwsL8/MLCwvzCwvzCwvz8wvL8/MLC/PzCwsL8/MLCwsL8/MLCwsLC/MLCwvz8wvzC/MLCwsLCwsL8/PzCwvz8/PzCwsL8wsLC/MLCwsL8wsLCwvzC/MLCwvzCwvzCwsL8/PzCwvzCwsL8wsLC/PzCwvzCwvz8wvzCwsL8wsL8/MLCwvz8/PzCwsL8wvL8wsL8wvz8wsL8/MLCwvL8/Pz8/MLCwvz8wsL8/MLCwsL8/MLCwsL8wvz8wvzCwvzCwvzCwvL8/Pz8/Pz8/PzCwvzCwvz8wsL8wvzCwvzCwvzCwvzCwvz8wsL8/MLC/MLC/Pz8/PzCwvL8/MLCwvzCwvzCwvzCwvzCwvzCwvzCwvz8/PzCwvzCwvzCwvzCwvzCwvzCwvzC/MLC/MLC/MLCwsLC/MLCwvzCwvzCwvz8wvzCwvL8/MLC/MLCwsL8wsL8wsL8wsL8/PzCwvz8wvzCwsL8wsL8wsL8wsL8/MLCwsL8wvz8wvL8/MLC/MLC/PzCwsLC/PzCwsLC/MLC/MLC/PzCwvzCwsL8/MLC/MLC/MLCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwsLC/MLCwvzCwvzCwvzCwvzCwvzCwvzCwsL8wsL8wsL8/MLCwvzCwvzCwsL8wsL8wsL8wsL8/PzCwvzCwvzCwsL8wsL8wsL8wsL8wsL8wvzC/MLC/MLC/MLC/MLC/MLCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzC/MLC/MLCwvzCwvzCwsL8wsL8wsL8wsL8/MLC/MLC/MLC/PzCwvzCwvz8/Pz8wsL8wvzCwvzC/MLC/PzC/MLC/PzC/MLC/PzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwsL8/MLC/MLCwvzCwvzC/MLC/MLCwvzCwvzCwvzCwsL8/MLC/MLCwvzCwvzCwsL8wsL8wvzCwsL8wvzCwsL8wsLCwsL8wsL8/MLC/PzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwvzCwsLC/PzCwvz8wvzCgvL8/PzCwvL8wsL8wvzCwvzCwvzCgvz8gvL8vOLC/MKCvMKCvILCvNz8vPzC/MKCzNKS/JLcnIyS3OTU/JzM/PzMguKczJLc3JLcnNzS/KLSnOzS/KzSjKySrJLcjMKSjMK8jKLcjKLcpKLcjKLc0pyc/OyS/JKCrMzczNyc7Jz80pySjPycnNyCnJyCnMzczPzMvNKSjIKcnPzMvKKSguLi7OyczMyC/NLcjPLcjPLc/PL8vPL8gtLS/JzCjOKcjLLczMLcjMLc/MLc/MLc/MLc/OLc/MLc/MLc/OLc/MLc/OLC/MLc/OLc/MLc/OLc/MLc/OLC/MLC/MLC/MLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/MLc/OLc/OLc/OLc/OLc/MLc/OLc/OLc/OLc/OLc/OLc/MLc/OLc/OLc/MLc/OLc/MLc/OLc/OLc/OLc/OLc/MLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/MLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/OLc/-Dk8UAAAAASUVORK5-Dk8UAAAAASUVORK5"
];
const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, toggleLanguage, translations } = useLanguage();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const navLinks = [
    { href: '#services', label: translations.navServices },
    { href: '#about', label: translations.navAbout },
    { href: '#testimonials', label: translations.navTestimonials },
  ];
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#2c3e50] shadow-lg' : 'bg-transparent'}`}>
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <a href="#" className="flex items-center">
            <img 
                src={logoSrc} 
                alt="Better Now Logo" 
                className={`h-12 transition-all duration-300 ${isScrolled ? 'brightness-0 invert' : ''}`} 
            />
        </a>
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-white hover:text-blue-300 transition-colors duration-300 font-medium">
              {link.label}
            </a>
          ))}
          <a href="#contact" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
            {translations.navRequestQuote}
          </a>
           <div className="flex items-center space-x-2 text-white text-sm">
              <span className={`font-medium ${language === 'pt' ? 'font-bold' : 'opacity-70'}`}>PT</span>
              <button
                  onClick={toggleLanguage}
                  type="button"
                  aria-pressed={language === 'en'}
                  aria-label="Toggle language between Portuguese and English"
                  className={`${
                  language === 'en' ? 'bg-blue-600' : 'bg-white/30'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#2c3e50]`}
              >
                  <span
                  aria-hidden="true"
                  className={`${
                      language === 'en' ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
              </button>
              <span className={`font-medium ${language === 'en' ? 'font-bold' : 'opacity-70'}`}>EN</span>
          </div>
        </nav>
        {/* Mobile menu could be added here */}
      </div>
    </header>
  );
};
export default Header;
