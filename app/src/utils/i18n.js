// src/utils/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enTranslations from '../locales/en/translation.json';
import ptTranslations from '../locales/pt/translation.json';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      pt: { translation: ptTranslations },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;

/*
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enTranslation from '../locales/en/translation.json';
import ptTranslation from '../locales/pt/translation.json';

const languageStorageKey = 'user-language';

const i18n = new I18n();

// Set translations
i18n.translations = {
  en: enTranslation,
  pt: ptTranslation,
};

// Safely determine locale
const getDeviceLocale = () => {
  try {
    // Fallback to 'en' if Localization isn't available
    if (!Localization.locale) return 'en';

    // Handle both string and object formats (some Expo versions return an object)
    const localeString = typeof Localization.locale === 'string'
      ? Localization.locale
      : Localization.locale?.localeIdentifier || 'en';

    // Extract language code (pt from pt-BR)
    return localeString.split(/[-_]/)[0];
  } catch (error) {
    console.warn('Error detecting locale:', error);
    return 'en';
  }
};

// Add the changeLanguage method directly to the i18n instance
i18n.changeLanguage = async function(lang: string) {
  this.locale = lang;
  await AsyncStorage.setItem(languageStorageKey, lang);
};

// Initialize locale
async function initializeLocale() {
  try {
    const savedLang = await AsyncStorage.getItem(languageStorageKey);
    if (savedLang) {
      i18n.locale = savedLang;
    } else {
      const deviceLocale = getDeviceLocale();
      i18n.locale = Object.keys(i18n.translations).includes(deviceLocale)
        ? deviceLocale
        : 'en';
    }
  } catch (error) {
    console.warn('Error initializing locale:', error);
    i18n.locale = 'en';
  }
}

// Configure fallbacks
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Initialize the locale
initializeLocale();

export default i18n;

*/