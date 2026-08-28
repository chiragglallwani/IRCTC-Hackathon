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
import { ToastProvider } from "@/components/ui/toast";

interface User {
  id: string;
  name: string;
  email: string;
}

interface StoredAccount extends User {
  passwordHash: string;
}

type AuthResult =
  "success" | "invalid_credentials" | "account_not_found" | "email_exists";

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    name: string,
    password: string,
  ) => Promise<AuthResult>;
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
      signIn: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const accounts = loadStorage<StoredAccount[]>(storageKeys.accounts, []);
        const account = accounts.find((item) => item.email === normalizedEmail);
        if (!account) return "account_not_found";
        if (account.passwordHash !== (await hashPassword(password)))
          return "invalid_credentials";
        const next: User = {
          id: account.id,
          name: account.name,
          email: account.email,
        };
        saveStorage(storageKeys.user, next);
        saveStorage(storageKeys.session, next);
        setUser(next);
        setAuthOpen(false);
        return "success";
      },
      signUp: async (email, name, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const accounts = loadStorage<StoredAccount[]>(storageKeys.accounts, []);
        if (accounts.some((item) => item.email === normalizedEmail))
          return "email_exists";
        const account: StoredAccount = {
          id: `user-${normalizedEmail}`,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: await hashPassword(password),
        };
        saveStorage(storageKeys.accounts, [account, ...accounts]);
        const next: User = {
          id: account.id,
          name: account.name,
          email: account.email,
        };
        saveStorage(storageKeys.user, next);
        saveStorage(storageKeys.session, next);
        setUser(next);
        setAuthOpen(false);
        return "success";
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
      <ToastProvider>
        <div
          lang={language}
          dir={getTextDirection(language)}
          style={{ fontSize: `${fontSize}px` }}
          data-contrast={highContrast}
          data-language={language}
        >
          {children}
        </div>
      </ToastProvider>
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside Providers");
  return value;
}
