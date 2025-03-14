import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationIT from '../public/locales/it/it.json';
import translationEN from '../public/locales/en/en.json';

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: translationIT },
    en: { translation: translationEN },
  },
  lng: 'it', 
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
