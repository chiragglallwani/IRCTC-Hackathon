import { describe, expect, it } from "vitest";
import {
  getIntlLocale,
  getMessages,
  getTextDirection,
  isSupportedLanguage,
  supportedLanguages,
  translate,
} from "@/lib/i18n";

describe("internationalization registry", () => {
  it("loads a complete message catalog for every supported language", () => {
    expect(supportedLanguages).toHaveLength(23);
    for (const language of supportedLanguages) {
      expect(getMessages(language).common.brand).toBeTruthy();
      expect(translate(language, "common.actions.close")).not.toBe(
        "common.actions.close",
      );
      expect(
        () => new Intl.DateTimeFormat(getIntlLocale(language)),
      ).not.toThrow();
    }
  });

  it("uses RTL direction for the Arabic-script locale files", () => {
    expect(getTextDirection("ks")).toBe("rtl");
    expect(getTextDirection("sd")).toBe("rtl");
    expect(getTextDirection("ur")).toBe("rtl");
    expect(getTextDirection("en")).toBe("ltr");
  });

  it("rejects unsupported persisted language values", () => {
    expect(isSupportedLanguage("ta")).toBe(true);
    expect(isSupportedLanguage("unknown")).toBe(false);
  });
});
