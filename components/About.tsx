import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const About: React.FC = () => {
  const { translations } = useLanguage();
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/3">
            <img src="https://picsum.photos/seed/roberta/400/400" alt="Roberta Forte" className="rounded-full shadow-2xl mx-auto w-64 h-64 md:w-full md:h-auto object-cover border-8 border-blue-100" />
          </div>
          <div className="md:w-2/3 text-center md:text-left">
            <h2 className="text-4xl font-bold text-[#2c3e50] mb-4">{translations.aboutTitle}</h2>
            <p className="text-lg text-blue-600 font-semibold mb-6">{translations.aboutSubtitle}</p>
            <p className="text-gray-600 leading-relaxed mb-4">
              {translations.aboutParagraph1}
            </p>
            <p className="text-gray-600 leading-relaxed">
             {translations.aboutParagraph2}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
