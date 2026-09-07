import { describe, expect, it } from "vitest";
import { selectDishaVoice } from "@/hooks/use-speech-synthesis";

function voice(name: string, lang: string, localService = true) {
  return { name, lang, localService, default: false, voiceURI: name } as SpeechSynthesisVoice;
}

describe("Disha speech voice selection", () => {
  it("prefers an Indian female voice over an Indian male voice", () => {
    const selected = selectDishaVoice(
      [
        voice("Microsoft Ravi Online", "en-IN"),
        voice("Microsoft Neerja Online (Natural)", "en-IN"),
      ],
      "en-IN",
    );
    expect(selected?.name).toContain("Neerja");
  });

  it("prefers a matching-language female voice", () => {
    const selected = selectDishaVoice(
      [voice("Samantha", "en-US"), voice("Microsoft Swara Online", "hi-IN")],
      "hi-IN",
    );
    expect(selected?.name).toContain("Swara");
  });

  it("never selects a recognizably male voice as the fallback", () => {
    expect(selectDishaVoice([voice("Microsoft Ravi", "en-IN")], "en-IN")).toBeNull();
  });
});
