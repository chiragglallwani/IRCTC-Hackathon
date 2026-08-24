"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cityById } from "@/lib/data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary } from "@/lib/types";
import { useApp } from "@/components/providers";

const plannerValueKeys: Record<string, string> = {
  Family: "family",
  Couple: "couple",
  Solo: "solo",
  "Senior-friendly": "senior",
  Relaxed: "relaxed",
  Balanced: "balanced",
  Packed: "packed",
  Train: "train",
  "Train + local transport": "trainLocal",
  Bus: "bus",
};
export default function ItineraryPage() {
  const { language, t } = useApp();
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [paid, setPaid] = useState(false);
  useEffect(
    () => setItinerary(savedItineraries().find((x) => x.id === id) ?? null),
    [id],
  );
  const recalc = (next: Itinerary) => {
    const activities = next.days
      .flatMap((d) => d.activities)
      .reduce((s, a) => s + a.fromPrice, 0);
    const serviceFee = Math.round(
      (next.costs.transport + next.costs.accommodation + activities) * 0.03,
    );
    next = {
      ...next,
      costs: {
        ...next.costs,
        activities,
        serviceFee,
        total:
          next.costs.transport +
          next.costs.accommodation +
          activities +
          next.costs.meals +
          serviceFee,
      },
    };
    setItinerary(next);
    const all = savedItineraries().map((x) => (x.id === next.id ? next : x));
    saveStorage(storageKeys.itineraries, all);
  };
  if (!itinerary)
    return (
      <div className="page">
        <div className="card empty-state">
          <h2>{t("pages.tourism.itinerary.notFound")}</h2>
          <Link className="btn btn-primary" href="/tourism/plan">
            {t("pages.tourism.itinerary.create")}
          </Link>
        </div>
      </div>
    );
  const act = (
    dayIndex: number,
    activityIndex: number,
    type: "remove" | "up" | "down" | "replace",
  ) => {
    const days = structuredClone(itinerary.days);
    const list = days[dayIndex].activities;
    if (type === "remove") list.splice(activityIndex, 1);
    else if (type === "replace")
      list[activityIndex] = {
        ...list[activityIndex],
        name: t("pages.tourism.itinerary.alternative", {
          category: list[activityIndex].category,
        }),
        fromPrice: Math.max(100, list[activityIndex].fromPrice - 150),
      };
    else {
      const target = type === "up" ? activityIndex - 1 : activityIndex + 1;
      if (target >= 0 && target < list.length)
        [list[activityIndex], list[target]] = [
          list[target],
          list[activityIndex],
        ];
    }
    recalc({ ...itinerary, days });
  };
  const confirm = () => {
    const next = { ...itinerary, confirmed: true };
    recalc(next);
    setPaid(true);
  };
  return (
    <div className="page">
      <span className="eyebrow">{t("pages.tourism.itinerary.eyebrow")}</span>
      <h1>
        {t("pages.tourism.itinerary.title", {
          city: cityById.get(itinerary.destination.cityId)?.name ?? "",
          count: itinerary.days.length,
        })}
      </h1>
      <p className="lede">
        {t("pages.tourism.itinerary.subtitle", {
          start: itinerary.startDate,
          end: itinerary.endDate,
          style: t(
            `pages.tourism.planner.${plannerValueKeys[itinerary.style] ?? "family"}`,
          ),
          pace: t(
            `pages.tourism.planner.${plannerValueKeys[itinerary.pace] ?? "balanced"}`,
          ),
        })}
      </p>
      <div className="destination-layout">
        <div className="stack">
          {itinerary.days.map((day, di) => (
            <section className="card itinerary-day" key={day.day}>
              <h2>
                {t("pages.tourism.itinerary.day", {
                  day: day.day,
                  title: day.title,
                })}
              </h2>
              {day.activities.map((a, ai) => (
                <div className="activity" key={`${a.attractionId}-${ai}`}>
                  <strong>{a.time}</strong>
                  <div>
                    <h3>{a.name}</h3>
                    <p className="muted">
                      {t("pages.tourism.itinerary.activityMeta", {
                        hours: Math.round(a.durationMinutes / 60),
                        price: a.fromPrice,
                        minutes: a.travelMinutes,
                        transport: t(
                          `pages.tourism.planner.${plannerValueKeys[a.transportation] ?? "train"}`,
                        ),
                      })}
                    </p>
                  </div>
                  <div className="activity-actions">
                    <button
                      aria-label={t("common.actions.moveUp")}
                      onClick={() => act(di, ai, "up")}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      aria-label={t("common.actions.moveDown")}
                      onClick={() => act(di, ai, "down")}
                    >
                      <ArrowDown />
                    </button>
                    <button
                      aria-label={t("common.actions.replace")}
                      onClick={() => act(di, ai, "replace")}
                    >
                      <RefreshCw />
                    </button>
                    <button
                      aria-label={t("common.actions.remove")}
                      onClick={() => act(di, ai, "remove")}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <aside className="card summary-card">
          <h2>{t("pages.tourism.itinerary.cost")}</h2>
          <div className="fare-lines">
            <div>
              <span>
                {t("pages.tourism.itinerary.transport")}{" "}
                <small>{t("pages.tourism.itinerary.included")}</small>
              </span>
              <strong>₹{itinerary.costs.transport}</strong>
            </div>
            <div>
              <span>
                {t("pages.tourism.itinerary.accommodation")}{" "}
                <small>{t("pages.tourism.itinerary.included")}</small>
              </span>
              <strong>₹{itinerary.costs.accommodation}</strong>
            </div>
            <div>
              <span>
                {t("pages.tourism.itinerary.activities")}{" "}
                <small>{t("pages.tourism.itinerary.included")}</small>
              </span>
              <strong>₹{itinerary.costs.activities}</strong>
            </div>
            <div>
              <span>
                {t("pages.tourism.itinerary.meals")}{" "}
                <small>{t("pages.tourism.itinerary.estimated")}</small>
              </span>
              <strong>₹{itinerary.costs.meals}</strong>
            </div>
            <div>
              <span>{t("pages.tourism.itinerary.serviceFee")}</span>
              <strong>₹{itinerary.costs.serviceFee}</strong>
            </div>
            <div className="fare-total">
              <span>{t("pages.tourism.itinerary.total")}</span>
              <span>
                ₹
                {itinerary.costs.total.toLocaleString(
                  language === "hi" ? "hi-IN" : "en-IN",
                )}
              </span>
            </div>
          </div>
          <p className="microcopy">
            {t("pages.tourism.itinerary.notIncluded")}
          </p>
          <button className="btn btn-primary w-full" onClick={confirm}>
            {t(
              itinerary.confirmed
                ? "common.status.confirmed"
                : "pages.tourism.itinerary.confirm",
            )}
          </button>
          {paid && (
            <div className="payment-state success">
              <CheckCircle2 />
              <strong>{t("pages.tourism.itinerary.confirmed")}</strong>
              <p>{t("pages.tourism.itinerary.saved")}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
