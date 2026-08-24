"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { JourneyCard } from "@/components/journey-card";
import { useApp } from "@/components/providers";
import { searchJourneys } from "@/lib/search";
import { stationById } from "@/lib/data";
import type { SearchInput } from "@/lib/types";

function dateOffset(date: string, offset: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function SearchResults() {
  const { language, t } = useApp();
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const params = useSearchParams();
  const base: SearchInput = {
    origin: params.get("origin") ?? "",
    destination: params.get("destination") ?? "",
    date: params.get("date") ?? "2026-08-24",
    adults: Number(params.get("adults") ?? 1),
    children: Number(params.get("children") ?? 0),
    infants: Number(params.get("infants") ?? 0),
    travelClass: params.get("class") ?? "ANY",
    mode: (params.get("mode") as SearchInput["mode"]) ?? "explore",
  };
  const [date, setDate] = useState(base.date);
  const [sort, setSort] = useState("recommended");
  const [modes, setModes] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<number[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxFare, setMaxFare] = useState(10000);
  const input = { ...base, date };
  const raw = useMemo(
    () =>
      searchJourneys({
        origin: base.origin,
        destination: base.destination,
        date,
        adults: base.adults,
        children: base.children,
        infants: base.infants,
        travelClass: base.travelClass,
        mode: base.mode,
      }),
    [
      base.origin,
      base.destination,
      date,
      base.adults,
      base.children,
      base.infants,
      base.travelClass,
      base.mode,
    ],
  );
  const results = useMemo(
    () =>
      raw
        .filter(
          (x) =>
            (!modes.length || x.modes.some((m) => modes.includes(m))) &&
            (!transfers.length ||
              transfers.includes(Math.min(2, x.transfers))) &&
            (!onlyAvailable || x.availability === "AVAILABLE") &&
            x.totalFare <= maxFare,
        )
        .sort((a, b) =>
          sort === "fastest"
            ? a.durationMinutes - b.durationMinutes
            : sort === "cheapest"
              ? a.totalFare - b.totalFare
              : b.score - a.score,
        ),
    [raw, modes, transfers, onlyAvailable, maxFare, sort],
  );
  const toggle = <T,>(value: T, list: T[], setter: (x: T[]) => void) =>
    setter(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  const origin = stationById.get(base.origin);
  const destination = stationById.get(base.destination);
  return (
    <div className="page">
      <section className="card search-summary">
        <div>
          <span className="eyebrow">{t("pages.search.eyebrow")}</span>
          <h2>
            {origin?.name ?? t("pages.search.origin")} →{" "}
            {destination?.name ?? t("pages.search.destination")}
          </h2>
          <p className="muted">
            {new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}{" "}
            ·{" "}
            {t(
              base.adults + base.children === 1
                ? "pages.search.traveller"
                : "pages.search.travellers",
              { count: base.adults + base.children },
            )}
          </p>
        </div>
        <Link className="btn btn-secondary" href="/">
          {t("pages.search.edit")}
        </Link>
      </section>
      <div className="date-carousel" aria-label={t("pages.search.datesLabel")}>
        {[-2, -1, 0, 1, 2, 3, 4].map((offset) => {
          const value = dateOffset(date, offset);
          const d = new Date(`${value}T00:00:00`);
          return (
            <button
              key={`${value}-${offset}`}
              className={`date-chip ${offset === 0 ? "active" : ""}`}
              onClick={() => setDate(value)}
            >
              <div>
                {d.toLocaleDateString(locale, {
                  weekday: "short",
                  day: "numeric",
                })}
              </div>
              <strong>
                {t(
                  offset === 0
                    ? "common.status.selected"
                    : "pages.search.checkFare",
                )}
              </strong>
            </button>
          );
        })}
      </div>
      <div className="results-toolbar">
        <div>
          <h3>{t("pages.search.found", { count: results.length })}</h3>
          <div className="active-chips">
            {modes.map((x) => (
              <button onClick={() => toggle(x, modes, setModes)} key={x}>
                {t(`pages.search.${x}`)} ×
              </button>
            ))}
            {transfers.map((x) => (
              <button
                onClick={() => toggle(x, transfers, setTransfers)}
                key={x}
              >
                {x === 0
                  ? t("pages.search.directChip")
                  : t("pages.search.transferChip", {
                      count: `${x}${x === 2 ? "+" : ""}`,
                    })}{" "}
                ×
              </button>
            ))}
            {modes.length || transfers.length || onlyAvailable ? (
              <button
                onClick={() => {
                  setModes([]);
                  setTransfers([]);
                  setOnlyAvailable(false);
                }}
              >
                {t("common.actions.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>
        <label>
          {t("pages.search.sort")}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">
              {t("pages.search.sortRecommended")}
            </option>
            <option value="fastest">{t("pages.search.sortFastest")}</option>
            <option value="cheapest">{t("pages.search.sortCheapest")}</option>
          </select>
        </label>
      </div>
      <div className="results-layout">
        <aside
          className="filter-sidebar"
          aria-label={t("pages.search.filtersLabel")}
        >
          <h3>
            <SlidersHorizontal /> {t("pages.search.filters")}
          </h3>
          <section>
            <strong>{t("pages.search.transport")}</strong>
            <div className="check-list">
              {["train", "metro"].map((x) => (
                <label key={x}>
                  <input
                    type="checkbox"
                    checked={modes.includes(x)}
                    onChange={() => toggle(x, modes, setModes)}
                  />
                  {t(`pages.search.${x}`)}
                </label>
              ))}
            </div>
          </section>
          <section>
            <strong>{t("pages.search.transfers")}</strong>
            <div className="check-list">
              {[0, 1, 2].map((x) => (
                <label key={x}>
                  <input
                    type="checkbox"
                    checked={transfers.includes(x)}
                    onChange={() => toggle(x, transfers, setTransfers)}
                  />
                  {t(
                    x === 0
                      ? "pages.search.directChip"
                      : x === 2
                        ? "pages.search.twoTransfers"
                        : "pages.search.oneTransfer",
                  )}
                </label>
              ))}
            </div>
          </section>
          <section>
            <label>
              {t("pages.search.maxFare", {
                amount: maxFare.toLocaleString(locale),
              })}
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={maxFare}
                onChange={(e) => setMaxFare(Number(e.target.value))}
              />
            </label>
          </section>
          <section>
            <div className="check-list">
              <label>
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                {t("pages.search.availabilityOnly")}
              </label>
              <label>
                <input type="checkbox" />
                {t("pages.search.wheelchair")}
              </label>
              <label>
                <input type="checkbox" />
                {t("pages.search.charging")}
              </label>
            </div>
          </section>
        </aside>
        <div className="result-list">
          {results.length ? (
            results.map((x) => (
              <JourneyCard key={x.id} journey={x} input={input} />
            ))
          ) : (
            <div className="card empty-state">
              <SearchX />
              <h2>{t("pages.search.emptyTitle")}</h2>
              <p>{t("pages.search.emptyText")}</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setModes([]);
                  setTransfers([]);
                  setOnlyAvailable(false);
                  setMaxFare(10000);
                }}
              >
                {t("pages.search.alternatives")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function SearchPage() {
  const { t } = useApp();
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="card empty-state">{t("pages.search.loading")}</div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
