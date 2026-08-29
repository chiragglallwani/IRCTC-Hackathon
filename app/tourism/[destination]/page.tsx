"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  MapPin,
  MapPinned,
  ShieldCheck,
  Star,
  TrainFront,
  Utensils,
} from "lucide-react";
import { destinationDetails } from "@/lib/tourism-data";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function destinationImage(destinationId: string) {
  const number = Number(destinationId.match(/\d+/)?.[0] ?? 1);
  return `/images/destination-${((number - 1) % 4) + 1}.webp`;
}

export default function DestinationPage() {
  const { locale, t } = useApp();
  const { destination: destinationParam } = useParams<{
    destination: string;
  }>();
  const details = destinationDetails(destinationParam);

  if (!details)
    return (
      <div className="page">
        <div className="card empty-state">
          <MapPinned />
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
  const featuredHotel = hotels[0];
  const nights = 3;
  const activitiesCost = destination.attractions.reduce(
    (total, attraction) => total + attraction.fromPrice,
    0,
  );
  const estimate =
    activitiesCost + (featuredHotel?.fromPrice ?? 2000) * nights + 3500;

  return (
    <div className="page">
      <Link
        href="/tourism"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]"
      >
        <ArrowLeft className="size-4" /> {t("pages.tourism.destination.back")}
      </Link>

      <section className="relative min-h-[520px] overflow-hidden rounded-[28px] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${destination.heroImage ?? destinationImage(destination.destinationId)}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#041f31]/95 via-[#041f31]/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-10 lg:p-12">
          <div className="flex flex-wrap gap-2">
            {destination.themes.slice(0, 3).map((theme) => (
              <Badge
                className="border-white/20 bg-white/15 text-white backdrop-blur"
                key={theme}
              >
                {t(
                  `pages.tourism.discovery.categories.${theme.replace("_", "")}`,
                )}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
                <MapPin className="size-4" /> {city?.state}
              </span>
              <h1 className="mt-2 text-white">{city?.name}</h1>
              <p className="mt-3 max-w-2xl text-lg text-white/80">
                {destination.summary ?? destination.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-white px-4 py-2 text-slate-900">
                <Star className="fill-[#f59e0b] text-[#f59e0b]" /> 4.8
              </Badge>
              <Badge className="bg-white px-4 py-2 text-slate-900">
                <CalendarDays /> 4D / 3N
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <main className="grid gap-8">
          <section>
            <span className="eyebrow text-[#0b6b63]">
              {t("pages.tourism.destination.overview")}
            </span>
            <h2 className="mt-2">
              {t("pages.tourism.destination.whyVisit", {
                city: city?.name ?? "",
              })}
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              {destination.summary ??
                t("pages.tourism.destination.overviewText", {
                  city: city?.name ?? "",
                })}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <Clock3 className="size-6 text-[#0b6b63]" />
                <strong className="mt-3 block">
                  {t("pages.tourism.destination.duration")}
                </strong>
                <span className="text-sm text-slate-500">4 days, 3 nights</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <TrainFront className="size-6 text-[#0b6b63]" />
                <strong className="mt-3 block">
                  {t("pages.tourism.destination.easyArrival")}
                </strong>
                <span className="text-sm text-slate-500">
                  {station?.code} · {station?.name}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <ShieldCheck className="size-6 text-[#0b6b63]" />
                <strong className="mt-3 block">
                  {t("pages.tourism.destination.flexible")}
                </strong>
                <span className="text-sm text-slate-500">
                  {t("pages.tourism.destination.flexibleText")}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow text-[#0b6b63]">
                  {t("pages.tourism.destination.suggested")}
                </span>
                <h2 className="mt-2">
                  {t("pages.tourism.destination.itineraryTitle")}
                </h2>
              </div>
              <Badge variant="secondary">
                {destination.attractions.length} experiences
              </Badge>
            </div>
            <div className="mt-6 grid gap-5">
              {destination.attractions.map((attraction, index) => (
                <article
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid sm:grid-cols-[220px_1fr]"
                  key={attraction.attractionId}
                >
                  <div className="relative min-h-48 overflow-hidden bg-slate-100 sm:min-h-full">
                    <Image
                      src={
                        attraction.imageUrl ??
                        destination.heroImage ??
                        destinationImage(destination.destinationId)
                      }
                      alt={attraction.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 220px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white font-bold text-[#075b55] shadow">
                      {index + 1}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#0b6b63]">
                          {t("pages.tourism.destination.dayLabel", {
                            day: index + 1,
                          })}
                        </span>
                        <h3 className="mt-1">{attraction.name}</h3>
                      </div>
                      <strong>
                        ₹{attraction.fromPrice.toLocaleString(locale)}
                      </strong>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 className="size-4" />{" "}
                      {Math.floor(attraction.durationMinutes / 60)}h{" "}
                      {attraction.durationMinutes % 60
                        ? `${attraction.durationMinutes % 60}m`
                        : ""}{" "}
                      · {attraction.bestTime ?? attraction.category}
                    </p>
                    {attraction.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {attraction.description}
                      </p>
                    )}
                    {attraction.highlights && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {attraction.highlights.map((highlight) => (
                          <Badge variant="outline" key={highlight}>
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow text-[#0b6b63]">
                  {t("pages.tourism.destination.stay")}
                </span>
                <h2 className="mt-2">
                  {t("pages.tourism.destination.staysTitle")}
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {hotels.slice(0, 4).map((hotel, index) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                  key={hotel.hotelId}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-11 place-items-center rounded-xl bg-[#eef4ff] text-[var(--primary)]">
                      <BedDouble />
                    </span>
                    {index === 0 && (
                      <Badge variant="success">
                        {t("pages.tourism.destination.recommended")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4">{hotel.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {hotel.starRating} star · {hotel.reviewScore}/5 ·{" "}
                    {hotel.distanceToStationKm} km from station
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hotel.amenities.slice(0, 3).map((amenity) => (
                      <Badge variant="outline" key={amenity}>
                        {amenity.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm text-slate-500">
                      {t("pages.tourism.destination.perNight")}
                    </span>
                    <strong className="text-lg">
                      ₹{hotel.fromPrice.toLocaleString(locale)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="sticky top-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.1)]">
          <span className="text-sm text-slate-500">
            {t("pages.tourism.destination.packageFrom")}
          </span>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-3xl">
              ₹{estimate.toLocaleString(locale)}
            </strong>
            <span className="pb-1 text-sm text-slate-500">
              {t("pages.tourism.destination.perPerson")}
            </span>
          </div>
          <div className="my-6 grid gap-3 border-y border-slate-100 py-5 text-sm">
            <div className="flex items-center gap-3">
              <TrainFront className="size-5 text-[#0b6b63]" />
              <span>{t("pages.tourism.destination.trainIncluded")}</span>
            </div>
            <div className="flex items-center gap-3">
              <BedDouble className="size-5 text-[#0b6b63]" />
              <span>
                {nights} nights at {featuredHotel?.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Coffee className="size-5 text-[#0b6b63]" />
              <span>{t("pages.tourism.destination.breakfastIncluded")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Utensils className="size-5 text-[#0b6b63]" />
              <span>
                {destination.attractions.length}{" "}
                {t("pages.tourism.destination.guidedExperiences")}
              </span>
            </div>
          </div>
          <Button className="w-full bg-[#0b6b63] hover:bg-[#075b55]" asChild>
            <Link
              href={`/tourism/plan?destination=${destination.destinationId}`}
            >
              {t("pages.tourism.destination.customize")} <ArrowRight />
            </Link>
          </Button>
          <Button className="mt-3 w-full" variant="secondary" asChild>
            <Link href={`/?destination=${station?.stationId}`}>
              {t("pages.tourism.destination.searchTrains")}
            </Link>
          </Button>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Check className="size-4 text-[#0b6b63]" />{" "}
            {t("pages.tourism.destination.noCharge")}
          </p>
        </aside>
      </div>
    </div>
  );
}
