"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  TrainFront,
  Users,
} from "lucide-react";
import { savedBookings } from "@/lib/storage";
import type { Booking } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateFareBreakdown, formatDuration } from "@/lib/search";

function formatClockTime(value: string, locale: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function formatJourneyDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function BookingPage() {
  const { locale, t } = useApp();
  const { pnr } = useParams<{ pnr: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  useEffect(
    () =>
      setBooking(
        savedBookings().find((x) => x.pnr === decodeURIComponent(pnr)) ?? null,
      ),
    [pnr],
  );
  if (!booking)
    return (
      <div className="page">
        <div className="card empty-state">
          <h2>{t("pages.booking.notFound")}</h2>
          <p>{t("pages.booking.notFoundText")}</p>
          <Button asChild>
            <Link href="/my-trips">{t("pages.booking.openTrips")}</Link>
          </Button>
        </div>
      </div>
    );
  const fareBreakdown = booking.fareBreakdown ?? {
    baseFare: booking.journey.totalFare,
    ...calculateFareBreakdown(booking.journey.totalFare, booking.quota),
  };
  return (
    <div className="page">
      <section className="card checkout-section text-center">
        <Badge
          variant="success"
          className="mx-auto px-4 py-2 text-sm sm:text-base"
        >
          <CheckCircle2 />
          {t("pages.booking.confirmed")}
        </Badge>
        <h1 className="mt-4 text-2xl sm:text-3xl">
          {t("pages.booking.pnr", { pnr: booking.pnr })}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("pages.booking.verified")} · {t("pages.booking.pnrNote")}
        </p>
      </section>
      <section className="card checkout-section mt-6">
        <div className="journey-top">
          <div>
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              <TrainFront className="size-4" />
              {t("pages.booking.journeyDetails")}
            </span>
            <h2 className="mt-2">{booking.journey.legs[0]?.serviceName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatJourneyDate(booking.date, locale)}
            </p>
          </div>
          <Badge
            variant="success"
            className="justify-self-start self-start px-3 py-2 text-sm md:justify-self-end"
          >
            <CheckCircle2 />
            {t("common.status.confirmed")}
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div className="rounded-xl border border-[var(--line)] bg-[#f8faff] p-4">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              <MapPin className="size-4" />
              {t("components.journeyRoute.departure")}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3>{booking.journey.origin.name}</h3>
              <Badge variant="outline">{booking.journey.origin.code}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <strong className="text-xl text-[var(--primary-dark)]">
                {formatClockTime(booking.journey.departure, locale)}
              </strong>
              <span className="text-sm text-[var(--muted)]">
                {t("components.journeyRoute.platform", { platform: 1 })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 px-1 text-center md:w-40">
            <span className="h-px flex-1 bg-[#b7c3dd]" />
            <Badge variant="secondary" className="whitespace-nowrap">
              <Clock3 />
              {formatDuration(booking.journey.durationMinutes)}
            </Badge>
            <span className="h-px flex-1 bg-[#b7c3dd]" />
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[#f8faff] p-4 md:text-end">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)] md:justify-end">
              <MapPin className="size-4" />
              {t("components.journeyRoute.arrival")}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2 md:justify-end">
              <h3>{booking.journey.destination.name}</h3>
              <Badge variant="outline">
                {booking.journey.destination.code}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 md:justify-end">
              <strong className="text-xl text-[var(--primary-dark)]">
                {formatClockTime(booking.journey.arrival, locale)}
              </strong>
              <span className="text-sm text-[var(--muted)]">
                {t("components.journeyRoute.platform", {
                  platform: 1 + booking.journey.legs.length,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
          <Badge variant="outline">{booking.travelClass}</Badge>
          <Badge variant="outline">{booking.quota}</Badge>
          {fareBreakdown.discount > 0 && (
            <Badge variant="success">
              {t("pages.booking.discountApplied", {
                amount: fareBreakdown.discount.toLocaleString(locale),
              })}
            </Badge>
          )}
          <Badge variant="secondary">
            {t("pages.booking.totalPaid", {
              amount: fareBreakdown.total.toLocaleString(locale),
            })}
          </Badge>
        </div>

        <div className="mt-7 flex items-center gap-2">
          <Users className="size-5 text-[var(--primary)]" />
          <h3>{t("pages.booking.passengers")}</h3>
          <Badge variant="secondary">{booking.passengers.length}</Badge>
        </div>
        <div className="passenger-cards">
          {booking.passengers.map((p) => (
            <div className="passenger-card" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>
                  {t("pages.checkout.passengers.passengerSummary", {
                    age: p.age,
                    gender: t(`common.gender.${p.gender}`),
                    berth: p.berth,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="journey-actions mt-6">
          <Button variant="secondary" onClick={() => window.print()}>
            <Download /> {t("pages.booking.print")}
          </Button>
          <Button asChild>
            <Link href="/my-trips">{t("pages.booking.goTrips")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
