"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WandSparkles } from "lucide-react";
import { cityById, hotels, tourism } from "@/lib/tourism-data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary, ItineraryDay } from "@/lib/types";
import { useApp } from "@/components/providers";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
function Planner() {
  const { language, locale, t } = useApp();
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
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tourism.map((x) => (
                  <SelectItem key={x.destinationId} value={x.destinationId}>
                    {cityById.get(x.cityId)?.name} — {x.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            {t("pages.tourism.planner.start")}
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              language={language}
              ariaLabel={t("pages.tourism.planner.start")}
            />
          </label>
          <label>
            {t("pages.tourism.planner.end")}
            <DatePicker
              min={startDate}
              value={endDate}
              onChange={setEndDate}
              language={language}
              ariaLabel={t("pages.tourism.planner.end")}
            />
          </label>
          <label>
            {t("pages.tourism.planner.budget", {
              amount: budget.toLocaleString(locale),
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
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Family">
                  {t("pages.tourism.planner.family")}
                </SelectItem>
                <SelectItem value="Couple">
                  {t("pages.tourism.planner.couple")}
                </SelectItem>
                <SelectItem value="Solo">
                  {t("pages.tourism.planner.solo")}
                </SelectItem>
                <SelectItem value="Senior-friendly">
                  {t("pages.tourism.planner.senior")}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            {t("pages.tourism.planner.pace")}
            <Select value={pace} onValueChange={setPace}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Relaxed">
                  {t("pages.tourism.planner.relaxed")}
                </SelectItem>
                <SelectItem value="Balanced">
                  {t("pages.tourism.planner.balanced")}
                </SelectItem>
                <SelectItem value="Packed">
                  {t("pages.tourism.planner.packed")}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            {t("pages.tourism.planner.mode")}
            <Select value={travelMode} onValueChange={setTravelMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Train">
                  {t("pages.tourism.planner.train")}
                </SelectItem>
                <SelectItem value="Train + local transport">
                  {t("pages.tourism.planner.trainLocal")}
                </SelectItem>
                <SelectItem value="Bus">
                  {t("pages.tourism.planner.bus")}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            {t("pages.tourism.planner.stay")}
            <Select value={accommodation} onValueChange={setAccommodation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Budget">
                  {t("pages.tourism.planner.budgetStay")}
                </SelectItem>
                <SelectItem value="3-star">
                  {t("pages.tourism.planner.threeStar")}
                </SelectItem>
                <SelectItem value="4-star">
                  {t("pages.tourism.planner.fourStar")}
                </SelectItem>
                <SelectItem value="Luxury">
                  {t("pages.tourism.planner.luxury")}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button className="full" onClick={generate}>
            <WandSparkles />
            {t("pages.tourism.planner.generate")}
          </Button>
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
