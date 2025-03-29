import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';
import kn from '../locales/kn.json';

// Language options
export const LANGUAGES = {
  // Global languages
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  zh: { name: 'Chinese', nativeName: '中文' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  
  // Indian languages
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      hi: {
        translation: hi
      },
      te: {
        translation: te
      },
      ta: {
        translation: ta
      },
      kn: {
        translation: kn
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && LANGUAGES[savedLang as keyof typeof LANGUAGES]) {
      setLanguage(savedLang);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}