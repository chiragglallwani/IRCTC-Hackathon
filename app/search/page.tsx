"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { JourneyCard } from "@/components/journey-card";
import { JourneyLoader } from "@/components/journey-loader";
import { SearchCard } from "@/components/search-card";
import { useApp } from "@/components/providers";
import { stationById } from "@/lib/places";
import type { Journey, SearchInput } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAssistantContext } from "@/components/assistant/assistant-context";

function dateOffset(date: string, offset: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDate() {
  return dateOffset(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
    0,
  );
}

function matchesDeparturePeriod(
  departure: string,
  period: "morning" | "afternoon" | "evening" | "night" | null,
) {
  if (!period) return true;
  const hour = Number(departure.split(":")[0]);
  if (period === "morning") return hour >= 5 && hour < 12;
  if (period === "afternoon") return hour >= 12 && hour < 17;
  if (period === "evening") return hour >= 17 && hour < 21;
  return hour >= 21 || hour < 5;
}

function SearchLoadingState({ label }: { label: string }) {
  return (
    <div className="card empty-state" role="status" aria-live="polite">
      <JourneyLoader />
      <p>{label}</p>
    </div>
  );
}

function SearchResults() {
  const { locale, t } = useApp();
  const { registerSearchPage } = useAssistantContext();
  const params = useSearchParams();
  const base = useMemo<SearchInput>(
    () => ({
      origin: params.get("origin") ?? "",
      destination: params.get("destination") ?? "",
      date: params.get("date") ?? "2026-08-24",
      adults: Number(params.get("adults") ?? 1),
      children: Number(params.get("children") ?? 0),
      infants: Number(params.get("infants") ?? 0),
      travelClass: params.get("class") ?? "ANY",
      mode: (params.get("mode") as SearchInput["mode"]) ?? "explore",
    }),
    [params],
  );
  const [date, setDate] = useState(base.date);
  const [sort, setSort] = useState("recommended");
  const [modes, setModes] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<number[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxFare, setMaxFare] = useState(10000);
  const [departurePeriod, setDeparturePeriod] = useState<
    "morning" | "afternoon" | "evening" | "night" | null
  >(null);
  const [searchOpen, setSearchOpen] = useState(true);
  const [raw, setRaw] = useState<Journey[]>([]);
  const [dateOptions, setDateOptions] = useState<
    { value: string; recommendedFare?: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const input = useMemo(() => ({ ...base, date }), [base, date]);
  useEffect(() => {
    if (!input.origin || !input.destination || !input.date) return;
    const controller = new AbortController();
    const previewDates =
      input.mode === "tatkal"
        ? []
        : [-2, -1, 0, 1, 2, 3, 4]
            .map((offset) => dateOffset(date, offset))
            .filter((value) => value >= todayDate());
    setLoading(true);
    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, previewDates }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search failed");
        return response.json() as Promise<{
          journeys: Journey[];
          previews: Record<string, number | undefined>;
        }>;
      })
      .then(({ journeys, previews }) => {
        setRaw(journeys);
        setDateOptions(
          previewDates.map((value) => ({
            value,
            recommendedFare: previews[value],
          })),
        );
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setRaw([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [input, date]);
  const results = useMemo(
    () =>
      raw
        .filter(
          (x) =>
            (!modes.length || x.modes.some((m) => modes.includes(m))) &&
            (!transfers.length ||
              transfers.includes(Math.min(2, x.transfers))) &&
            (!onlyAvailable || x.availability === "AVAILABLE") &&
            x.totalFare <= maxFare &&
            matchesDeparturePeriod(x.departure, departurePeriod),
        )
        .sort((a, b) =>
          sort === "fastest"
            ? a.durationMinutes - b.durationMinutes
            : sort === "cheapest"
              ? a.totalFare - b.totalFare
              : b.score - a.score,
        ),
    [raw, modes, transfers, onlyAvailable, maxFare, departurePeriod, sort],
  );
  const setAssistantMaxTransfers = useCallback((value: number | null) => {
    setTransfers(value === null ? [] : [Math.min(2, Math.max(0, value))]);
  }, []);
  useEffect(() => {
    registerSearchPage({
      input,
      journeys: results,
      loading,
      sort,
      onlyAvailable,
      maxTransfers: transfers.length === 1 ? transfers[0] : null,
      maxFare,
      departurePeriod,
      setSort,
      setOnlyAvailable,
      setMaxTransfers: setAssistantMaxTransfers,
      setMaxFare,
      setDeparturePeriod,
    });
    return () => registerSearchPage(null);
  }, [
    input,
    results,
    loading,
    sort,
    onlyAvailable,
    transfers,
    maxFare,
    departurePeriod,
    registerSearchPage,
    setAssistantMaxTransfers,
  ]);
  const toggle = <T,>(value: T, list: T[], setter: (x: T[]) => void) =>
    setter(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  const origin = stationById.get(base.origin);
  const destination = stationById.get(base.destination);
  const hasCompleteSearch = Boolean(
    origin &&
    destination &&
    origin.stationId !== destination.stationId &&
    params.get("date"),
  );

  if (!hasCompleteSearch) {
    return (
      <div className="page">
        <div className="card empty-state">
          <SearchX />
          <h1>{t("pages.search.formRequiredTitle")}</h1>
          <p>{t("pages.search.formRequiredText")}</p>
          <Button onClick={() => setSearchOpen(true)}>
            {t("pages.search.openSearch")}
          </Button>
        </div>
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent
            className="max-h-[92vh] w-[min(1240px,calc(100%_-_32px))] max-w-none overflow-y-auto p-4 lg:p-7"
            closeLabel={t("common.actions.close")}
          >
            <div className="pe-12">
              <DialogTitle>{t("pages.search.formRequiredTitle")}</DialogTitle>
              <DialogDescription>
                {t("pages.search.formRequiredText")}
              </DialogDescription>
            </div>
            <SearchCard />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card flex flex-col md:flex-row items-start justify-between gap-[15px] px-[30px] py-[26px] lg:items-center">
        <div className="min-w-0">
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
              base.adults === 1
                ? "components.searchCard.adult"
                : "components.searchCard.adults",
              { count: base.adults },
            )}
            {base.children
              ? ` · ${t(
                  base.children === 1
                    ? "components.searchCard.child"
                    : "components.searchCard.children",
                  { count: base.children },
                )}`
              : ""}
            {base.infants
              ? ` · ${t(
                  base.infants === 1
                    ? "components.searchCard.infant"
                    : "components.searchCard.infants",
                  { count: base.infants },
                )}`
              : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          className="h-auto w-full max-w-full shrink-0 whitespace-normal break-words text-center leading-snug md:w-auto md:min-w-24 md:max-w-64"
          asChild
        >
          <Link href="/">{t("pages.search.edit")}</Link>
        </Button>
      </section>
      {base.mode !== "tatkal" && (
        <div
          className="-mx-4 my-7 overflow-x-auto [scrollbar-width:thin] lg:mx-auto lg:px-4"
          aria-label={t("pages.search.datesLabel")}
        >
          <div className="flex w-max min-w-full snap-x snap-mandatory justify-center gap-3 px-4 lg:px-0">
            {dateOptions.map(({ value, recommendedFare }) => {
              const d = new Date(`${value}T00:00:00`);
              return (
                <button
                  key={value}
                  className={cn(
                    "min-w-32 shrink-0 snap-center rounded-md border border-[var(--line)] bg-white p-4 text-center",
                    value === date ? "date-active" : "",
                  )}
                  onClick={() => setDate(value)}
                >
                  <div>
                    {d.toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </div>
                  {recommendedFare !== undefined ? (
                    <strong className="mt-1 block">
                      {t("pages.search.recommendedFare", {
                        amount: recommendedFare.toLocaleString(locale),
                      })}
                    </strong>
                  ) : (
                    <strong className="mt-1 block">
                      {t("pages.search.fareUnavailable")}
                    </strong>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="results-toolbar mt-6 flex flex-col md:flex-row">
        <div className="">
          <h3>{t("pages.search.found", { count: results.length })}</h3>
          <div className="flex flex-wrap items-center gap-2 [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0">
            {modes.map((x) => (
              <button onClick={() => toggle(x, modes, setModes)} key={x}>
                <Badge variant="success">{t(`pages.search.${x}`)} ×</Badge>
              </button>
            ))}
            {transfers.map((x) => (
              <button
                onClick={() => toggle(x, transfers, setTransfers)}
                key={x}
              >
                <Badge variant="success">
                  {x === 0
                    ? t("pages.search.directChip")
                    : t("pages.search.transferChip", {
                        count: `${x}${x === 2 ? "+" : ""}`,
                      })}{" "}
                  ×
                </Badge>
              </button>
            ))}
            {departurePeriod && (
              <button onClick={() => setDeparturePeriod(null)}>
                <Badge variant="success">{departurePeriod} departures ×</Badge>
              </button>
            )}
            {modes.length ||
            transfers.length ||
            onlyAvailable ||
            departurePeriod ? (
              <button
                onClick={() => {
                  setModes([]);
                  setTransfers([]);
                  setOnlyAvailable(false);
                  setDeparturePeriod(null);
                }}
              >
                <Badge variant="outline">
                  {t("common.actions.clearFilters")}
                </Badge>
              </button>
            ) : null}
          </div>
        </div>
        <label className="flex gap-2 items-center">
          <p className="w-20">{t("pages.search.sort")}</p>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">
                {t("pages.search.sortRecommended")}
              </SelectItem>
              <SelectItem value="fastest">
                {t("pages.search.sortFastest")}
              </SelectItem>
              <SelectItem value="cheapest">
                {t("pages.search.sortCheapest")}
              </SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="mt-[34px] grid grid-cols-1 gap-[34px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="rounded-xl border-0 bg-white p-[18px] lg:rounded-none lg:border-e lg:border-[var(--line)] lg:bg-transparent lg:p-0 lg:pe-6 [&_h3]:flex [&_h3]:items-center [&_h3]:gap-2 [&_section]:border-b [&_section]:border-[var(--line)] [&_section]:py-5"
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
                  <Checkbox
                    checked={modes.includes(x)}
                    onCheckedChange={() => toggle(x, modes, setModes)}
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
                  <Checkbox
                    checked={transfers.includes(x)}
                    onCheckedChange={() => toggle(x, transfers, setTransfers)}
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
                <Checkbox
                  checked={onlyAvailable}
                  onCheckedChange={(checked) =>
                    setOnlyAvailable(checked === true)
                  }
                />
                {t("pages.search.availabilityOnly")}
              </label>
              <label>
                <Checkbox />
                {t("pages.search.wheelchair")}
              </label>
              <label>
                <Checkbox />
                {t("pages.search.charging")}
              </label>
            </div>
          </section>
        </aside>
        <div className="grid gap-5">
          {loading ? (
            <SearchLoadingState label={t("pages.search.loading")} />
          ) : results.length ? (
            results.map((x) => (
              <JourneyCard key={x.id} journey={x} input={input} />
            ))
          ) : (
            <div className="card empty-state">
              <SearchX />
              <h2>{t("pages.search.emptyTitle")}</h2>
              <p>{t("pages.search.emptyText")}</p>
              <Button
                onClick={() => {
                  setModes([]);
                  setTransfers([]);
                  setOnlyAvailable(false);
                  setMaxFare(10000);
                }}
              >
                {t("pages.search.alternatives")}
              </Button>
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
          <SearchLoadingState label={t("pages.search.loading")} />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
