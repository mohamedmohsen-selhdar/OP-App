import { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../lib/i18n';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('factoryos_lang') ?? 'ar'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('factoryos_lang', lang);
    i18n.changeLanguage(lang);
  }, [lang]);

  function toggleLang() {
    setLang(l => (l === 'ar' ? 'en' : 'ar'));
  }

  const isRTL = lang === 'ar';

  return (
    <LangContext.Provider value={{ lang, toggleLang, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}
