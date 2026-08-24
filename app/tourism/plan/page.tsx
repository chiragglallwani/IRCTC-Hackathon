"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WandSparkles } from "lucide-react";
import { cityById, hotels, tourism } from "@/lib/data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary, ItineraryDay } from "@/lib/types";
import { useApp } from "@/components/providers";
function Planner() {
  const { language, t } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [destinationId, setDestinationId] = useState(
    params.get("destination") ?? tourism[0].destinationId,
  );
  const [startDate, setStartDate] = useState("2026-10-12");
  const [endDate, setEndDate] = useState("2026-10-15");
  const [budget, setBudget] = useState(25000);
  const [style, setStyle] = useState("Family");
  const [pace, setPace] = useState("Balanced");
  const [travelMode, setTravelMode] = useState("Train");
  const [accommodation, setAccommodation] = useState("3-star");
  const generate = () => {
    const destination = tourism.find((x) => x.destinationId === destinationId)!;
    const hotel = hotels.find((x) => x.cityId === destination.cityId);
    const dayCount = Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          86400000,
      ) + 1,
    );
    const days: ItineraryDay[] = Array.from({ length: dayCount }, (_, i) => ({
      day: i + 1,
      title:
        i === 0
          ? t("pages.tourism.planner.arrival")
          : i === dayCount - 1
            ? t("pages.tourism.planner.departure")
            : t("pages.tourism.planner.highlights", {
                city: cityById.get(destination.cityId)?.name ?? "",
              }),
      activities: destination.attractions
        .slice(
          i % destination.attractions.length,
          (i % destination.attractions.length) + 2,
        )
        .map((a, j) => ({
          ...a,
          time: j ? "14:30" : "09:30",
          travelMinutes: 20 + j * 10,
          transportation: travelMode,
        })),
    }));
    const activities = days
      .flatMap((d) => d.activities)
      .reduce((s, a) => s + a.fromPrice, 0);
    const lodging = (hotel?.fromPrice ?? 1800) * Math.max(0, dayCount - 1);
    const transport = Math.round(budget * 0.25);
    const meals = dayCount * 900;
    const serviceFee = Math.round((activities + lodging + transport) * 0.03);
    const itinerary: Itinerary = {
      id: `itinerary-${Date.now()}`,
      destination,
      startDate,
      endDate,
      style,
      pace,
      hotel,
      days,
      costs: {
        transport,
        accommodation: lodging,
        activities,
        meals,
        serviceFee,
        total: transport + lodging + activities + meals + serviceFee,
      },
      confirmed: false,
    };
    saveStorage(storageKeys.itineraries, [itinerary, ...savedItineraries()]);
    router.push(`/tourism/itinerary/${itinerary.id}`);
  };
  return (
    <div className="page">
      <span className="eyebrow">{t("pages.tourism.planner.eyebrow")}</span>
      <h1>{t("pages.tourism.planner.title")}</h1>
      <p className="lede">{t("pages.tourism.planner.subtitle")}</p>
      <section className="card checkout-section mt-8">
        <div className="passenger-form">
          <label className="full">
            {t("pages.tourism.planner.destination")}
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              {tourism.map((x) => (
                <option key={x.destinationId} value={x.destinationId}>
                  {cityById.get(x.cityId)?.name} — {x.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("pages.tourism.planner.start")}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            {t("pages.tourism.planner.end")}
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            {t("pages.tourism.planner.budget", {
              amount: budget.toLocaleString(
                language === "hi" ? "hi-IN" : "en-IN",
              ),
            })}
            <input
              type="range"
              min="8000"
              max="80000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>
          <label>
            {t("pages.tourism.planner.style")}
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="Family">
                {t("pages.tourism.planner.family")}
              </option>
              <option value="Couple">
                {t("pages.tourism.planner.couple")}
              </option>
              <option value="Solo">{t("pages.tourism.planner.solo")}</option>
              <option value="Senior-friendly">
                {t("pages.tourism.planner.senior")}
              </option>
            </select>
          </label>
          <label>
            {t("pages.tourism.planner.pace")}
            <select value={pace} onChange={(e) => setPace(e.target.value)}>
              <option value="Relaxed">
                {t("pages.tourism.planner.relaxed")}
              </option>
              <option value="Balanced">
                {t("pages.tourism.planner.balanced")}
              </option>
              <option value="Packed">
                {t("pages.tourism.planner.packed")}
              </option>
            </select>
          </label>
          <label>
            {t("pages.tourism.planner.mode")}
            <select
              value={travelMode}
              onChange={(e) => setTravelMode(e.target.value)}
            >
              <option value="Train">{t("pages.tourism.planner.train")}</option>
              <option value="Train + local transport">
                {t("pages.tourism.planner.trainLocal")}
              </option>
              <option value="Bus">{t("pages.tourism.planner.bus")}</option>
            </select>
          </label>
          <label>
            {t("pages.tourism.planner.stay")}
            <select
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
            >
              <option value="Budget">
                {t("pages.tourism.planner.budgetStay")}
              </option>
              <option value="3-star">
                {t("pages.tourism.planner.threeStar")}
              </option>
              <option value="4-star">
                {t("pages.tourism.planner.fourStar")}
              </option>
              <option value="Luxury">
                {t("pages.tourism.planner.luxury")}
              </option>
            </select>
          </label>
          <button className="btn btn-primary full" onClick={generate}>
            <WandSparkles />
            {t("pages.tourism.planner.generate")}
          </button>
        </div>
      </section>
    </div>
  );
}
export default function PlannerPage() {
  const { t } = useApp();
  return (
    <Suspense
      fallback={
        <div className="page">{t("pages.tourism.planner.opening")}</div>
      }
    >
      <Planner />
    </Suspense>
  );
}
