"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Compass, Search } from "lucide-react";
import { cityById, tourism } from "@/lib/tourism-data";
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

const categories = [
  "All",
  "heritage",
  "spiritual",
  "weekend",
  "local_food",
  "nature",
  "adventure",
];
export default function TourismPage() {
  const { locale, t } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [season, setSeason] = useState("Any");
  const [maxBudget, setMaxBudget] = useState(30000);
  const results = useMemo(
    () =>
      tourism
        .filter((x) => {
          const city = cityById.get(x.cityId);
          const estimate =
            x.attractions.reduce((s, a) => s + a.fromPrice, 0) + 5000;
          return (
            `${x.title} ${city?.name} ${x.themes.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (category === "All" || x.themes.includes(category)) &&
            (season === "Any" || x.bestMonths.includes(season)) &&
            estimate <= maxBudget
          );
        })
        .slice(0, 18),
    [query, category, season, maxBudget],
  );
  return (
    <div className="page">
      <section
        className="tourism-hero"
        style={{ backgroundImage: "url('/images/tourism-hero.webp')" }}
      >
        <div>
          <span className="eyebrow">
            {t("pages.tourism.discovery.eyebrow")}
          </span>
          <h1>{t("pages.tourism.discovery.title")}</h1>
          <p>{t("pages.tourism.discovery.subtitle")}</p>
          <Button asChild>
            <Link href="/tourism/plan">
              {t("pages.tourism.discovery.build")}
            </Link>
          </Button>
        </div>
      </section>
      <section className="card checkout-section mt-6">
        <div className="passenger-form">
          <label className="full">
            {t("pages.tourism.discovery.search")}
            <span className="input-icon">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                {[
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
                ].map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`common.months.${x}`)}
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
              onChange={(e) => setMaxBudget(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="theme-chips mt-4">
          {categories.map((x) => (
            <button
              key={x}
              className="border-0 bg-transparent p-0"
              onClick={() => setCategory(x)}
            >
              <Badge variant={category === x ? "default" : "outline"}>
                {t(
                  `pages.tourism.discovery.categories.${x === "All" ? "all" : x.replace("_", "")}`,
                )}
              </Badge>
            </button>
          ))}
        </div>
      </section>
      <div className="results-toolbar mt-8">
        <h2>
          {t("pages.tourism.discovery.destinations", { count: results.length })}
        </h2>
        <span className="muted">{t("pages.tourism.discovery.instant")}</span>
      </div>
      <section className="mt-7 grid grid-cols-1 gap-[22px] lg:grid-cols-3">
        {results.map((d, i) => {
          const city = cityById.get(d.cityId);
          return (
            <article className="card tourism-card" key={d.destinationId}>
              <div
                className="tourism-image"
                style={{
                  backgroundImage: `url('/images/destination-${(i % 4) + 1}.webp')`,
                }}
              />
              <div className="content">
                <span className="eyebrow">{city?.state}</span>
                <h3>{city?.name}</h3>
                <p className="muted">
                  {t("pages.tourism.discovery.bestIn", {
                    months: d.bestMonths
                      .slice(0, 3)
                      .map((month) => t(`common.months.${month}`))
                      .join(", "),
                    count: d.attractions.length,
                  })}
                </p>
                <div className="theme-chips">
                  {d.themes.map((x) => (
                    <Badge variant="secondary" key={x}>
                      {t(
                        `pages.tourism.discovery.categories.${x.replace("_", "")}`,
                      )}
                    </Badge>
                  ))}
                </div>
                <Button className="mt-4 w-full" asChild>
                  <Link href={`/tourism/${d.destinationId}`}>
                    {t("pages.tourism.discovery.explore")}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </section>
      {!results.length && (
        <div className="card empty-state">
          <Compass />
          <h2>{t("pages.tourism.discovery.empty")}</h2>
          <Button
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
    </div>
  );
}
