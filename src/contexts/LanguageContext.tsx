import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  Language,
  getStoredLanguage,
  setStoredLanguage,
  formatTaka as utilFormatTaka,
  formatNumber as utilFormatNumber,
  formatDate as utilFormatDate,
  formatMonthYear as utilFormatMonthYear,
} from '../utils/formatters';
import {
  TRANSLATIONS,
  translateCategoryName,
  translateAccountName,
} from '../locales/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS.bn;
  formatTaka: (poisha: number, showDecimalIfZero?: boolean) => string;
  formatNumber: (num: number | string) => string;
  formatDate: (dateString: string) => string;
  formatMonthYear: (yearMonthString: string) => string;
  getCategoryName: (categoryOrName: any) => string;
  getAccountName: (accountOrName: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => getStoredLanguage());

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    setStoredLanguage(newLang);
  };

  useEffect(() => {
    // Listen to potential storage events across tabs or components
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'plm_language_mode' && (e.newValue === 'bn' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(() => {
    const t = TRANSLATIONS[language] || TRANSLATIONS.bn;

    return {
      language,
      setLanguage,
      t,
      formatTaka: (poisha: number, showDecimalIfZero = false) =>
        utilFormatTaka(poisha, showDecimalIfZero, language),
      formatNumber: (num: number | string) => utilFormatNumber(num, language),
      formatDate: (dateString: string) => utilFormatDate(dateString, language),
      formatMonthYear: (yearMonthString: string) => utilFormatMonthYear(yearMonthString, language),
      getCategoryName: (categoryOrName: any) => translateCategoryName(categoryOrName, language),
      getAccountName: (accountOrName: any) => translateAccountName(accountOrName, language),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackLang = getStoredLanguage();
    return {
      language: fallbackLang,
      setLanguage: setStoredLanguage,
      t: TRANSLATIONS[fallbackLang],
      formatTaka: (poisha: number, showDecimalIfZero = false) =>
        utilFormatTaka(poisha, showDecimalIfZero, fallbackLang),
      formatNumber: (num: number | string) => utilFormatNumber(num, fallbackLang),
      formatDate: (dateString: string) => utilFormatDate(dateString, fallbackLang),
      formatMonthYear: (yearMonthString: string) =>
        utilFormatMonthYear(yearMonthString, fallbackLang),
      getCategoryName: (categoryOrName: any) => translateCategoryName(categoryOrName, fallbackLang),
      getAccountName: (accountOrName: any) => translateAccountName(accountOrName, fallbackLang),
    };
  }
  return context;
};
