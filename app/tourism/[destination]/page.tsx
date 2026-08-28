"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, IndianRupee, MapPinned, TrainFront } from "lucide-react";
import { destinationDetails } from "@/lib/tourism-data";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function DestinationPage() {
  const { locale, t } = useApp();
  const { id } = useParams<{ id: string }>();
  const details = destinationDetails(id);
  if (!details)
    return (
      <div className="page">
        <div className="card empty-state">
          <h2>{t("pages.tourism.destination.notFound")}</h2>
          <Button asChild>
            <Link href="/tourism">
              {t("pages.tourism.destination.explore")}
            </Link>
          </Button>
        </div>
      </div>
    );
  const { destination, city, station, hotels } = details;
  const estimate =
    destination.attractions.reduce((s, a) => s + a.fromPrice, 0) +
    (hotels[0]?.fromPrice ?? 2000) * 3;
  return (
    <div className="page">
      <section
        className="tourism-hero"
        style={{ backgroundImage: "url('/images/destination-hero.webp')" }}
      >
        <div>
          <h1>{city?.name}</h1>
          <p>
            {destination.title} · {city?.state}
          </p>
          <Badge variant="secondary">
            <CalendarDays /> {t("pages.tourism.destination.days")}
          </Badge>{" "}
          <Badge variant="secondary">
            <IndianRupee />
            {t("pages.tourism.destination.from", {
              amount: estimate.toLocaleString(locale),
            })}
          </Badge>
        </div>
      </section>
      <div className="destination-layout">
        <div className="stack">
          <section className="card checkout-section">
            <h2>{t("pages.tourism.destination.overview")}</h2>
            <p className="lede">
              {t("pages.tourism.destination.overviewText", {
                city: city?.name ?? "",
              })}
            </p>
            <div className="theme-chips mt-4">
              {destination.themes.map((x) => (
                <Badge variant="secondary" key={x}>
                  {t(
                    `pages.tourism.discovery.categories.${x.replace("_", "")}`,
                  )}
                </Badge>
              ))}
            </div>
          </section>
          <section className="card checkout-section">
            <h2>{t("pages.tourism.destination.bestTime")}</h2>
            <div className="feature-grid">
              {destination.bestMonths.slice(0, 3).map((x, i) => (
                <div className="feature" key={x}>
                  <strong>
                    {i === 0
                      ? t("pages.tourism.destination.peak")
                      : i === 1
                        ? t("pages.tourism.destination.shoulder")
                        : t("pages.tourism.destination.quieter")}
                  </strong>
                  <p>{t(`common.months.${x}`)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="card checkout-section">
            <h2>{t("pages.tourism.destination.suggested")}</h2>
            {destination.attractions.map((a, i) => (
              <div className="timeline-leg" key={a.attractionId}>
                <div className="timeline-dot">{i + 1}</div>
                <div>
                  <h3>
                    {t("pages.tourism.destination.day", {
                      day: i + 1,
                      name: a.name,
                    })}
                  </h3>
                  <p className="muted">
                    {t("pages.tourism.destination.hours", {
                      hours: Math.round(a.durationMinutes / 60),
                      price: a.fromPrice,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </div>
        <aside className="stack">
          <section className="card checkout-section">
            <h3>
              {t("pages.tourism.destination.journeyTo", {
                city: city?.name ?? "",
              })}
            </h3>
            <p>
              <TrainFront />{" "}
              {t("pages.tourism.destination.nearest", {
                station: station?.name ?? "",
                code: station?.code ?? "",
              })}
            </p>
            <Button className="w-full" asChild>
              <Link href={`/?destination=${station?.stationId}`}>
                {t("pages.tourism.destination.searchTrains")}
              </Link>
            </Button>
          </section>
          <section className="card checkout-section">
            <h3>{t("pages.tourism.destination.stay")}</h3>
            {hotels.slice(0, 3).map((x) => (
              <div className="quota-detail" key={x.hotelId}>
                <div>
                  <strong>{x.name}</strong>
                  <p>
                    {t("pages.tourism.destination.hotel", {
                      stars: x.starRating,
                      score: x.reviewScore,
                    })}
                  </p>
                </div>
                <strong>₹{x.fromPrice}</strong>
              </div>
            ))}
          </section>
          <Button asChild>
            <Link
              href={`/tourism/plan?destination=${destination.destinationId}`}
            >
              <MapPinned />
              {t("pages.tourism.destination.customize")}
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
