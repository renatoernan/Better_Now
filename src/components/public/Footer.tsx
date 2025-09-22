
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import cesireLogo from '../../assets/logo_cesire_fundo_escuro_com_sombra.png';

const Footer: React.FC = () => {
  const { translations } = useLanguage();
  const { settings } = useAppSettings();

  return (
    <footer className="bg-[#2c3e50] text-white py-6">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          
          {/* Informações de Contato */}
          <div className="space-y-2">
            <h3 className="text-lg flex justify-center font-bold text-blue-300 mb-2">{translations.contactInfo}</h3>
            
            <div className="flex items-center space-x-2 hover:text-blue-300 transition-colors duration-300">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-3 h-3" />
              </div>
              <div>
                <a href={`mailto:${settings.contact_email}`} className="text-sm hover:text-blue-300 transition-colors">
                  {settings.contact_email}
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 hover:text-blue-300 transition-colors duration-300">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-3 h-3" />
              </div>
              <div>
                <a href={`tel:${settings.phone?.replace(/\D/g, '') || ''}`} className="text-sm hover:text-blue-300 transition-colors">
                  {settings.phone}
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3" />
              </div>
              <div>
                <p className="text-sm">{settings.address}</p>
              </div>
            </div>
          </div>
          
          {/* Horário de Atendimento */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-blue-300 mb-2">{translations.businessHours}</h3>
            
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3 h-3" />
              </div>
              <div className="space-y-1">
                {settings.business_hours_weekdays && (
                  <p className="text-sm">
                    <span className="text-gray-300">{translations.mondayToFriday}:</span> {settings.business_hours_weekdays}
                  </p>
                )}
                {settings.business_hours_weekend && (
                  <p className="text-sm">
                    <span className="text-gray-300">{translations.saturday}:</span> {settings.business_hours_weekend}
                  </p>
                )}
                {settings.business_hours_closed_days && (
                  <p className="text-sm text-red-300">{settings.business_hours_closed_days}</p>
                )}
                {!settings.business_hours_weekdays && !settings.business_hours_weekend && (
                  <div className="space-y-0.5">
                    <p className="text-sm">{translations.mondayToFriday}: 8h às 18h</p>
                    <p className="text-sm">{translations.saturday}: 8h às 12h</p>
                    <p className="text-sm text-red-300">{translations.sundaysAndHolidays}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Redes Sociais */}
          <div className="space-y-2">
            <h3 className="text-lg flex justify-center font-bold text-blue-300 mb-2">{translations.followUs}</h3>
            
            <div className="flex justify-center">
              <a
                href="https://www.instagram.com/betternow_eventos/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={translations.followUsInstagram}
                className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full hover:scale-110 transition-transform duration-300 group"
              >
                <svg
                  className="w-5 h-5 text-white group-hover:text-gray-100 transition-colors duration-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Desenvolvido por CESIRE */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-blue-300 mb-2">Desenvolvido por</h3>
            
            <div className="flex items-center space-x-2">
              <a 
                href="https://www.cesire.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-300 group"
                title="Desenvolvido por CESIRE"
              >
                <img 
                  src={cesireLogo} 
                  alt="CESIRE - Desenvolvedor" 
                  className="h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'inline';
                  }}
                />
                <span className="text-sm text-blue-300 hover:text-blue-200 transition-colors font-medium" style={{display: 'none'}}>CESIRE</span>
              </a>
            </div>
            
            <p className="text-xs text-gray-400">Tecnologia e Inovação</p>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-600 pt-3 text-center">
          <p className="text-sm">&copy; {new Date().getFullYear()} {translations.footerCopyright}</p>
          <p className="text-xs text-gray-400 mt-1">{translations.footerTagline}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
