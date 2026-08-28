"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Sparkles,
  TrainFront,
  Users,
  Utensils,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { cityById, hotels, tourism } from "@/lib/tourism-data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary, ItineraryDay } from "@/lib/types";
import { useApp } from "@/components/providers";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const accommodationStars: Record<string, number> = {
  Budget: 3,
  "3-star": 3,
  "4-star": 4,
  Luxury: 5,
};

function Planner() {
  const { language, locale, t } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const initialDestination = tourism.some(
    (item) => item.destinationId === params.get("destination"),
  )
    ? params.get("destination")!
    : tourism[0].destinationId;
  const [destinationId, setDestinationId] = useState(initialDestination);
  const [startDate, setStartDate] = useState("2026-10-12");
  const [endDate, setEndDate] = useState("2026-10-15");
  const [budget, setBudget] = useState(35000);
  const [style, setStyle] = useState("Family");
  const [pace, setPace] = useState("Balanced");
  const [travelMode, setTravelMode] = useState("Train + local transport");
  const [accommodation, setAccommodation] = useState("4-star");
  const [mealPlan, setMealPlan] = useState("Breakfast + dinner");
  const [travelers, setTravelers] = useState(2);
  const [rooms, setRooms] = useState(1);

  const destination = tourism.find(
    (item) => item.destinationId === destinationId,
  )!;
  const destinationHotels = hotels.filter(
    (hotel) => hotel.cityId === destination.cityId,
  );
  const selectedHotel =
    destinationHotels.find(
      (hotel) => hotel.starRating === accommodationStars[accommodation],
    ) ?? destinationHotels[0];
  const dayCount = Math.max(
    1,
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
    ) + 1,
  );
  const nights = Math.max(0, dayCount - 1);

  const estimate = useMemo(() => {
    const activityMultiplier =
      pace === "Relaxed" ? 0.75 : pace === "Packed" ? 1.35 : 1;
    const activities = Math.round(
      destination.attractions.reduce(
        (total, attraction) => total + attraction.fromPrice,
        0,
      ) *
        travelers *
        activityMultiplier,
    );
    const lodging = (selectedHotel?.fromPrice ?? 1800) * nights * rooms;
    const transportRate =
      travelMode === "Bus" ? 1200 : travelMode === "Train" ? 1800 : 2400;
    const transport = transportRate * travelers;
    const mealRate =
      mealPlan === "No meals" ? 0 : mealPlan === "Breakfast" ? 350 : 850;
    const meals = mealRate * dayCount * travelers;
    const serviceFee = Math.round(
      (activities + lodging + transport + meals) * 0.03,
    );
    return {
      transport,
      accommodation: lodging,
      activities,
      meals,
      serviceFee,
      total: transport + lodging + activities + meals + serviceFee,
    };
  }, [
    destination,
    selectedHotel,
    nights,
    rooms,
    travelMode,
    travelers,
    mealPlan,
    dayCount,
    pace,
  ]);

  const generate = () => {
    const activitiesPerDay = pace === "Relaxed" ? 1 : pace === "Packed" ? 3 : 2;
    const days: ItineraryDay[] = Array.from(
      { length: dayCount },
      (_, dayIndex) => ({
        day: dayIndex + 1,
        title:
          dayIndex === 0
            ? t("pages.tourism.planner.arrival")
            : dayIndex === dayCount - 1
              ? t("pages.tourism.planner.departure")
              : t("pages.tourism.planner.highlights", {
                  city: cityById.get(destination.cityId)?.name ?? "",
                }),
        activities: Array.from(
          { length: activitiesPerDay },
          (_, activityIndex) => {
            const attraction =
              destination.attractions[
                (dayIndex * activitiesPerDay + activityIndex) %
                  destination.attractions.length
              ];
            return {
              ...attraction,
              attractionId: `${attraction.attractionId}-${dayIndex}-${activityIndex}`,
              time: ["09:30", "14:00", "17:30"][activityIndex] ?? "18:30",
              travelMinutes: 15 + activityIndex * 10,
              transportation: travelMode,
            };
          },
        ),
      }),
    );
    const itinerary: Itinerary = {
      id: `itinerary-${Date.now()}`,
      destination,
      startDate,
      endDate,
      style,
      pace,
      travelers,
      rooms,
      travelMode,
      accommodationType: accommodation,
      mealPlan,
      hotel: selectedHotel,
      days,
      costs: estimate,
      confirmed: false,
    };
    saveStorage(storageKeys.itineraries, [itinerary, ...savedItineraries()]);
    router.push(`/tourism/itinerary/${itinerary.id}`);
  };

  const overBudget = estimate.total > budget;

  return (
    <div className="page">
      <Link
        href={`/tourism/${destinationId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]"
      >
        <ArrowLeft className="size-4" /> {t("pages.tourism.planner.back")}
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-4 bg-[#e5f7f4] text-[#075b55]">
            <Sparkles /> {t("pages.tourism.planner.eyebrow")}
          </Badge>
          <h1>{t("pages.tourism.planner.title")}</h1>
          <p className="lede max-w-2xl">
            {t("pages.tourism.planner.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="grid size-9 place-items-center rounded-full bg-[#eef4ff] text-[var(--primary)]">
            <Check />
          </span>
          <div>
            <strong className="block">
              {t("pages.tourism.planner.flexibleBooking")}
            </strong>
            <span className="text-slate-500">
              {t("pages.tourism.planner.saveBeforePay")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <main className="grid gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="grid size-10 place-items-center rounded-full bg-[#0b6b63] font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-xl">
                  {t("pages.tourism.planner.whereWhen")}
                </h2>
                <p className="text-sm text-slate-500">
                  {t("pages.tourism.planner.whereWhenHint")}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                {t("pages.tourism.planner.destination")}
                <Select value={destinationId} onValueChange={setDestinationId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tourism.map((item) => (
                      <SelectItem
                        key={item.destinationId}
                        value={item.destinationId}
                      >
                        {cityById.get(item.cityId)?.name} — {item.title}
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
                {t("pages.tourism.planner.travelers")}
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={travelers}
                  onChange={(event) =>
                    setTravelers(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
              <label>
                {t("pages.tourism.planner.rooms")}
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={rooms}
                  onChange={(event) =>
                    setRooms(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="grid size-10 place-items-center rounded-full bg-[#0b6b63] font-bold text-white">
                2
              </span>
              <div>
                <h2 className="text-xl">
                  {t("pages.tourism.planner.yourStyle")}
                </h2>
                <p className="text-sm text-slate-500">
                  {t("pages.tourism.planner.yourStyleHint")}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
              <label className="sm:col-span-2">
                {t("pages.tourism.planner.mealPlan")}
                <Select value={mealPlan} onValueChange={setMealPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No meals">
                      {t("pages.tourism.planner.noMeals")}
                    </SelectItem>
                    <SelectItem value="Breakfast">
                      {t("pages.tourism.planner.breakfast")}
                    </SelectItem>
                    <SelectItem value="Breakfast + dinner">
                      {t("pages.tourism.planner.breakfastDinner")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="grid size-10 place-items-center rounded-full bg-[#0b6b63] font-bold text-white">
                3
              </span>
              <div>
                <h2 className="text-xl">
                  {t("pages.tourism.planner.budgetTitle")}
                </h2>
                <p className="text-sm text-slate-500">
                  {t("pages.tourism.planner.budgetHint")}
                </p>
              </div>
            </div>
            <label className="mt-5">
              <span className="flex items-center justify-between">
                <span>{t("pages.tourism.planner.budgetLabel")}</span>
                <strong className="text-lg text-[#075b55]">
                  ₹{budget.toLocaleString(locale)}
                </strong>
              </span>
              <input
                type="range"
                min="8000"
                max="120000"
                step="1000"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
            </label>
            {overBudget && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">
                {t("pages.tourism.planner.overBudget", {
                  amount: (estimate.total - budget).toLocaleString(locale),
                })}
              </p>
            )}
          </section>
        </main>

        <aside className="sticky top-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.1)]">
          <div className="bg-[#073f3a] p-6 text-white">
            <span className="text-sm text-white/70">
              {t("pages.tourism.planner.liveEstimate")}
            </span>
            <strong className="mt-1 block text-3xl">
              ₹{estimate.total.toLocaleString(locale)}
            </strong>
            <span className="mt-1 block text-sm text-white/70">
              ₹{Math.round(estimate.total / travelers).toLocaleString(locale)}{" "}
              {t("pages.tourism.destination.perPerson")}
            </span>
          </div>
          <div className="p-6">
            <h3>{cityById.get(destination.cityId)?.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {dayCount} days · {nights} nights
            </p>
            <div className="my-5 grid gap-3 border-y border-slate-100 py-5 text-sm">
              <div className="flex items-center gap-3">
                <CalendarDays className="size-5 text-[#0b6b63]" />
                <span>
                  {startDate} → {endDate}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="size-5 text-[#0b6b63]" />
                <span>
                  {travelers} travelers · {rooms} rooms
                </span>
              </div>
              <div className="flex items-center gap-3">
                <TrainFront className="size-5 text-[#0b6b63]" />
                <span>{travelMode}</span>
              </div>
              <div className="flex items-center gap-3">
                <BedDouble className="size-5 text-[#0b6b63]" />
                <span>{selectedHotel?.name ?? accommodation}</span>
              </div>
              <div className="flex items-center gap-3">
                <Utensils className="size-5 text-[#0b6b63]" />
                <span>{mealPlan}</span>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t("pages.tourism.itinerary.transport")}
                </span>
                <span>₹{estimate.transport.toLocaleString(locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t("pages.tourism.itinerary.accommodation")}
                </span>
                <span>₹{estimate.accommodation.toLocaleString(locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t("pages.tourism.itinerary.activities")}
                </span>
                <span>₹{estimate.activities.toLocaleString(locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t("pages.tourism.itinerary.meals")}
                </span>
                <span>₹{estimate.meals.toLocaleString(locale)}</span>
              </div>
            </div>
            <Button
              className="mt-6 w-full bg-[#0b6b63] hover:bg-[#075b55]"
              onClick={generate}
            >
              <WandSparkles /> {t("pages.tourism.planner.generate")}{" "}
              <ArrowRight />
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              {t("pages.tourism.planner.noPaymentYet")}
            </p>
          </div>
        </aside>
      </div>
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
