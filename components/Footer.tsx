
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { translations } = useLanguage();
  return (
    <footer className="bg-[#2c3e50] text-white py-8">
      <div className="container mx-auto px-6 text-center">
        <p>&copy; {new Date().getFullYear()} {translations.footerCopyright}</p>
        <p className="text-sm text-gray-400 mt-2">{translations.footerTagline}</p>
      </div>
    </footer>
  );
};

export default Footer;
