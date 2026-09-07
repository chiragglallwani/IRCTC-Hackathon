"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Journey, SearchInput } from "@/lib/types";

export interface SearchPageAssistantContext {
  input: SearchInput;
  journeys: Journey[];
  loading: boolean;
  sort: string;
  onlyAvailable: boolean;
  maxTransfers: number | null;
  maxFare: number;
  departurePeriod: "morning" | "afternoon" | "evening" | "night" | null;
  setSort: (value: "recommended" | "cheapest" | "fastest") => void;
  setOnlyAvailable: (value: boolean) => void;
  setMaxTransfers: (value: number | null) => void;
  setMaxFare: (value: number) => void;
  setDeparturePeriod: (
    value: "morning" | "afternoon" | "evening" | "night" | null,
  ) => void;
}

interface AssistantContextValue {
  searchPage: SearchPageAssistantContext | null;
  registerSearchPage: (value: SearchPageAssistantContext | null) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [searchPage, setSearchPage] =
    useState<SearchPageAssistantContext | null>(null);
  const registerSearchPage = useCallback(
    (value: SearchPageAssistantContext | null) => setSearchPage(value),
    [],
  );
  const value = useMemo(
    () => ({ searchPage, registerSearchPage }),
    [searchPage, registerSearchPage],
  );
  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const value = useContext(AssistantContext);
  if (!value)
    throw new Error("useAssistantContext must be inside AssistantProvider");
  return value;
}
