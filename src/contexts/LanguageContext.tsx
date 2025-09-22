
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations } from '../../translations';

type Language = 'en' | 'pt' | 'es';
type Translations = typeof translations.pt;

interface LanguageContextType {
    language: Language;
    translations: Translations;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('pt'); // Default to Portuguese

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
    };

    const currentTranslations = translations[language];

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, translations: currentTranslations }}>
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
