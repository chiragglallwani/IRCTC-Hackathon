"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  BriefcaseBusiness,
} from "lucide-react";
import { cityById, hotels, tourism } from "@/lib/tourism-data";
import { savedItineraries } from "@/lib/storage";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "heritage",
  "spiritual",
  "weekend",
  "local_food",
  "nature",
  "adventure",
];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function destinationImage(destinationId: string) {
  const number = Number(destinationId.match(/\d+/)?.[0] ?? 1);
  return `/images/destination-${((number - 1) % 4) + 1}.webp`;
}

export default function TourismPage() {
  const { locale, t } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [season, setSeason] = useState("Any");
  const [maxBudget, setMaxBudget] = useState(30000);
  const [bookedCount, setBookedCount] = useState(0);

  useEffect(() => {
    setBookedCount(
      savedItineraries().filter(
        (item) => item.confirmed && item.bookingStatus !== "cancelled",
      ).length,
    );
  }, []);

  const results = useMemo(
    () =>
      tourism
        .filter((destination) => {
          const city = cityById.get(destination.cityId);
          const hotel = hotels.find(
            (item) => item.cityId === destination.cityId,
          );
          const estimate =
            destination.attractions.reduce(
              (total, attraction) => total + attraction.fromPrice,
              0,
            ) +
            (hotel?.fromPrice ?? 2000) * 3;
          return (
            `${destination.title} ${destination.summary ?? ""} ${city?.name} ${city?.state} ${destination.themes.join(" ")} ${destination.attractions.map((attraction) => attraction.name).join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (category === "All" || destination.themes.includes(category)) &&
            (season === "Any" || destination.bestMonths.includes(season)) &&
            estimate <= maxBudget
          );
        })
        .slice(0, 18),
    [query, category, season, maxBudget],
  );

  return (
    <div className="page">
      <section className="relative isolate min-h-[520px] overflow-hidden rounded-[28px] bg-[#062c48] text-white shadow-[0_30px_80px_rgba(6,44,72,0.22)]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('/images/tourism-hero.webp')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,27,46,.96)_0%,rgba(3,27,46,.78)_42%,rgba(3,27,46,.15)_100%)]" />
        <div className="relative z-10 flex min-h-[520px] max-w-3xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
          <Badge className="mb-5 w-fit border-white/20 bg-white/10 text-white backdrop-blur">
            <Sparkles /> {t("pages.tourism.discovery.eyebrow")}
          </Badge>
          <h1 className="max-w-2xl text-white">
            {t("pages.tourism.discovery.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
            {t("pages.tourism.discovery.subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="bg-[#ffcb66] text-[#17202a] hover:bg-[#ffbf47]"
              asChild
            >
              <Link href="/tourism/plan">
                {t("pages.tourism.discovery.build")} <ArrowRight />
              </Link>
            </Button>
            <Button
              className="border-white/35 bg-white/10 text-white hover:bg-white/20"
              variant="outline"
              asChild
            >
              <Link href="/tourism/bookings">
                <BriefcaseBusiness /> {t("pages.tourism.discovery.bookings")}
                {bookedCount > 0 && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#062c48]">
                    {bookedCount}
                  </span>
                )}
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/20 pt-6 text-sm text-white/75">
            <div>
              <strong className="block text-xl text-white">80+</strong>
              {t("pages.tourism.discovery.places")}
            </div>
            <div>
              <strong className="block text-xl text-white">100%</strong>
              {t("pages.tourism.discovery.customizable")}
            </div>
            <div>
              <strong className="block text-xl text-white">24×7</strong>
              {t("pages.tourism.discovery.support")}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-10 max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,.12)] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label>
            {t("pages.tourism.discovery.search")}
            <span className="input-icon">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("pages.tourism.discovery.searchPlaceholder")}
              />
            </span>
          </label>
          <label>
            {t("pages.tourism.discovery.bestMonth")}
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">{t("common.months.any")}</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {t(`common.months.${month}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            {t("pages.tourism.discovery.maxBudget", {
              amount: maxBudget.toLocaleString(locale),
            })}
            <input
              type="range"
              min="5000"
              max="50000"
              step="2500"
              value={maxBudget}
              onChange={(event) => setMaxBudget(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="me-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <SlidersHorizontal className="size-4" />
            {t("pages.tourism.discovery.tripType")}
          </span>
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                category === item
                  ? "border-[#0b6b63] bg-[#e5f7f4] text-[#075b55]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
              )}
              onClick={() => setCategory(item)}
            >
              {t(
                `pages.tourism.discovery.categories.${item === "All" ? "all" : item.replace("_", "")}`,
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow text-[#0b6b63]">
              {t("pages.tourism.discovery.handpicked")}
            </span>
            <h2 className="mt-2">
              {t("pages.tourism.discovery.destinations", {
                count: results.length,
              })}
            </h2>
          </div>
          <p className="max-w-md text-sm text-[var(--muted)] sm:text-end">
            {t("pages.tourism.discovery.instant")}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {results.map((destination) => {
            const city = cityById.get(destination.cityId);
            const hotel = hotels.find(
              (item) => item.cityId === destination.cityId,
            );
            const estimate =
              destination.attractions.reduce(
                (total, attraction) => total + attraction.fromPrice,
                0,
              ) +
              (hotel?.fromPrice ?? 2000) * 3;
            return (
              <article
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                key={destination.destinationId}
              >
                <Link
                  href={`/tourism/${destination.destinationId}`}
                  className="block"
                >
                  <div className="relative h-56 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `url('${destination.heroImage ?? destinationImage(destination.destinationId)}')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <Badge className="absolute left-4 top-4 bg-white text-slate-800">
                      <Star className="fill-[#f59e0b] text-[#f59e0b]" /> 4.8
                    </Badge>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/75">
                        <MapPin className="size-3.5" /> {city?.state}
                      </span>
                      <h3 className="mt-1 text-2xl">{city?.name}</h3>
                    </div>
                  </div>
                </Link>
                <div className="p-5">
                  {destination.summary && (
                    <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-600">
                      {destination.summary}
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm leading-6 text-slate-600">
                      {t("pages.tourism.discovery.bestIn", {
                        months: destination.bestMonths
                          .slice(0, 3)
                          .map((month) => t(`common.months.${month}`))
                          .join(", "),
                        count: destination.attractions.length,
                      })}
                    </p>
                    <div className="shrink-0 text-end">
                      <span className="block text-xs text-slate-500">
                        {t("pages.tourism.discovery.from")}
                      </span>
                      <strong className="text-lg">
                        ₹{estimate.toLocaleString(locale)}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {destination.themes.slice(0, 3).map((theme) => (
                      <Badge variant="secondary" key={theme}>
                        {t(
                          `pages.tourism.discovery.categories.${theme.replace("_", "")}`,
                        )}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="size-4" /> 4D / 3N
                    </span>
                    <Button variant="link" asChild>
                      <Link href={`/tourism/${destination.destinationId}`}>
                        {t("pages.tourism.discovery.explore")} <ArrowRight />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {!results.length && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Compass className="mx-auto size-12 text-[#0b6b63]" />
          <h2 className="mt-4">{t("pages.tourism.discovery.empty")}</h2>
          <p className="mt-2 text-slate-500">
            {t("pages.tourism.discovery.emptyHint")}
          </p>
          <Button
            className="mt-5"
            variant="secondary"
            onClick={() => {
              setQuery("");
              setCategory("All");
              setSeason("Any");
              setMaxBudget(50000);
            }}
          >
            {t("common.actions.clearFilters")}
          </Button>
        </div>
      )}

      <section className="mt-16 grid gap-4 rounded-[28px] bg-[#073f3a] p-6 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <span className="flex items-center gap-2 text-sm font-semibold text-[#9ee6dd]">
            <ShieldCheck className="size-5" />{" "}
            {t("pages.tourism.discovery.promise")}
          </span>
          <h2 className="mt-3 max-w-2xl text-white">
            {t("pages.tourism.discovery.ctaTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            {t("pages.tourism.discovery.ctaText")}
          </p>
        </div>
        <Button className="bg-white text-[#073f3a] hover:bg-[#e5f7f4]" asChild>
          <Link href="/tourism/plan">
            {t("pages.tourism.discovery.build")} <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
