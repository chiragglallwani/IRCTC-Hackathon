"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BedDouble,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";
import { cityById } from "@/lib/tourism-data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const { locale, t, user } = useApp();
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookedNow, setBookedNow] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "pay_later"
  >("upi");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    setItinerary(savedItineraries().find((item) => item.id === id) ?? null);
  }, [id]);

  const saveItinerary = (next: Itinerary) => {
    setItinerary(next);
    const stored = savedItineraries();
    const exists = stored.some((item) => item.id === next.id);
    saveStorage(
      storageKeys.itineraries,
      exists
        ? stored.map((item) => (item.id === next.id ? next : item))
        : [next, ...stored],
    );
  };

  const recalc = (next: Itinerary) => {
    const travelers = next.travelers ?? 1;
    const activities =
      next.days
        .flatMap((day) => day.activities)
        .reduce((total, activity) => total + activity.fromPrice, 0) * travelers;
    const serviceFee = Math.round(
      (next.costs.transport +
        next.costs.accommodation +
        activities +
        next.costs.meals) *
        0.03,
    );
    saveItinerary({
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
    });
  };

  if (!itinerary)
    return (
      <div className="page">
        <div className="card empty-state">
          <MapPin />
          <h2>{t("pages.tourism.itinerary.notFound")}</h2>
          <Button asChild>
            <Link href="/tourism/plan">
              {t("pages.tourism.itinerary.create")}
            </Link>
          </Button>
        </div>
      </div>
    );

  const city = cityById.get(itinerary.destination.cityId);
  const travelers = itinerary.travelers ?? 1;
  const rooms = itinerary.rooms ?? 1;
  const booked = itinerary.confirmed;
  const cancelled = itinerary.bookingStatus === "cancelled";

  const act = (
    dayIndex: number,
    activityIndex: number,
    type: "remove" | "up" | "down" | "replace",
  ) => {
    if (booked) return;
    const days = structuredClone(itinerary.days);
    const activities = days[dayIndex].activities;
    if (type === "remove") activities.splice(activityIndex, 1);
    else if (type === "replace")
      activities[activityIndex] = {
        ...activities[activityIndex],
        name: t("pages.tourism.itinerary.alternative", {
          category: activities[activityIndex].category,
        }),
        fromPrice: Math.max(100, activities[activityIndex].fromPrice - 150),
      };
    else {
      const target = type === "up" ? activityIndex - 1 : activityIndex + 1;
      if (target >= 0 && target < activities.length)
        [activities[activityIndex], activities[target]] = [
          activities[target],
          activities[activityIndex],
        ];
    }
    recalc({ ...itinerary, days });
  };

  const confirmBooking = () => {
    if (
      name.trim().length < 2 ||
      !email.includes("@") ||
      phone.trim().length < 8
    ) {
      setBookingError(t("pages.tourism.itinerary.contactError"));
      return;
    }
    if (!termsAccepted) {
      setBookingError(t("pages.tourism.itinerary.termsError"));
      return;
    }
    const next: Itinerary = {
      ...itinerary,
      confirmed: true,
      bookingStatus: "confirmed",
      bookingReference:
        itinerary.bookingReference ?? `RTP-${Date.now().toString().slice(-8)}`,
      bookedAt: new Date().toISOString(),
      paymentMethod,
      contact: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    };
    saveItinerary(next);
    setBookingOpen(false);
    setBookedNow(true);
  };

  return (
    <div className="page">
      <Link
        href="/tourism/plan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]"
      >
        <ArrowLeft className="size-4" /> {t("pages.tourism.itinerary.back")}
      </Link>

      <section className="mt-5 overflow-hidden rounded-[28px] bg-[#073f3a] p-6 text-white sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-4 border-white/15 bg-white/10 text-white">
              <Sparkles />{" "}
              {booked
                ? t(
                    cancelled
                      ? "pages.tourism.itinerary.cancelledPackage"
                      : "pages.tourism.itinerary.bookedPackage",
                  )
                : t("pages.tourism.itinerary.eyebrow")}
            </Badge>
            <h1 className="text-white">
              {city?.name} · {itinerary.days.length} days
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              {itinerary.startDate} → {itinerary.endDate} ·{" "}
              {t(
                `pages.tourism.planner.${plannerValueKeys[itinerary.style] ?? "family"}`,
              )}{" "}
              ·{" "}
              {t(
                `pages.tourism.planner.${plannerValueKeys[itinerary.pace] ?? "balanced"}`,
              )}
            </p>
          </div>
          {booked ? (
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <span className="text-xs uppercase tracking-wider text-white/60">
                {t("pages.tourism.itinerary.bookingReference")}
              </span>
              <strong className="mt-1 block text-xl">
                {itinerary.bookingReference}
              </strong>
            </div>
          ) : (
            <Badge className="bg-[#ffcb66] px-4 py-2 text-[#17202a]">
              {t("pages.tourism.itinerary.draft")}
            </Badge>
          )}
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#9ee6dd]" /> {travelers} travelers
          </div>
          <div className="flex items-center gap-2">
            <BedDouble className="size-4 text-[#9ee6dd]" /> {rooms} rooms
          </div>
          <div className="flex items-center gap-2">
            <TrainFront className="size-4 text-[#9ee6dd]" />{" "}
            {itinerary.travelMode ?? "Train"}
          </div>
          <div className="flex items-center gap-2">
            <Utensils className="size-4 text-[#9ee6dd]" />{" "}
            {itinerary.mealPlan ?? "Breakfast"}
          </div>
        </div>
      </section>

      {bookedNow && (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 text-emerald-700" />
            <div>
              <strong className="text-emerald-950">
                {t("pages.tourism.itinerary.confirmed")}
              </strong>
              <p className="mt-1 text-sm text-emerald-800">
                {t("pages.tourism.itinerary.confirmedText", {
                  reference: itinerary.bookingReference ?? "",
                })}
              </p>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/tourism/bookings">
              {t("pages.tourism.itinerary.viewBookings")} <ArrowRight />
            </Link>
          </Button>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <main className="grid gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow text-[#0b6b63]">
                {t("pages.tourism.itinerary.dayByDay")}
              </span>
              <h2 className="mt-2">{t("pages.tourism.itinerary.yourPlan")}</h2>
            </div>
            {!booked && (
              <span className="text-sm text-slate-500">
                {t("pages.tourism.itinerary.editHint")}
              </span>
            )}
          </div>
          {itinerary.days.map((day, dayIndex) => (
            <section
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              key={day.day}
            >
              <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-full bg-[#0b6b63] font-bold text-white">
                  {day.day}
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0b6b63]">
                    {t("pages.tourism.itinerary.dayLabel", { day: day.day })}
                  </span>
                  <h2 className="text-xl">{day.title}</h2>
                </div>
              </div>
              <div className="p-5">
                {day.activities.length ? (
                  day.activities.map((activity, activityIndex) => (
                    <div
                      className="grid gap-3 border-b border-slate-100 py-5 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[76px_1fr_auto] sm:items-start"
                      key={`${activity.attractionId}-${activityIndex}`}
                    >
                      <strong className="flex items-center gap-2 text-[#075b55]">
                        <Clock3 className="size-4" /> {activity.time}
                      </strong>
                      <div>
                        <h3>{activity.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {Math.round(activity.durationMinutes / 60)}h · ₹
                          {activity.fromPrice.toLocaleString(locale)} per person
                          · {activity.travelMinutes} min by{" "}
                          {activity.transportation}
                        </p>
                      </div>
                      {!booked && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.actions.moveUp")}
                            disabled={activityIndex === 0}
                            onClick={() => act(dayIndex, activityIndex, "up")}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.actions.moveDown")}
                            disabled={
                              activityIndex === day.activities.length - 1
                            }
                            onClick={() => act(dayIndex, activityIndex, "down")}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.actions.replace")}
                            onClick={() =>
                              act(dayIndex, activityIndex, "replace")
                            }
                          >
                            <RefreshCw />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.actions.remove")}
                            onClick={() =>
                              act(dayIndex, activityIndex, "remove")
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-5 text-center text-slate-500">
                    {t("pages.tourism.itinerary.freeDay")}
                  </p>
                )}
              </div>
            </section>
          ))}
        </main>

        <aside className="sticky top-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.1)]">
          <div className="border-b border-slate-100 p-6">
            <span className="text-sm text-slate-500">
              {booked
                ? t("pages.tourism.itinerary.totalPaid")
                : t("pages.tourism.itinerary.cost")}
            </span>
            <strong className="mt-1 block text-3xl">
              ₹{itinerary.costs.total.toLocaleString(locale)}
            </strong>
            <span className="text-sm text-slate-500">
              ₹
              {Math.round(itinerary.costs.total / travelers).toLocaleString(
                locale,
              )}{" "}
              {t("pages.tourism.destination.perPerson")}
            </span>
          </div>
          <div className="p-6">
            <div className="grid gap-3 text-sm">
              {[
                [
                  t("pages.tourism.itinerary.transport"),
                  itinerary.costs.transport,
                ],
                [
                  t("pages.tourism.itinerary.accommodation"),
                  itinerary.costs.accommodation,
                ],
                [
                  t("pages.tourism.itinerary.activities"),
                  itinerary.costs.activities,
                ],
                [t("pages.tourism.itinerary.meals"), itinerary.costs.meals],
                [
                  t("pages.tourism.itinerary.serviceFee"),
                  itinerary.costs.serviceFee,
                ],
              ].map(([label, amount]) => (
                <div className="flex justify-between gap-4" key={String(label)}>
                  <span className="text-slate-500">{label}</span>
                  <strong>₹{Number(amount).toLocaleString(locale)}</strong>
                </div>
              ))}
            </div>
            <div className="my-5 rounded-xl bg-[#f3faf8] p-4 text-sm">
              <strong>{t("pages.tourism.itinerary.includedTitle")}</strong>
              <div className="mt-3 grid gap-2 text-slate-600">
                <span className="flex gap-2">
                  <Check className="size-4 text-[#0b6b63]" />{" "}
                  {itinerary.hotel?.name ?? itinerary.accommodationType}
                </span>
                <span className="flex gap-2">
                  <Check className="size-4 text-[#0b6b63]" />{" "}
                  {itinerary.travelMode ?? "Train"}
                </span>
                <span className="flex gap-2">
                  <Check className="size-4 text-[#0b6b63]" />{" "}
                  {itinerary.mealPlan ?? "Breakfast"}
                </span>
              </div>
            </div>
            {booked ? (
              <Button className="w-full" variant="secondary" asChild>
                <Link href="/tourism/bookings">
                  {t("pages.tourism.itinerary.viewBookings")} <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full bg-[#0b6b63] hover:bg-[#075b55]"
                onClick={() => setBookingOpen(true)}
              >
                {t("pages.tourism.itinerary.bookNow")} <ArrowRight />
              </Button>
            )}
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="size-4" />{" "}
              {t("pages.tourism.itinerary.secureBooking")}
            </p>
          </div>
        </aside>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent
          className="max-h-[92vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto p-0"
          closeLabel={t("common.actions.close")}
        >
          <div className="bg-[#073f3a] p-6 text-white">
            <Badge className="bg-white/10 text-white">
              <ShieldCheck /> {t("pages.tourism.itinerary.secureCheckout")}
            </Badge>
            <DialogTitle className="mt-4 text-2xl text-white">
              {t("pages.tourism.itinerary.completeBooking")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-white/70">
              {city?.name} · {itinerary.days.length} days · ₹
              {itinerary.costs.total.toLocaleString(locale)}
            </DialogDescription>
          </div>
          <div className="grid gap-6 p-6">
            <section>
              <h3>{t("pages.tourism.itinerary.leadTraveler")}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  {t("common.fields.name")}
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                  />
                </label>
                <label>
                  {t("common.fields.email")}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  {t("common.fields.phone")}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="10-digit mobile number"
                  />
                </label>
              </div>
            </section>
            <section>
              <h3>{t("pages.tourism.itinerary.paymentMethod")}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["upi", "UPI"],
                  ["card", t("pages.tourism.itinerary.card")],
                  ["pay_later", t("pages.tourism.itinerary.payLater")],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={cn(
                      "rounded-xl border p-4 text-start",
                      paymentMethod === value
                        ? "border-2 border-[#0b6b63] bg-[#f3faf8]"
                        : "border-slate-200",
                    )}
                    onClick={() =>
                      setPaymentMethod(value as "upi" | "card" | "pay_later")
                    }
                  >
                    <CreditCard className="size-5 text-[#0b6b63]" />
                    <strong className="mt-2 block">{label}</strong>
                  </button>
                ))}
              </div>
            </section>
            <label className="flex cursor-pointer grid-cols-none items-start gap-3 rounded-xl bg-slate-50 p-4 font-normal">
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked === true)
                }
              />
              <span>{t("pages.tourism.itinerary.acceptTerms")}</span>
            </label>
            {bookingError && <p className="form-error">{bookingError}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setBookingOpen(false)}>
                {t("common.actions.close")}
              </Button>
              <Button
                className="bg-[#0b6b63] hover:bg-[#075b55]"
                onClick={confirmBooking}
              >
                <ShieldCheck />{" "}
                {t("pages.tourism.itinerary.confirmAndPay", {
                  amount: itinerary.costs.total.toLocaleString(locale),
                })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
