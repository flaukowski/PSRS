import { createIntl, createIntlCache } from 'react-intl';
import en from './messages/en';
import es from './messages/es';
import zh from './messages/zh';
import ja from './messages/ja';
import ko from './messages/ko';
import fr from './messages/fr';
import ru from './messages/ru';
import uk from './messages/uk';
import ar from './messages/ar';
import de from './messages/de';
import it from './messages/it';
import pt from './messages/pt';
import eo from './messages/eo';

export const messages = {
  en,
  es,
  zh,
  ja,
  ko,
  fr,
  ru,
  uk,
  ar,
  de,
  it,
  pt,
  eo,
} as const;

export type LocaleType = keyof typeof messages;
export type MessageKeys = keyof typeof messages.en;

// Create the cache once
const cache = createIntlCache();

// Create a function to get intl instance based on locale
export function getIntl(locale: LocaleType) {
  return createIntl(
    {
      locale,
      messages: messages[locale],
      defaultLocale: 'en', // Set English as default
    },
    cache
  );
}

// Language names in their native form
export const languageNames = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  ru: 'Русский',
  uk: 'Українська',
  ar: 'العربية',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  eo: 'Esperanto',
} as const;

// Function to detect user's preferred language
export function getPreferredLanguage(): LocaleType {
  const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
  if (savedLocale && messages[savedLocale]) {
    return savedLocale;
  }

  const browserLocale = navigator.language.split('-')[0] as LocaleType;
  return messages[browserLocale] ? browserLocale : 'en'; // Fallback to English
}

// Function to set user's preferred language
export function setPreferredLanguage(locale: LocaleType) {
  localStorage.setItem('preferred-locale', locale);
}