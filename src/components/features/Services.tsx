import React from 'react';
import { serviceKeys, serviceIcons } from '../../../constants';
import type { ServiceItem } from '../../types';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';

const ServiceCard: React.FC<{ item: ServiceItem, iconPath: string }> = ({ item, iconPath }) => (
  <div className="bg-white rounded-lg shadow-lg 
                  p-4 sm:p-6 lg:p-8 
                  text-center 
                  transform hover:-translate-y-2 
                  transition-all duration-300 
                  hover:shadow-xl
                  focus-within:ring-2 focus-within:ring-blue-300/50">
    {/* Ícone */}
    <div className="mb-3 sm:mb-4 inline-block 
                    p-3 sm:p-4 
                    bg-blue-100 text-blue-600 
                    rounded-full">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-6 w-6 sm:h-8 sm:w-8" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
    </div>
    
    {/* Título */}
    <h3 className="text-lg sm:text-xl lg:text-2xl 
                   font-bold text-gray-800 
                   mb-2 sm:mb-3 
                   leading-tight">
      {item.title}
    </h3>
    
    {/* Descrição */}
    <p className="text-sm sm:text-base 
                  text-gray-600 
                  leading-relaxed">
      {item.description}
    </p>
  </div>
);

const Services: React.FC = () => {
  const { translations } = useLanguage();

  return (
    <section 
      id="services" 
      className="py-12 sm:py-16 lg:py-20 xl:py-24 
                 bg-gray-50 sm:bg-gray-100"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da seção - Mobile First */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 
                         font-bold text-[#2c3e50] 
                         mb-3 sm:mb-4 lg:mb-6 
                         leading-tight">
            {translations.servicesTitle}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl 
                        text-gray-600 
                        max-w-xl sm:max-w-2xl lg:max-w-3xl 
                        mx-auto 
                        leading-relaxed 
                        px-2 sm:px-4">
            {translations.servicesSubtitle}
          </p>
        </div>
        
        {/* Grid de serviços - Mobile First */}
        <div className="grid grid-cols-1 
                        sm:grid-cols-2 
                        lg:grid-cols-3 
                        xl:grid-cols-4 
                        gap-4 sm:gap-6 lg:gap-8 
                        max-w-7xl mx-auto">
          {serviceKeys.map((key) => (
            <ServiceCard 
              key={key} 
              item={translations.services[key]} 
              iconPath={serviceIcons[key]} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;