import React from 'react';
import { serviceKeys, serviceIcons } from '../../../constants';
import type { ServiceItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const ServiceCard: React.FC<{ item: ServiceItem, iconPath: string }> = ({ item, iconPath }) => (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="mb-4 inline-block p-4 bg-blue-100 text-blue-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
        <p className="text-gray-600">{item.description}</p>
    </div>
);


const Services: React.FC = () => {
  const { translations } = useLanguage();

  return (
    <section id="services" className="py-20 bg-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.servicesTitle}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{translations.servicesSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {serviceKeys.map((key) => <ServiceCard key={key} item={translations.services[key]} iconPath={serviceIcons[key]} />)}
        </div>
      </div>
    </section>
  );
};

export default Services;
