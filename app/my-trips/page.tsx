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
      <div className="trip-tabs" role="tablist">
        {(["upcoming", "completed", "cancelled"] as const).map((x) => (
          <button
            role="tab"
            aria-selected={tab === x}
            className={tab === x ? "active" : ""}
            key={x}
            onClick={() => setTab(x)}
          >
            {t(`pages.myTrips.tabs.${x}`)}{" "}
            <span className="badge badge-blue">
              {bookings.filter((b) => b.bookingStatus === x).length}
            </span>
          </button>
        ))}
      </div>
      <div className="trip-list">
        {shown.length ? (
          shown.map((b) => (
            <article className="card trip-card" key={b.bookingId}>
              <div className="journey-top">
                <div>
                  <span
                    className={`badge ${tab === "cancelled" ? "badge-danger" : "badge-success"}`}
                  >
                    {t(
                      tab === "cancelled"
                        ? "common.status.cancelled"
                        : "common.status.confirmed",
                    )}
                  </span>{" "}
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
                <Link className="btn btn-primary" href={`/booking/${b.pnr}`}>
                  <Ticket />
                  {t("pages.myTrips.viewTicket")}
                </Link>
                {tab === "upcoming" && (
                  <>
                    <button className="btn btn-secondary">
                      <MapPin />
                      {t("pages.myTrips.track")}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => cancel(b.bookingId)}
                    >
                      <XCircle />
                      {t("pages.myTrips.cancel")}
                    </button>
                  </>
                )}
                {tab === "completed" && (
                  <>
                    <button className="btn btn-secondary">
                      <RotateCcw />
                      {t("pages.myTrips.bookAgain")}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => window.print()}
                    >
                      <Download />
                      {t("pages.myTrips.download")}
                    </button>
                  </>
                )}
                <button className="btn btn-ghost">
                  <CircleHelp />
                  {t("pages.myTrips.help")}
                </button>
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
            <Link className="btn btn-primary" href="/">
              {t("common.actions.planJourney")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
