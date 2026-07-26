import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../content/portfolio';

const STORAGE_KEY = 'portfolio-language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en';
};

export const useLanguage = () => {
  const [language, updateLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    updateLanguage(nextLanguage);
  }, []);

  return { language, setLanguage };
};
