import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { LocaleType, messages } from '../i18n';
import { apiRequest } from '@/lib/queryClient';

interface LumiraTranslation {
  text: string;
  confidence: number;
  timestamp: number;
  isFormatted?: boolean;
}

interface TranslationCache {
  [key: string]: LumiraTranslation;
}

interface TranslationState {
  [key: string]: {
    loading: boolean;
    error?: string;
    text?: string;
    isFormatted?: boolean;
  };
}

// Cache with expiration
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface LumiraContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string | number>, options?: { formatted?: boolean }) => React.ReactNode;
  translate: (key: string, params?: Record<string, string | number>, options?: { formatted?: boolean }) => Promise<React.ReactNode>;
  preloadTranslations: (keys: string[]) => Promise<void>;
  isLoading: boolean;
  translationState: TranslationState;
}

const LumiraContext = createContext<LumiraContextType | undefined>(undefined);

export function LumiraProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [translationState, setTranslationState] = useState<TranslationState>({});

  // Enhanced translation function - returns React node for formatted text
  const t = useCallback((
    key: string, 
    params?: Record<string, string | number>,
    options?: { formatted?: boolean }
  ): React.ReactNode => {
    const cacheKey = `${locale}.${key}`;
    const cachedTranslation = translationCache[cacheKey];

    // Use cached translation if valid
    if (cachedTranslation && Date.now() - cachedTranslation.timestamp < CACHE_DURATION) {
      let translation = cachedTranslation.text;

      // Handle formatted text
      if (options?.formatted || cachedTranslation.isFormatted) {
        return (
          <FormattedMessage
            id={key}
            defaultMessage={translation}
            values={params}
          />
        );
      }

      // Handle regular text with parameter substitution
      if (params) {
        translation = Object.entries(params).reduce((acc: string, [param, value]) => {
          return acc.replace(`{${param}}`, String(value));
        }, translation);
      }
      return translation;
    }

    // Fallback to static translations or key
    const fallback = messages[locale]?.[key as keyof typeof messages[typeof locale]] || key;
    if (options?.formatted) {
      return (
        <FormattedMessage
          id={key}
          defaultMessage={typeof fallback === 'string' ? fallback : key}
          values={params}
        />
      );
    }
    return typeof fallback === 'string' ? fallback : key;
  }, [locale]);

  // Batch translation preloading
  const preloadTranslations = useCallback(async (keys: string[]) => {
    const missingKeys = keys.filter(key => {
      const cacheKey = `${locale}.${key}`;
      const cached = translationCache[cacheKey];
      return !cached || Date.now() - cached.timestamp > CACHE_DURATION;
    });

    if (missingKeys.length === 0) return;

    try {
      setIsLoading(true);
      const promises = missingKeys.map(key =>
        apiRequest<{
          text: string;
          confidence: number;
          isFormatted: boolean;
        }>('POST', '/api/lumira/translate', {
          body: { key, targetLocale: locale }
        }).then(response => ({ key, response }))
      );

      const results = await Promise.all(promises);
      const newCache: Record<string, LumiraTranslation> = {};
      const newState: TranslationState = {};

      results.forEach(({ key, response }) => {
        const cacheKey = `${locale}.${key}`;
        if (response.text) {
          newCache[cacheKey] = {
            text: response.text,
            confidence: response.confidence,
            timestamp: Date.now(),
            isFormatted: response.isFormatted
          };
          newState[key] = { 
            loading: false, 
            text: response.text,
            isFormatted: response.isFormatted 
          };
        } else {
          newState[key] = { loading: false, text: t(key) as string };
        }
      });

      Object.assign(translationCache, newCache);
      setTranslationState(prev => ({ ...prev, ...newState }));
    } catch (error) {
      console.error('Batch translation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  // Enhanced translation function with formatting support
  const translate = useCallback(async (
    key: string, 
    params?: Record<string, string | number>,
    options?: { formatted?: boolean }
  ): Promise<React.ReactNode> => {
    await preloadTranslations([key]);
    return t(key, params, options);
  }, [preloadTranslations, t]);

  // Update locale with proper error handling
  const setLocale = useCallback((newLocale: LocaleType) => {
    try {
      setLocaleState(newLocale);
      localStorage.setItem('preferred-locale', newLocale);
    } catch (error) {
      console.error('Failed to update locale:', error);
    }
  }, []);

  // Initialize with browser's locale
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
      if (savedLocale && messages[savedLocale]) {
        setLocaleState(savedLocale);
      } else {
        const browserLocale = navigator.language.split('-')[0] as LocaleType;
        setLocaleState(messages[browserLocale] ? browserLocale : 'en');
      }
    } catch (error) {
      console.error('Failed to initialize locale:', error);
      setLocaleState('en'); // Fallback to English
    }
  }, []);

  return (
    <LumiraContext.Provider value={{
      locale,
      setLocale,
      t,
      translate,
      preloadTranslations,
      isLoading,
      translationState
    }}>
      <IntlProvider
        messages={messages[locale]}
        locale={locale}
        defaultLocale="en"
        onError={(err) => {
          console.warn('IntlProvider error:', err);
          // Don't throw errors, just log them
        }}
      >
        {children}
      </IntlProvider>
    </LumiraContext.Provider>
  );
}

export function useLumiraTranslation() {
  const context = useContext(LumiraContext);
  if (!context) {
    throw new Error("useLumiraTranslation must be used within a LumiraProvider");
  }
  return context;
}

// Export DimensionalProvider as an alias for LumiraProvider
export const DimensionalProvider = LumiraProvider;

// Export useDimensionalTranslation as an alias for useLumiraTranslation
export const useDimensionalTranslation = useLumiraTranslation;