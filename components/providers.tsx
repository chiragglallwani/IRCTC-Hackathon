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
  translate,
  type Language,
  type TranslationVariables,
} from "@/lib/i18n";

interface User {
  id: string;
  name: string;
  email: string;
}
interface AppContextValue {
  language: Language;
  setLanguage: (x: Language) => void;
  fontSize: "normal" | "large" | "xl";
  setFontSize: (x: "normal" | "large" | "xl") => void;
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
  const [fontSize, setFontSizeState] = useState<"normal" | "large" | "xl">(
    "normal",
  );
  const [highContrast, setHighContrastState] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    const p = loadStorage<{
      language?: Language;
      fontSize?: "normal" | "large" | "xl";
      highContrast?: boolean;
    }>(storageKeys.preferences, {});
    setLanguageState(p.language ?? "en");
    setFontSizeState(p.fontSize ?? "normal");
    setHighContrastState(p.highContrast ?? false);
    setUser(loadStorage<User | null>(storageKeys.session, null));
  }, []);
  const persist = useCallback(
    (
      next: Partial<{
        language: Language;
        fontSize: "normal" | "large" | "xl";
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
      setLanguage: (x) => {
        setLanguageState(x);
        persist({ language: x });
      },
      fontSize,
      setFontSize: (x) => {
        setFontSizeState(x);
        persist({ fontSize: x });
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
  return (
    <AppContext.Provider value={value}>
      <div data-font={fontSize} data-contrast={highContrast}>
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
