"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, TrainFront } from "lucide-react";
import { savedBookings } from "@/lib/storage";
import type { Booking } from "@/lib/types";
import { useApp } from "@/components/providers";

export default function BookingPage() {
  const { t } = useApp();
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
          <Link className="btn btn-primary" href="/my-trips">
            {t("pages.booking.openTrips")}
          </Link>
        </div>
      </div>
    );
  return (
    <div className="page">
      <section className="card checkout-section text-center">
        <CheckCircle2 size={58} color="#087a32" className="mx-auto" />
        <span className="eyebrow">{t("pages.booking.verified")}</span>
        <h1>{t("pages.booking.confirmed")}</h1>
        <p className="lede">{t("pages.booking.pnr", { pnr: booking.pnr })}</p>
        <p className="microcopy">{t("pages.booking.pnrNote")}</p>
      </section>
      <section className="card checkout-section mt-6">
        <div className="journey-top">
          <div>
            <h2>
              <TrainFront /> {booking.journey.legs[0]?.serviceName}
            </h2>
            <p>
              {booking.date} · {booking.travelClass} · {booking.quota}
            </p>
          </div>
          <span className="badge badge-success">
            {t("common.status.confirmed")}
          </span>
        </div>
        <div className="route-line">
          <strong>
            {booking.journey.departure}
            <small>{booking.journey.origin.name}</small>
          </strong>
          <span className="line" />
          <span>→</span>
          <span className="line" />
          <strong>
            {booking.journey.arrival}
            <small>{booking.journey.destination.name}</small>
          </strong>
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
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Download /> {t("pages.booking.print")}
          </button>
          <Link className="btn btn-primary" href="/my-trips">
            {t("pages.booking.goTrips")}
          </Link>
        </div>
      </section>
    </div>
  );
}
