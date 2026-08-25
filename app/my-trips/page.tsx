"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CircleHelp,
  Download,
  MapPin,
  RotateCcw,
  Ticket,
  XCircle,
} from "lucide-react";
import { saveStorage, savedBookings, storageKeys } from "@/lib/storage";
import type { Booking } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tab = "upcoming" | "completed" | "cancelled";
export default function MyTripsPage() {
  const { language, t } = useApp();
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const [tab, setTab] = useState<Tab>("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  useEffect(() => setBookings(savedBookings()), []);
  const cancel = (id: string) => {
    const next = bookings.map((x) =>
      x.bookingId === id
        ? {
            ...x,
            bookingStatus: "cancelled" as const,
            cancelledAt: new Date().toISOString(),
            paymentStatus: "refunded" as const,
            refundAmount: Math.round(x.fare * 0.85),
          }
        : x,
    );
    setBookings(next);
    saveStorage(storageKeys.bookings, next);
  };
  const shown = bookings.filter((x) => x.bookingStatus === tab);
  return (
    <div className="page">
      <h1>{t("pages.myTrips.title")}</h1>
      <p className="lede">{t("pages.myTrips.subtitle")}</p>
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="my-[30px] flex gap-7 border-b border-[var(--line)]">
          {(["upcoming", "completed", "cancelled"] as const).map((x) => (
            <TabsTrigger
              className="border-0 border-b-[3px] border-transparent bg-transparent px-1 py-[14px] text-[1.1rem] font-bold data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary-dark)]"
              key={x}
              value={x}
            >
              {t(`pages.myTrips.tabs.${x}`)}{" "}
              <Badge variant="secondary">
                {bookings.filter((b) => b.bookingStatus === x).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid gap-[18px]">
        {shown.length ? (
          shown.map((b) => (
            <article className="card trip-card" key={b.bookingId}>
              <div className="journey-top">
                <div>
                  <Badge
                    variant={tab === "cancelled" ? "destructive" : "success"}
                  >
                    {t(
                      tab === "cancelled"
                        ? "common.status.cancelled"
                        : "common.status.confirmed",
                    )}
                  </Badge>{" "}
                  <span>PNR: {b.pnr}</span>
                  <h2>{b.journey.legs[0]?.serviceName}</h2>
                </div>
                <div>
                  <span className="muted">{t("pages.myTrips.departure")}</span>
                  <h3>
                    {b.date}, {b.journey.departure}
                  </h3>
                </div>
              </div>
              <div className="trip-route">
                <div>
                  <strong>{b.journey.origin.code}</strong>
                  <p>{b.journey.origin.name}</p>
                </div>
                <div>
                  <strong>{b.journey.destination.code}</strong>
                  <p>{b.journey.destination.name}</p>
                </div>
              </div>
              {tab === "cancelled" && (
                <div className="payment-state">
                  <strong>
                    {t("pages.myTrips.refund", { status: b.paymentStatus })}
                  </strong>
                  <p>
                    ₹{b.refundAmount?.toLocaleString(locale)} ·{" "}
                    {t("pages.myTrips.cancellationDate", {
                      date: b.cancelledAt?.slice(0, 10) ?? "",
                    })}
                  </p>
                </div>
              )}
              <div className="journey-actions">
                <Button asChild>
                  <Link href={`/booking/${b.pnr}`}>
                    <Ticket />
                    {t("pages.myTrips.viewTicket")}
                  </Link>
                </Button>
                {tab === "upcoming" && (
                  <>
                    <Button variant="secondary">
                      <MapPin />
                      {t("pages.myTrips.track")}
                    </Button>
                    <Button variant="ghost" onClick={() => cancel(b.bookingId)}>
                      <XCircle />
                      {t("pages.myTrips.cancel")}
                    </Button>
                  </>
                )}
                {tab === "completed" && (
                  <>
                    <Button variant="secondary">
                      <RotateCcw />
                      {t("pages.myTrips.bookAgain")}
                    </Button>
                    <Button variant="ghost" onClick={() => window.print()}>
                      <Download />
                      {t("pages.myTrips.download")}
                    </Button>
                  </>
                )}
                <Button variant="ghost">
                  <CircleHelp />
                  {t("pages.myTrips.help")}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="card empty-state">
            <Ticket />
            <h2>
              {t("pages.myTrips.empty", {
                tab: t(`pages.myTrips.tabs.${tab}`).toLowerCase(),
              })}
            </h2>
            <p>
              {tab === "upcoming"
                ? t("pages.myTrips.emptyUpcoming")
                : t("pages.myTrips.emptyOther", {
                    tab: t(`pages.myTrips.tabs.${tab}`).toLowerCase(),
                  })}
            </p>
            <Button asChild>
              <Link href="/">{t("common.actions.planJourney")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
