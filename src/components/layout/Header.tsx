import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import { useAppSettings } from '../../shared/hooks/hooks/useAppSettings';
import { Menu, X } from 'lucide-react';
import logoSrc from '../../assets/logo_better_now_h_white_transparente.png';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, translations } = useLanguage();
  const { settings } = useAppSettings();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/#services', label: translations.navServices },
    { href: '/#about', label: translations.navAbout },
    { href: '/#testimonials', label: translations.navTestimonials },
    { href: '/eventos', label: 'Eventos', isRoute: true },
  ];

  // Determinar se deve sempre mostrar o fundo
  const shouldAlwaysShowBackground = location.pathname.startsWith('/eventos');
  const headerBackground = shouldAlwaysShowBackground || isScrolled ? 'bg-[#2c3e50] shadow-lg' : 'bg-transparent';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBackground}`}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex justify-between items-center">
        {/* Logo - Mobile First */}
        <a href="#" className="flex items-center flex-shrink-0">
          <img 
            src={logoSrc} 
            alt={settings.site_title || "Better Now Logo"} 
            className={`h-12 sm:h-16 md:h-20 lg:h-24 transition-all duration-300 ${shouldAlwaysShowBackground || isScrolled ? 'brightness-0 invert' : ''}`} 
          />
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
          {navLinks.map((link) => (
            link.isRoute ? (
              <Link 
                key={link.href} 
                to={link.href} 
                className="text-white hover:text-blue-300 transition-colors duration-300 font-medium text-sm xl:text-base whitespace-nowrap"
              >
                {link.label}
              </Link>
            ) : (
              <a 
                key={link.href} 
                href={link.href} 
                className="text-white hover:text-blue-300 transition-colors duration-300 font-medium text-sm xl:text-base whitespace-nowrap"
              >
                {link.label}
              </a>
            )
          ))}
          <a 
            href="/#contact" 
            className="bg-blue-600 text-white font-bold py-2 px-3 xl:py-2 xl:px-4 rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 text-sm xl:text-base whitespace-nowrap"
          >
            {translations.navRequestQuote}
          </a>
          
          {/* Desktop Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center space-x-1 text-white text-sm font-medium hover:text-blue-300 transition-colors duration-300 px-2 xl:px-3 py-2 rounded-md border border-white/30 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Selecionar idioma"
              aria-expanded={isLanguageDropdownOpen}
              aria-haspopup="true"
            >
              <span>{language.toUpperCase()}</span>
              <svg className="w-3 h-3 xl:w-4 xl:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isLanguageDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-16 xl:w-20 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                role="menu"
                aria-label="Opções de idioma"
              >
                <button
                  onClick={() => { setLanguage('pt'); setIsLanguageDropdownOpen(false); }}
                  className={`block w-full text-left px-2 xl:px-3 py-2 text-xs xl:text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    language === 'pt' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                  role="menuitem"
                  aria-label="Português"
                >
                  PT
                </button>
                <button
                  onClick={() => { setLanguage('en'); setIsLanguageDropdownOpen(false); }}
                  className={`block w-full text-left px-2 xl:px-3 py-2 text-xs xl:text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                  role="menuitem"
                  aria-label="English"
                >
                  EN
                </button>
                <button
                  onClick={() => { setLanguage('es'); setIsLanguageDropdownOpen(false); }}
                  className={`block w-full text-left px-2 xl:px-3 py-2 text-xs xl:text-sm hover:bg-gray-100 transition-colors rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    language === 'es' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                  role="menuitem"
                  aria-label="Español"
                >
                  ES
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Alternar menu mobile"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Menu - Improved Mobile First */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#2c3e50] border-t border-white/10 shadow-lg">
          <div className="container mx-auto px-3 sm:px-4 py-4 space-y-2">
            {/* Navigation Links */}
            <nav className="space-y-1">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link 
                    key={link.href} 
                    to={link.href} 
                    className="block text-white hover:text-blue-300 hover:bg-white/5 transition-all duration-300 font-medium py-3 px-3 rounded-md border-b border-white/10 last:border-b-0"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a 
                    key={link.href} 
                    href={link.href} 
                    className="block text-white hover:text-blue-300 hover:bg-white/5 transition-all duration-300 font-medium py-3 px-3 rounded-md border-b border-white/10 last:border-b-0"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
            </nav>
            
            {/* CTA Button */}
            <a 
              href="/#contact" 
              className="block bg-blue-600 text-white font-bold py-3 px-4 rounded-full hover:bg-blue-700 transition-all duration-300 text-center mt-4 mx-3"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {translations.navRequestQuote}
            </a>
            
            {/* Mobile Language Selector */}
            <div className="pt-4 mt-4 border-t border-white/10 px-3">
              <p className="text-white text-sm font-medium mb-3">Idioma:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setLanguage('pt'); setIsMobileMenuOpen(false); }}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
                    language === 'pt' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  PT
                </button>
                <button
                  onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false); }}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
                    language === 'en' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => { setLanguage('es'); setIsMobileMenuOpen(false); }}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
                    language === 'es' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  ES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
