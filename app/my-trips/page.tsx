"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Download,
  History,
  MapPin,
  RotateCcw,
  Ticket,
  TrainFront,
  Users,
  XCircle,
} from "lucide-react";
import { saveStorage, savedBookings, storageKeys } from "@/lib/storage";
import type { Booking } from "@/lib/types";
import { calculateFareBreakdown, formatDuration } from "@/lib/journey-utils";
import { useApp } from "@/components/providers";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tab = "upcoming" | "completed" | "cancelled";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function formatClockTime(value: string, locale: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function paidTotal(booking: Booking) {
  return (
    booking.fareBreakdown?.total ??
    calculateFareBreakdown(booking.journey.totalFare, booking.quota).total
  );
}

export default function MyTripsPage() {
  const { locale, t } = useApp();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  useEffect(() => setBookings(savedBookings()), []);

  const cancel = (id: string) => {
    const next = bookings.map((booking) =>
      booking.bookingId === id
        ? {
            ...booking,
            bookingStatus: "cancelled" as const,
            cancelledAt: new Date().toISOString(),
            paymentStatus: "refunded" as const,
            refundAmount: Math.round(paidTotal(booking) * 0.85),
          }
        : booking,
    );
    setBookings(next);
    saveStorage(storageKeys.bookings, next);
    setBookingToCancel(null);
    setTab("cancelled");
  };

  const shown = bookings.filter((booking) => booking.bookingStatus === tab);
  const tabCounts = {
    upcoming: bookings.filter((booking) => booking.bookingStatus === "upcoming")
      .length,
    completed: bookings.filter(
      (booking) => booking.bookingStatus === "completed",
    ).length,
    cancelled: bookings.filter(
      (booking) => booking.bookingStatus === "cancelled",
    ).length,
  };

  return (
    <div className="page">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]">
            <Ticket className="size-4" />
            {t("pages.myTrips.manageBookings")}
          </span>
          <h1>{t("pages.myTrips.title")}</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            {t("pages.myTrips.subtitle")}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/">{t("pages.myTrips.planNewJourney")}</Link>
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="my-7 flex w-full gap-1 overflow-x-auto rounded-xl bg-[#eef1f5] p-1 sm:w-fit">
          {(["upcoming", "completed", "cancelled"] as const).map((status) => (
            <TabsTrigger
              className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 px-4 text-sm font-semibold text-[var(--muted)] transition data-[state=active]:bg-white data-[state=active]:text-[var(--primary-dark)] data-[state=active]:shadow-sm sm:flex-none"
              key={status}
              value={status}
            >
              {t(`pages.myTrips.tabs.${status}`)}
              <Badge
                variant={tab === status ? "default" : "secondary"}
                className="min-w-6 justify-center px-1.5"
              >
                {tabCounts[status]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-5">
        {shown.length ? (
          shown.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";
            const isCompleted = booking.bookingStatus === "completed";
            const statusVariant: BadgeVariant = isCancelled
              ? "destructive"
              : isCompleted
                ? "secondary"
                : "success";
            const StatusIcon = isCancelled
              ? XCircle
              : isCompleted
                ? History
                : CheckCircle2;
            const statusLabel = isCancelled
              ? t("common.status.cancelled")
              : isCompleted
                ? t("pages.myTrips.completedStatus")
                : t("common.status.confirmed");
            const amountPaid = paidTotal(booking);

            return (
              <article
                className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgba(25,28,30,0.06)] ${
                  isCancelled ? "border-red-200" : "border-[var(--line)]"
                }`}
                key={booking.bookingId}
              >
                <div
                  className={`h-1 ${
                    isCancelled
                      ? "bg-red-500"
                      : isCompleted
                        ? "bg-slate-400"
                        : "bg-[var(--success)]"
                  }`}
                />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant}>
                          <StatusIcon />
                          {statusLabel}
                        </Badge>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {t("pages.myTrips.pnr", { pnr: booking.pnr })}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <TrainFront className="size-5 shrink-0 text-[var(--primary)]" />
                        <h2 className="truncate text-xl sm:text-2xl">
                          {booking.journey.legs[0]?.serviceName}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-[#f8faff] px-4 py-3 md:text-end">
                      <CalendarDays className="size-5 shrink-0 text-[var(--primary)]" />
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {t("pages.myTrips.departure")}
                        </span>
                        <strong className="mt-0.5 block text-sm">
                          {formatDate(booking.date, locale)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(150px,0.45fr)_minmax(0,1fr)] md:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                        {t("common.fields.from")}
                      </span>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <strong className="text-2xl text-[var(--primary-dark)]">
                          {formatClockTime(booking.journey.departure, locale)}
                        </strong>
                        <Badge variant="outline">
                          {booking.journey.origin.code}
                        </Badge>
                      </div>
                      <p className="mt-1 font-medium">
                        {booking.journey.origin.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-center md:flex-col">
                      <span className="h-px flex-1 bg-[#b7c3dd] md:w-full md:flex-none" />
                      <Badge variant="secondary" className="shrink-0">
                        <Clock3 />
                        {formatDuration(booking.journey.durationMinutes)}
                      </Badge>
                      <ArrowRight className="hidden size-4 text-[var(--muted)] md:block" />
                      <span className="h-px flex-1 bg-[#b7c3dd] md:w-full md:flex-none" />
                    </div>

                    <div className="md:text-end">
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                        {t("common.fields.to")}
                      </span>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2 md:justify-end">
                        <strong className="text-2xl text-[var(--primary-dark)]">
                          {formatClockTime(booking.journey.arrival, locale)}
                        </strong>
                        <Badge variant="outline">
                          {booking.journey.destination.code}
                        </Badge>
                      </div>
                      <p className="mt-1 font-medium">
                        {booking.journey.destination.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-[#f8faff] p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3">
                      <Users className="size-5 text-[var(--primary)]" />
                      <div>
                        <span className="block text-xs text-[var(--muted)]">
                          {t("common.fields.passengers")}
                        </span>
                        <strong>{booking.passengers.length}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--muted)]">
                        {t("common.fields.class")}
                      </span>
                      <strong>{booking.travelClass}</strong>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--muted)]">
                        {t("common.fields.quota")}
                      </span>
                      <strong>{booking.quota}</strong>
                    </div>
                    <div className="sm:text-end">
                      <span className="block text-xs text-[var(--muted)]">
                        {t("pages.myTrips.amountPaid")}
                      </span>
                      <strong className="text-lg text-[var(--primary-dark)]">
                        ₹{amountPaid.toLocaleString(locale)}
                      </strong>
                    </div>
                  </div>

                  {isCancelled && (
                    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <strong>{t("pages.myTrips.refundProcessed")}</strong>
                        <p className="mt-1 text-red-900/70">
                          {t("pages.myTrips.cancellationDate", {
                            date: booking.cancelledAt
                              ? formatDate(booking.cancelledAt, locale)
                              : "",
                          })}
                        </p>
                      </div>
                      <strong className="text-lg">
                        ₹{booking.refundAmount?.toLocaleString(locale)}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[#fbfcfe] px-5 py-4 sm:flex-row sm:flex-wrap sm:px-6">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={`/booking/${booking.pnr}`}>
                      <Ticket />
                      {t("pages.myTrips.viewTicket")}
                    </Link>
                  </Button>
                  {booking.bookingStatus === "upcoming" && (
                    <>
                      <Button variant="secondary" className="w-full sm:w-auto">
                        <MapPin />
                        {t("pages.myTrips.track")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full text-red-700 hover:bg-red-50 sm:ms-auto sm:w-auto"
                        onClick={() => setBookingToCancel(booking)}
                      >
                        <XCircle />
                        {t("pages.myTrips.cancel")}
                      </Button>
                    </>
                  )}
                  {booking.bookingStatus === "completed" && (
                    <>
                      <Button variant="secondary" className="w-full sm:w-auto">
                        <RotateCcw />
                        {t("pages.myTrips.bookAgain")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => window.print()}
                      >
                        <Download />
                        {t("pages.myTrips.download")}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full sm:w-auto">
                    <CircleHelp />
                    {t("pages.myTrips.help")}
                  </Button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[#bfc5d4] bg-white px-5 py-14 text-center sm:px-10">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#eef3ff] text-[var(--primary)]">
              <Ticket className="size-8" />
            </span>
            <h2 className="mt-5">
              {t("pages.myTrips.empty", {
                tab: t(`pages.myTrips.tabs.${tab}`).toLowerCase(),
              })}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">
              {tab === "upcoming"
                ? t("pages.myTrips.emptyUpcoming")
                : t("pages.myTrips.emptyOther", {
                    tab: t(`pages.myTrips.tabs.${tab}`).toLowerCase(),
                  })}
            </p>
            <Button asChild className="mt-6">
              <Link href="/">{t("common.actions.planJourney")}</Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(open) => !open && setBookingToCancel(null)}
      >
        <DialogContent closeLabel={t("common.actions.close")}>
          <DialogHeader>
            <DialogTitle>{t("pages.myTrips.cancelTitle")}</DialogTitle>
            <DialogDescription>
              {t("pages.myTrips.cancelDescription", {
                pnr: bookingToCancel?.pnr ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          {bookingToCancel && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-sm text-amber-900/70">
                {t("pages.myTrips.estimatedRefund")}
              </span>
              <strong className="mt-1 block text-xl text-amber-950">
                ₹
                {Math.round(paidTotal(bookingToCancel) * 0.85).toLocaleString(
                  locale,
                )}
              </strong>
              <p className="mt-1 text-xs text-amber-900/70">
                {t("pages.myTrips.refundNote")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingToCancel(null)}>
              {t("pages.myTrips.keepBooking")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                bookingToCancel && cancel(bookingToCancel.bookingId)
              }
            >
              <XCircle />
              {t("pages.myTrips.confirmCancellation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
