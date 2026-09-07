"use client";
import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  TrainFront,
} from "lucide-react";
import { quotas } from "@/lib/quotas";
import { calculateLayoverMinutes, formatDuration } from "@/lib/journey-utils";
import { saveStorage, storageKeys } from "@/lib/storage";
import type {
  AvailabilityStatus,
  ClassSeatAvailability,
  Journey,
  QuotaSeatAvailability,
  SearchInput,
} from "@/lib/types";
import { useApp } from "./providers";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JourneyRoute } from "@/components/journey-route";
import { cn } from "@/lib/utils";
import { createCheckoutContext } from "@/lib/checkout-selection";
import { journeyAdvisories } from "@/lib/booking-advisories";

function statusVariant(status: AvailabilityStatus): BadgeVariant {
  return status === "AVAILABLE"
    ? "success"
    : status === "RAC"
      ? "warning"
      : "destructive";
}

export const JourneyCard = memo(function JourneyCard({
  journey,
  input,
}: {
  journey: Journey;
  input: SearchInput;
}) {
  const router = useRouter();
  const { locale, user, setAuthOpen, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [activeLegId, setActiveLegId] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedLegClasses, setSelectedLegClasses] = useState<
    Record<string, string>
  >({});
  const [pendingAuth, setPendingAuth] = useState(false);
  const selectedAvailability = journey.classAvailability.find(
    (item) => item.travelClass === selectedClass,
  );
  const selectedLegOptions = journey.legs.map((leg) =>
    leg.ticketOptions.find(
      (item) => item.travelClass === selectedLegClasses[leg.id],
    ),
  );
  const activeLeg = journey.legs.find((leg) => leg.id === activeLegId);
  const activeLegIndex = journey.legs.findIndex(
    (leg) => leg.id === activeLeg?.id,
  );
  const activeLegTicket = activeLeg?.ticketOptions.find(
    (ticket) => ticket.travelClass === selectedLegClasses[activeLeg.id],
  );
  const displayedQuotaAvailability =
    journey.legs.length > 1 ? activeLegTicket : selectedAvailability;
  const displayedFare =
    journey.legs.length > 1
      ? selectedLegOptions.reduce(
          (sum, item, index) =>
            sum +
            (item?.fare ??
              Math.min(
                ...journey.legs[index].ticketOptions.map(
                  (ticket) => ticket.fare,
                ),
              )),
          0,
        )
      : (selectedAvailability?.fare ??
        Math.min(...journey.classAvailability.map((item) => item.fare)));
  const advisories = journeyAdvisories(
    journey,
    input,
    selectedClass ?? undefined,
  );
  const proceed = () => {
    saveStorage(
      storageKeys.checkout,
      createCheckoutContext({
        journey,
        input,
        selectedClass,
        selectedLegClasses,
      }),
    );
    if (!user) {
      setPendingAuth(true);
      setAuthOpen(true);
    } else router.push("/checkout");
  };
  useEffect(() => {
    if (user && pendingAuth) router.push("/checkout");
  }, [user, pendingAuth, router]);
  useEffect(() => {
    setSelectedClass(null);
  }, [input.date, input.travelClass, journey.classAvailability]);
  useEffect(() => {
    setSelectedLegClasses({});
    setActiveLegId("");
  }, [input.date, input.travelClass, journey.legs]);

  const renderAvailability = (
    item: ClassSeatAvailability | QuotaSeatAvailability,
  ) => {
    if (item.status === "AVAILABLE")
      return t("components.journeyCard.seatsAvailable", {
        count: item.number,
      });
    if (item.status === "RAC")
      return t("components.journeyCard.racPosition", { count: item.number });
    if (item.status === "WAITLIST")
      return t("components.journeyCard.waitlistPosition", {
        count: item.number,
      });
    return t("components.journeyCard.notAvailable");
  };
  return (
    <article className="card journey-card">
      <div className="journey-label">
        <span className="flex items-center gap-2">
          <Sparkles size={18} />{" "}
          {journey.label
            ? t(`common.status.${journey.label.toLowerCase()}`)
            : t("components.journeyCard.option")}
          {}· {t("components.journeyCard.score", { score: journey.score })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setWhyOpen(!whyOpen)}>
          {t("components.journeyCard.why")} <Info size={16} />
        </Button>
      </div>
      <div className="journey-body">
        <div className="journey-top">
          <div>
            <div className="journey-times">
              <strong>{journey.departure}</strong>
              <span>→</span>
              <strong>{journey.arrival}</strong>
            </div>
            <p className="muted">
              {formatDuration(journey.durationMinutes)} ·{" "}
              {journey.transfers
                ? t(
                    journey.transfers === 1
                      ? "components.journeyCard.transfer"
                      : "components.journeyCard.transfers",
                    { count: journey.transfers },
                  )
                : t("components.journeyCard.direct")}{" "}
              ·{" "}
              {journey.modes
                .map((mode) => t(`pages.search.${mode}`))
                .join(" + ")}
            </p>
          </div>
          <div className="fare">
            <span className="microcopy">
              {selectedAvailability
                ? t("components.journeyCard.selectedClassFare")
                : t("components.journeyCard.fareFrom")}
            </span>
            <strong>₹{displayedFare.toLocaleString(locale)}</strong>
          </div>
        </div>
        <div className="leg-strip">
          {journey.legs.map((leg, index) => (
            <button
              type="button"
              aria-pressed={leg.id === activeLeg?.id}
              className={cn(
                "leg-mini text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                leg.id === activeLeg?.id &&
                  "border-[var(--primary)] bg-[#eef3ff] shadow-sm",
              )}
              key={leg.id}
              onClick={() => setActiveLegId(leg.id)}
            >
              <div>
                {leg.mode === "train" ? <TrainFront /> : <BusFront />}
                <strong>{leg.serviceName}</strong>{" "}
                <span className="microcopy">({leg.serviceNumber})</span>
              </div>
              <div className="times">
                <span>{leg.departure}</span>
                <span>{leg.arrival}</span>
              </div>
              <div className="muted">
                {leg.from.code} → {leg.to.code} ·{" "}
                {formatDuration(leg.durationMinutes)}
              </div>
              {index < journey.legs.length - 1 && (
                <Badge variant="secondary">
                  {t("components.journeyRoute.layover", {
                    duration: formatDuration(
                      calculateLayoverMinutes(leg, journey.legs[index + 1]),
                    ),
                  })}
                </Badge>
              )}
            </button>
          ))}
        </div>
        {activeLeg && (
          <section className="mt-4 rounded-xl border border-[#cdd8ee] bg-[#f8faff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3>
                  {t("components.journeyCard.ticketsForLeg", {
                    leg: activeLegIndex + 1,
                  })}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activeLeg.from.code} → {activeLeg.to.code} ·{" "}
                  {activeLeg.serviceName}
                </p>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {t("components.journeyCard.selectLegHint")}
              </span>
            </div>
            <div
              className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4"
              role="radiogroup"
              aria-label={t("components.journeyCard.ticketsForLeg", {
                leg: activeLegIndex + 1,
              })}
            >
              {activeLeg.ticketOptions.map((ticket) => {
                const selected =
                  journey.legs.length === 1
                    ? selectedClass === ticket.travelClass
                    : selectedLegClasses[activeLeg.id] === ticket.travelClass;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    key={ticket.travelClass}
                    className={cn(
                      "relative rounded-lg border bg-white p-3 text-start text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                      selected
                        ? "border-2 border-[var(--primary)] bg-[#eef3ff]"
                        : "border-[var(--line)] hover:border-[var(--primary)]",
                    )}
                    onClick={() => {
                      setSelectedLegClasses((current) => ({
                        ...current,
                        [activeLeg.id]: ticket.travelClass,
                      }));
                      if (journey.legs.length === 1)
                        setSelectedClass(ticket.travelClass);
                    }}
                  >
                    {selected && (
                      <span className="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-[var(--primary)] text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                    <strong>{ticket.travelClass}</strong>
                    <span className="block">
                      ₹{ticket.fare.toLocaleString(locale)}
                    </span>
                    <Badge
                      className="mt-2"
                      variant={statusVariant(ticket.status)}
                    >
                      {renderAvailability(ticket)}
                    </Badge>
                  </button>
                );
              })}
            </div>
            {displayedQuotaAvailability && (
              <div className="mt-3 rounded-lg border border-[#cdd8ee] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3>
                      {t("components.journeyCard.quotaAvailabilityFor", {
                        class: displayedQuotaAvailability.travelClass,
                      })}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {t("components.journeyCard.quotaAvailabilityNote")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {t("components.journeyCard.classSelected", {
                      class: displayedQuotaAvailability.travelClass,
                    })}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
                  {displayedQuotaAvailability.quotas.map(
                    (quotaAvailability) => {
                      const quota = quotas.find(
                        (item) => item.quotaId === quotaAvailability.quotaId,
                      );
                      return (
                        <div
                          className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-white px-2.5 py-2"
                          key={quotaAvailability.quotaId}
                        >
                          <div className="min-w-0">
                            <strong className="block truncate text-sm">
                              {t(
                                `common.quotas.${quotaAvailability.quotaId.toLowerCase()}.name`,
                              )}
                            </strong>
                            <span className="text-[11px] text-[var(--muted)]">
                              {quota?.shortName ?? quotaAvailability.quotaId}
                            </span>
                          </div>
                          <Badge
                            className="px-2 py-0.5 text-[11px]"
                            variant={statusVariant(quotaAvailability.status)}
                          >
                            {renderAvailability(quotaAvailability)}
                          </Badge>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </section>
        )}
        {whyOpen && (
          <div className="why-box">
            <h3>{t("components.journeyCard.excellent")}</h3>
            <p className="muted">{t("components.journeyCard.balance")}</p>
            <ul>
              {journey.whyRecommended.map((reason, index) => (
                <li key={`${reason.key}-${index}`}>
                  {t(reason.key, reason.variables)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <section className="mt-4 grid gap-2" aria-label="Booking advisories">
          {advisories.map((advisory) => (
            <div
              key={advisory.code}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                advisory.severity === "danger"
                  ? "border-[#e7a09a] bg-[#fff0ee] text-[#7d1b12]"
                  : advisory.severity === "warning"
                    ? "border-[#e8c16a] bg-[#fff8e7] text-[#684900]"
                    : advisory.severity === "success"
                      ? "border-[#8fc8b8] bg-[#edf9f5] text-[#075b55]"
                      : "border-[#b6c9ea] bg-[#f2f6ff] text-[#134b8e]",
              )}
            >
              <strong>{advisory.title}</strong>
              <span className="mt-0.5 block">{advisory.message}</span>
            </div>
          ))}
        </section>
        <div className="journey-actions mt-4">
          <Button
            variant="secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? t("components.journeyCard.hideDetails")
              : t("components.journeyCard.details")}
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
          <Button onClick={proceed}>
            {t("common.actions.continueBooking")}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="journey-expanded">
          <h3>{t("components.journeyCard.timeline")}</h3>
          <JourneyRoute journey={journey} />
        </div>
      )}
    </article>
  );
});
