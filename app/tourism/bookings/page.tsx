"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  ReceiptText,
  BriefcaseBusiness,
  Users,
  XCircle,
} from "lucide-react";
import { cityById } from "@/lib/tourism-data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Filter = "all" | "confirmed" | "cancelled";

function destinationImage(destinationId: string) {
  const number = Number(destinationId.match(/\d+/)?.[0] ?? 1);
  return `/images/destination-${((number - 1) % 4) + 1}.webp`;
}

export default function TourismBookingsPage() {
  const { locale, t } = useApp();
  const [packages, setPackages] = useState<Itinerary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [cancelling, setCancelling] = useState<Itinerary | null>(null);

  useEffect(() => {
    setPackages(
      savedItineraries()
        .filter((item) => item.confirmed)
        .sort((a, b) => (b.bookedAt ?? "").localeCompare(a.bookedAt ?? "")),
    );
  }, []);

  const visiblePackages = useMemo(
    () =>
      packages.filter((item) => {
        const status = item.bookingStatus ?? "confirmed";
        return filter === "all" || status === filter;
      }),
    [packages, filter],
  );
  const confirmedCount = packages.filter(
    (item) => (item.bookingStatus ?? "confirmed") === "confirmed",
  ).length;

  const cancelPackage = () => {
    if (!cancelling) return;
    const next = { ...cancelling, bookingStatus: "cancelled" as const };
    const stored = savedItineraries().map((item) =>
      item.id === next.id ? next : item,
    );
    saveStorage(storageKeys.itineraries, stored);
    setPackages((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
    setCancelling(null);
  };

  return (
    <div className="page">
      <section className="overflow-hidden rounded-[28px] bg-[#073f3a] p-6 text-white sm:p-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-4 bg-white/10 text-white">
              <BriefcaseBusiness /> {t("pages.tourism.bookings.eyebrow")}
            </Badge>
            <h1 className="text-white">{t("pages.tourism.bookings.title")}</h1>
            <p className="mt-3 max-w-2xl text-white/70">
              {t("pages.tourism.bookings.subtitle")}
            </p>
          </div>
          <Button
            className="bg-white text-[#073f3a] hover:bg-[#e5f7f4]"
            asChild
          >
            <Link href="/tourism">
              <Plus /> {t("pages.tourism.bookings.exploreMore")}
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 sm:max-w-md">
          <div>
            <strong className="block text-2xl">{confirmedCount}</strong>
            <span className="text-sm text-white/60">
              {t("pages.tourism.bookings.upcoming")}
            </span>
          </div>
          <div>
            <strong className="block text-2xl">{packages.length}</strong>
            <span className="text-sm text-white/60">
              {t("pages.tourism.bookings.totalBookings")}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1">
          {(["all", "confirmed", "cancelled"] as Filter[]).map((item) => (
            <button
              type="button"
              key={item}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                filter === item
                  ? "bg-[#e5f7f4] text-[#075b55]"
                  : "text-slate-500 hover:text-slate-900",
              )}
              onClick={() => setFilter(item)}
            >
              {t(`pages.tourism.bookings.filters.${item}`)}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">
          {t("pages.tourism.bookings.showing", {
            count: visiblePackages.length,
          })}
        </span>
      </div>

      {visiblePackages.length ? (
        <div className="mt-6 grid gap-6">
          {visiblePackages.map((item) => {
            const city = cityById.get(item.destination.cityId);
            const cancelled = item.bookingStatus === "cancelled";
            return (
              <article
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                key={item.id}
              >
                <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="relative min-h-56 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${destinationImage(item.destination.destinationId)}')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <Badge
                      className={cn(
                        "absolute left-4 top-4",
                        cancelled
                          ? "bg-red-100 text-red-800"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {cancelled ? <XCircle /> : <CheckCircle2 />}
                      {t(
                        `pages.tourism.bookings.${cancelled ? "cancelled" : "confirmed"}`,
                      )}
                    </Badge>
                    <div className="absolute bottom-4 left-4 text-white">
                      <span className="flex items-center gap-1 text-xs text-white/70">
                        <MapPin className="size-3.5" /> {city?.state}
                      </span>
                      <h2 className="mt-1 text-2xl">{city?.name}</h2>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {t("pages.tourism.bookings.reference")}
                        </span>
                        <strong className="mt-1 block">
                          {item.bookingReference ?? item.id}
                        </strong>
                      </div>
                      <div className="sm:text-end">
                        <span className="text-xs text-slate-500">
                          {t("pages.tourism.bookings.amountPaid")}
                        </span>
                        <strong className="mt-1 block text-xl">
                          ₹{item.costs.total.toLocaleString(locale)}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-[#0b6b63]" />{" "}
                        {item.startDate}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock3 className="size-4 text-[#0b6b63]" />{" "}
                        {item.days.length} days
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="size-4 text-[#0b6b63]" />{" "}
                        {item.travelers ?? 1} travelers
                      </span>
                      <span className="flex items-center gap-2">
                        <BedDouble className="size-4 text-[#0b6b63]" />{" "}
                        {item.rooms ?? 1} rooms
                      </span>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <ReceiptText className="size-4" />{" "}
                        {item.hotel?.name ?? item.accommodationType}
                      </span>
                      <div className="flex gap-2">
                        {!cancelled && (
                          <Button
                            variant="ghost"
                            onClick={() => setCancelling(item)}
                          >
                            {t("pages.tourism.bookings.cancel")}
                          </Button>
                        )}
                        <Button variant="secondary" asChild>
                          <Link href={`/tourism/itinerary/${item.id}`}>
                            {t("pages.tourism.bookings.viewDetails")}{" "}
                            <ArrowRight />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <BriefcaseBusiness className="mx-auto size-12 text-[#0b6b63]" />
          <h2 className="mt-4">{t("pages.tourism.bookings.empty")}</h2>
          <p className="mt-2 text-slate-500">
            {t("pages.tourism.bookings.emptyText")}
          </p>
          <Button className="mt-5" asChild>
            <Link href="/tourism">
              {t("pages.tourism.bookings.exploreMore")}
            </Link>
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <DialogContent closeLabel={t("common.actions.close")}>
          <DialogTitle>{t("pages.tourism.bookings.cancelTitle")}</DialogTitle>
          <DialogDescription>
            {t("pages.tourism.bookings.cancelText", {
              city: cancelling
                ? (cityById.get(cancelling.destination.cityId)?.name ?? "")
                : "",
            })}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              {t("pages.tourism.bookings.keep")}
            </Button>
            <Button variant="destructive" onClick={cancelPackage}>
              {t("pages.tourism.bookings.confirmCancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
