"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { JourneyCard } from "@/components/journey-card";
import { loadStorage, storageKeys } from "@/lib/storage";
import type { SearchInput, Journey } from "@/lib/types";
import { useApp } from "@/components/providers";
interface Context {
  journey: Journey;
  input: SearchInput;
}
export default function JourneyPage() {
  const { t } = useApp();
  const { id } = useParams<{ id: string }>();
  const [context, setContext] = useState<Context | null>(null);
  useEffect(() => {
    const saved = loadStorage<Context | null>(storageKeys.checkout, null);
    if (saved?.journey.id === id) setContext(saved);
  }, [id]);
  return (
    <div className="page">
      {context ? (
        <>
          <span className="eyebrow">{t("pages.journey.eyebrow")}</span>
          <h1>
            {context.journey.origin.name} → {context.journey.destination.name}
          </h1>
          <div className="mt-8">
            <JourneyCard journey={context.journey} input={context.input} />
          </div>
        </>
      ) : (
        <div className="card empty-state">
          <h2>{t("pages.journey.missing")}</h2>
          <p>{t("pages.journey.missingText")}</p>
          <Link className="btn btn-primary" href="/">
            {t("common.actions.startSearch")}
          </Link>
        </div>
      )}
    </div>
  );
}
