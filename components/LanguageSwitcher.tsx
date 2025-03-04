import { useState } from "react";
import Flag from "react-world-flags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

// Map of language codes to country codes for flags
const languageFlags = {
  en: "US",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "PT",
  ru: "RU",
  ja: "JP",
  ko: "KR",
  zh: "CN",
  ar: "SA",
  uk: "UA",
  eo: "EU" // Esperanto uses EU flag as a fallback
} as const;

type LanguageCode = keyof typeof languageFlags;

export function LanguageSwitcher() {
  const { locale, setLocale } = useDimensionalTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Ensure type safety by checking if locale is a valid language code
  const safeLocale = (Object.keys(languageFlags) as LanguageCode[]).includes(locale as LanguageCode) 
    ? locale as LanguageCode 
    : 'en';

  return (
    <Select 
      value={safeLocale} 
      onValueChange={(value) => setLocale(value as LanguageCode)}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger 
        className={`w-[60px] flex items-center justify-center transition-colors duration-200 ${
          isOpen ? 'bg-accent' : ''
        }`}
      >
        <Flag 
          code="PFORK"
          height="12" 
          className="rounded-sm object-cover min-w-[16px]" 
        />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(languageFlags) as LanguageCode[]).map((code) => (
          <SelectItem
            key={code}
            value={code}
            className="flex items-center justify-center transition-colors duration-200 hover:bg-accent"
          >
            <Flag 
              code={languageFlags[code]} 
              height="12" 
              className="rounded-sm object-cover min-w-[16px]" 
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}