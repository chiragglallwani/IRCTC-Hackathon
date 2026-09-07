"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechResultEvent extends Event {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useSpeechRecognition({
  locale,
  onFinal,
}: {
  locale: string;
  onFinal: (transcript: string) => void;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinal);
  const shouldListenRef = useRef(false);
  const recognizingRef = useRef(false);
  const completedTranscriptRef = useRef("");
  const currentTranscriptRef = useRef("");
  const discardTranscriptRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const finish = useCallback(() => {
    const completed = [
      completedTranscriptRef.current,
      currentTranscriptRef.current,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const shouldSubmit = !discardTranscriptRef.current && Boolean(completed);

    completedTranscriptRef.current = "";
    currentTranscriptRef.current = "";
    discardTranscriptRef.current = false;
    setListening(false);
    setTranscript("");

    if (shouldSubmit) onFinalRef.current(completed);
  }, []);

  useEffect(() => {
    const Constructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Constructor));
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale;
    recognition.onstart = () => {
      recognizingRef.current = true;
      setError(null);
      setListening(true);
    };
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        parts.push(result[0].transcript.trim());
      }
      currentTranscriptRef.current = parts.filter(Boolean).join(" ");
      setTranscript(
        [completedTranscriptRef.current, currentTranscriptRef.current]
          .filter(Boolean)
          .join(" ")
          .trim(),
      );
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" && shouldListenRef.current) return;

      shouldListenRef.current = false;
      discardTranscriptRef.current = true;
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. Enable it in browser settings or type below."
          : "Voice recognition stopped unexpectedly. Please try again or type your request.",
      );
    };
    recognition.onend = () => {
      recognizingRef.current = false;
      completedTranscriptRef.current = [
        completedTranscriptRef.current,
        currentTranscriptRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      currentTranscriptRef.current = "";
      setTranscript(completedTranscriptRef.current);

      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!shouldListenRef.current) return;
          try {
            recognition.start();
          } catch {
            shouldListenRef.current = false;
            discardTranscriptRef.current = true;
            setError(
              "Voice recognition could not continue. Please try again or type your request.",
            );
            finish();
          }
        }, 150);
        return;
      }

      finish();
    };
    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      discardTranscriptRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognizingRef.current = false;
      recognitionRef.current = null;
    };
  }, [finish, locale]);

  const start = useCallback(() => {
    if (!recognitionRef.current || shouldListenRef.current) return;
    completedTranscriptRef.current = "";
    currentTranscriptRef.current = "";
    discardTranscriptRef.current = false;
    shouldListenRef.current = true;
    setTranscript("");
    setError(null);
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      shouldListenRef.current = false;
      setListening(false);
      setError("The microphone is already starting. Please wait a moment.");
    }
  }, []);
  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognizingRef.current) recognitionRef.current?.stop();
    else finish();
  }, [finish]);

  const cancel = useCallback(() => {
    shouldListenRef.current = false;
    discardTranscriptRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.abort();
    recognizingRef.current = false;
    finish();
  }, [finish]);

  return { supported, listening, transcript, error, start, stop, cancel };
}
