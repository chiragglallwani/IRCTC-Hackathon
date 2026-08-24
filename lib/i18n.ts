import en from "../locales/en.json";
import hi from "../locales/hi.json";

export const supportedLanguages = ["en", "hi"] as const;
export type Language = (typeof supportedLanguages)[number];
export type LocaleMessages = typeof en;

export const messages: Record<Language, LocaleMessages> = { en, hi };

export function getMessages(language: Language): LocaleMessages {
  return messages[language];
}

export type TranslationVariables = Record<string, string | number>;

export function translate(
  language: Language,
  key: string,
  variables: TranslationVariables = {},
): string {
  const resolve = (source: LocaleMessages): unknown =>
    key.split(".").reduce<unknown>((value, segment) => {
      if (typeof value !== "object" || value === null) return undefined;
      return (value as Record<string, unknown>)[segment];
    }, source);

  const localized = resolve(messages[language]);
  const fallback = resolve(messages.en);
  const template =
    typeof localized === "string"
      ? localized
      : typeof fallback === "string"
        ? fallback
        : key;

  return template.replace(/\{\{(\w+)\}\}/g, (_, variable: string) =>
    String(variables[variable] ?? `{{${variable}}}`),
  );
}
