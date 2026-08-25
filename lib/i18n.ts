import as from "../locales/as.json";
import bn from "../locales/bn.json";
import brx from "../locales/brx.json";
import doi from "../locales/doi.json";
import en from "../locales/en.json";
import gu from "../locales/gu.json";
import hi from "../locales/hi.json";
import kn from "../locales/kn.json";
import kok from "../locales/kok.json";
import ks from "../locales/ks.json";
import mai from "../locales/mai.json";
import ml from "../locales/ml.json";
import mni from "../locales/mni.json";
import mr from "../locales/mr.json";
import ne from "../locales/ne.json";
import or from "../locales/or.json";
import pa from "../locales/pa.json";
import sa from "../locales/sa.json";
import sat from "../locales/sat.json";
import sd from "../locales/sd.json";
import ta from "../locales/ta.json";
import te from "../locales/te.json";
import ur from "../locales/ur.json";

export const supportedLanguages = [
  "en",
  "as",
  "bn",
  "brx",
  "doi",
  "gu",
  "hi",
  "kn",
  "ks",
  "kok",
  "mai",
  "ml",
  "mni",
  "mr",
  "ne",
  "or",
  "pa",
  "sa",
  "sat",
  "sd",
  "ta",
  "te",
  "ur",
] as const;

export type Language = (typeof supportedLanguages)[number];
export type TextDirection = "ltr" | "rtl";
export type LocaleMessages = typeof en;

export const languageMetadata: Record<
  Language,
  { label: string; locale: string; direction: TextDirection }
> = {
  en: { label: "English", locale: "en-IN", direction: "ltr" },
  as: { label: "অসমীয়া", locale: "as-IN", direction: "ltr" },
  bn: { label: "বাংলা", locale: "bn-IN", direction: "ltr" },
  brx: { label: "बर'", locale: "brx-IN", direction: "ltr" },
  doi: { label: "डोगरी", locale: "doi-IN", direction: "ltr" },
  gu: { label: "ગુજરાતી", locale: "gu-IN", direction: "ltr" },
  hi: { label: "हिन्दी", locale: "hi-IN", direction: "ltr" },
  kn: { label: "ಕನ್ನಡ", locale: "kn-IN", direction: "ltr" },
  ks: { label: "کٲشُر", locale: "ks-Arab-IN", direction: "rtl" },
  kok: { label: "कोंकणी", locale: "kok-IN", direction: "ltr" },
  mai: { label: "मैथिली", locale: "mai-IN", direction: "ltr" },
  ml: { label: "മലയാളം", locale: "ml-IN", direction: "ltr" },
  mni: { label: "মৈতৈলোন্", locale: "mni-IN", direction: "ltr" },
  mr: { label: "मराठी", locale: "mr-IN", direction: "ltr" },
  ne: { label: "नेपाली", locale: "ne-NP", direction: "ltr" },
  or: { label: "ଓଡ଼ିଆ", locale: "or-IN", direction: "ltr" },
  pa: { label: "ਪੰਜਾਬੀ", locale: "pa-IN", direction: "ltr" },
  sa: { label: "संस्कृतम्", locale: "sa-IN", direction: "ltr" },
  sat: { label: "ᱥᱟᱱᱛᱟᱲᱤ", locale: "sat-IN", direction: "ltr" },
  sd: { label: "سنڌي", locale: "sd-Arab-IN", direction: "rtl" },
  ta: { label: "தமிழ்", locale: "ta-IN", direction: "ltr" },
  te: { label: "తెలుగు", locale: "te-IN", direction: "ltr" },
  ur: { label: "اردو", locale: "ur-IN", direction: "rtl" },
};

export const languageOptions = supportedLanguages.map((value) => ({
  value,
  label: languageMetadata[value].label,
}));

export const messages: Record<Language, LocaleMessages> = {
  en,
  as,
  bn,
  brx,
  doi,
  gu,
  hi,
  kn,
  ks,
  kok,
  mai,
  ml,
  mni,
  mr,
  ne,
  or,
  pa,
  sa,
  sat,
  sd,
  ta,
  te,
  ur,
};

export function isSupportedLanguage(value: unknown): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function getMessages(language: Language): LocaleMessages {
  return messages[language];
}

export function getTextDirection(language: Language): TextDirection {
  return languageMetadata[language].direction;
}

export function getIntlLocale(language: Language): string {
  return languageMetadata[language].locale;
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
