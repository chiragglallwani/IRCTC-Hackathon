"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadStorage, saveStorage, storageKeys } from "@/lib/storage";
import {
  getIntlLocale,
  getTextDirection,
  isSupportedLanguage,
  translate,
  type Language,
  type TextDirection,
  type TranslationVariables,
} from "@/lib/i18n";

interface User {
  id: string;
  name: string;
  email: string;
}

export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 22;
export const FONT_SIZE_STEP = 2;
const DEFAULT_FONT_SIZE = 16;

function normalizeFontSize(value: unknown) {
  if (value === "large") return 18;
  if (value === "xl") return 20;
  if (value === "normal") return DEFAULT_FONT_SIZE;
  if (typeof value !== "number" || !Number.isFinite(value))
    return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));
}

interface AppContextValue {
  language: Language;
  setLanguage: (x: Language) => void;
  locale: string;
  direction: TextDirection;
  fontSize: number;
  setFontSize: (x: number) => void;
  highContrast: boolean;
  setHighContrast: (x: boolean) => void;
  user: User | null;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
  authOpen: boolean;
  setAuthOpen: (x: boolean) => void;
  t: (key: string, variables?: TranslationVariables) => string;
}
const AppContext = createContext<AppContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE);
  const [highContrast, setHighContrastState] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    const p = loadStorage<{
      language?: Language;
      fontSize?: number | "normal" | "large" | "xl";
      highContrast?: boolean;
    }>(storageKeys.preferences, {});
    setLanguageState(isSupportedLanguage(p.language) ? p.language : "en");
    setFontSizeState(normalizeFontSize(p.fontSize));
    setHighContrastState(p.highContrast ?? false);
    setUser(loadStorage<User | null>(storageKeys.session, null));
  }, []);
  const persist = useCallback(
    (
      next: Partial<{
        language: Language;
        fontSize: number;
        highContrast: boolean;
      }>,
    ) =>
      saveStorage(storageKeys.preferences, {
        language,
        fontSize,
        highContrast,
        ...next,
      }),
    [language, fontSize, highContrast],
  );
  const value = useMemo<AppContextValue>(
    () => ({
      language,
      locale: getIntlLocale(language),
      direction: getTextDirection(language),
      setLanguage: (x) => {
        setLanguageState(x);
        persist({ language: x });
      },
      fontSize,
      setFontSize: (x) => {
        const next = normalizeFontSize(x);
        setFontSizeState(next);
        persist({ fontSize: next });
      },
      highContrast,
      setHighContrast: (x) => {
        setHighContrastState(x);
        persist({ highContrast: x });
      },
      user,
      signIn: (email, name) => {
        const next = {
          id: `user-${email}`,
          name: name || email.split("@")[0],
          email,
        };
        saveStorage(storageKeys.user, next);
        saveStorage(storageKeys.session, next);
        setUser(next);
        setAuthOpen(false);
      },
      signOut: () => {
        localStorage.removeItem(storageKeys.session);
        setUser(null);
      },
      authOpen,
      setAuthOpen,
      t: (key, variables) => translate(language, key, variables),
    }),
    [language, fontSize, highContrast, user, authOpen, persist],
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getTextDirection(language);
  }, [language]);
  return (
    <AppContext.Provider value={value}>
      <div
        lang={language}
        dir={getTextDirection(language)}
        style={{ fontSize: `${fontSize}px` }}
        data-contrast={highContrast}
        data-language={language}
      >
        {children}
      </div>
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside Providers");
  return value;
}
