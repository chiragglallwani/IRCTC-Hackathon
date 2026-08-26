"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Armchair,
  BusFront,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Info,
  Sparkles,
  TrainFront,
  Users,
} from "lucide-react";
import { quotas } from "@/lib/data";
import { formatDuration } from "@/lib/search";
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
import { cn, getClassTranslationKey } from "@/lib/utils";

function statusVariant(status: AvailabilityStatus): BadgeVariant {
  return status === "AVAILABLE"
    ? "success"
    : status === "RAC"
      ? "warning"
      : "destructive";
}

export function JourneyCard({
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
  const [selectedClass, setSelectedClass] = useState<string | null>(() =>
    input.travelClass !== "ANY" &&
    journey.classAvailability.some(
      (item) => item.travelClass === input.travelClass,
    )
      ? input.travelClass
      : null,
  );
  const [pendingAuth, setPendingAuth] = useState(false);
  const selectedAvailability = journey.classAvailability.find(
    (item) => item.travelClass === selectedClass,
  );
  const displayedAvailability =
    selectedAvailability ?? journey.classAvailability[0];
  const displayedFare =
    selectedAvailability?.fare ??
    Math.min(...journey.classAvailability.map((item) => item.fare));
  const proceed = () => {
    if (!selectedAvailability) return;
    const selectedJourney: Journey = {
      ...journey,
      totalFare: selectedAvailability.fare,
      availability: selectedAvailability.status,
      legs: journey.legs.map((leg) => ({
        ...leg,
        travelClass: selectedAvailability.travelClass,
      })),
    };
    saveStorage(storageKeys.checkout, {
      journey: selectedJourney,
      input: { ...input, travelClass: selectedAvailability.travelClass },
      quota: "GN",
    });
    if (!user) {
      setPendingAuth(true);
      setAuthOpen(true);
    } else router.push("/checkout");
  };
  useEffect(() => {
    if (user && pendingAuth) router.push("/checkout");
  }, [user, pendingAuth, router]);
  useEffect(() => {
    setSelectedClass(
      input.travelClass !== "ANY" &&
        journey.classAvailability.some(
          (item) => item.travelClass === input.travelClass,
        )
        ? input.travelClass
        : null,
    );
  }, [input.date, input.travelClass, journey.classAvailability]);

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
            <Badge variant={statusVariant(displayedAvailability.status)}>
              {displayedAvailability.status === "AVAILABLE" && <CircleCheck />}
              {renderAvailability(displayedAvailability)}
            </Badge>
          </div>
        </div>
        <div className="leg-strip">
          {journey.legs.map((leg, index) => (
            <div className="leg-mini" key={leg.id}>
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
                  {t("components.journeyCard.transferTime", { minutes: 45 })}
                </Badge>
              )}
            </div>
          ))}
        </div>
        <section className="mt-4 border-t border-[var(--line)] pt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3>{t("components.journeyCard.seatsByClass")}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t("components.journeyCard.selectClassHint")}
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Users className="size-4" />
              {t("components.journeyCard.passengers", {
                count: Math.max(1, input.adults + input.children),
              })}
            </span>
          </div>
          <div
            className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4"
            role="radiogroup"
            aria-label={t("components.journeyCard.seatsByClass")}
          >
            {journey.classAvailability.map((item) => {
              const selected = item.travelClass === selectedClass;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "relative min-w-0 rounded-lg border bg-white px-3 py-2.5 text-start transition hover:border-[var(--primary)] hover:bg-[#f8faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    selected
                      ? "border-2 border-[var(--primary)] bg-[#f4f7ff]"
                      : "border-[var(--line)]",
                  )}
                  key={item.travelClass}
                  onClick={() => setSelectedClass(item.travelClass)}
                >
                  {selected && (
                    <span className="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-[var(--primary)] text-white">
                      <Check className="size-3.5" />
                    </span>
                  )}
                  <div className="pe-5">
                    <strong className="block truncate text-sm">
                      {t(getClassTranslationKey(item.travelClass))}
                    </strong>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      ₹{item.fare.toLocaleString(locale)}
                    </span>
                  </div>
                  <Badge
                    className="mt-2 max-w-full px-2 py-0.5 text-[11px]"
                    variant={statusVariant(item.status)}
                  >
                    {item.status === "AVAILABLE" && <Armchair />}
                    {renderAvailability(item)}
                  </Badge>
                </button>
              );
            })}
          </div>
          {selectedAvailability ? (
            <div className="mt-3 rounded-lg border border-[#cdd8ee] bg-[#f8faff] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3>
                    {t("components.journeyCard.quotaAvailabilityFor", {
                      class: selectedAvailability.travelClass,
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("components.journeyCard.quotaAvailabilityNote")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {t("components.journeyCard.classSelected", {
                    class: selectedAvailability.travelClass,
                  })}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
                {selectedAvailability.quotas.map((quotaAvailability) => {
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
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#bfc5d4] bg-[#fbfcfe] p-4 text-sm text-[var(--muted)]">
              {t("components.journeyCard.chooseClassForQuotas")}
            </div>
          )}
        </section>
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
        <div className="journey-actions">
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
          <Button
            disabled={
              !selectedAvailability || selectedAvailability.status === "REGRET"
            }
            onClick={proceed}
          >
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
}
