"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const feminineVoiceHints = [
  "female",
  "woman",
  "aditi",
  "aashi",
  "aarohi",
  "dhwani",
  "gul",
  "heera",
  "kalpana",
  "lekha",
  "neerja",
  "pallavi",
  "sapna",
  "shrut",
  "sobhana",
  "swara",
  "tanish",
  "veena",
  "yasmin",
  "aria",
  "ava",
  "fiona",
  "hazel",
  "jenny",
  "karen",
  "moira",
  "samantha",
  "susan",
  "tessa",
  "victoria",
  "zira",
];

const masculineVoiceHints = [
  "male",
  "david",
  "daniel",
  "gagan",
  "hemant",
  "madhur",
  "manohar",
  "mark",
  "mohan",
  "niranjan",
  "prabhat",
  "ravi",
  "rishi",
  "valluvar",
];

function containsHint(value: string, hints: string[]) {
  return hints.some((hint) => value.includes(hint));
}

export function selectDishaVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: string,
) {
  const requestedLocale = locale.toLowerCase();
  const requestedLanguage = requestedLocale.split("-")[0];
  const candidates = voices
    .map((voice) => {
      const name = voice.name.toLowerCase();
      const voiceLocale = voice.lang.toLowerCase();
      const isFeminine =
        containsHint(name, feminineVoiceHints) ||
        (name.includes("google") && voiceLocale.endsWith("-in"));
      const isMasculine = containsHint(name, masculineVoiceHints);
      let score = isFeminine ? 100 : 0;
      if (voiceLocale === requestedLocale) score += 50;
      else if (voiceLocale.split("-")[0] === requestedLanguage) score += 30;
      if (voiceLocale === "en-in") score += 15;
      if (voice.localService) score += 2;
      if (isMasculine) score -= 200;
      return { voice, score, isFeminine, isMasculine };
    })
    .filter((candidate) => !candidate.isMasculine)
    .sort((a, b) => b.score - a.score);

  return (
    candidates.find((candidate) => candidate.isFeminine)?.voice ??
    candidates.find(
      (candidate) => candidate.voice.lang.toLowerCase() === requestedLocale,
    )?.voice ??
    null
  );
}

export function useSpeechSynthesis(locale: string) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const pendingSpeechRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  const stop = useCallback(() => {
    if (pendingSpeechRef.current) {
      clearTimeout(pendingSpeechRef.current);
      pendingSpeechRef.current = null;
    }
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      stop();
      setError(null);

      const play = (attempt = 0) => {
        pendingSpeechRef.current = null;
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length) voicesRef.current = availableVoices;
        if (!voicesRef.current.length && attempt < 5) {
          pendingSpeechRef.current = setTimeout(() => play(attempt + 1), 200);
          return;
        }
        const voice = selectDishaVoice(voicesRef.current, locale);
        if (!voice) {
          setError(
            "A female speech voice is not installed in this browser. Add a female system voice or try Chrome or Edge.",
          );
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.96;
        utterance.pitch = 1.08;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      };

      play();
    },
    [locale, stop, supported],
  );

  useEffect(() => stop, [stop]);
  return { supported, speaking, error, speak, stop };
}
