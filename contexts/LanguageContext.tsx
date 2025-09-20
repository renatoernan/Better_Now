
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations } from '../translations';

type Language = 'en' | 'pt';
type Translations = typeof translations.pt;

interface LanguageContextType {
    language: Language;
    translations: Translations;
    toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('pt'); // Default to Portuguese

    const toggleLanguage = () => {
        setLanguage(prevLang => (prevLang === 'en' ? 'pt' : 'en'));
    };

    const currentTranslations = translations[language];

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, translations: currentTranslations }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
