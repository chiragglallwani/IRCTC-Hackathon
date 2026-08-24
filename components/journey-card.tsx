"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Info,
  Sparkles,
  TrainFront,
  X,
} from "lucide-react";
import { quotas } from "@/lib/data";
import { formatDuration } from "@/lib/search";
import { saveStorage, storageKeys } from "@/lib/storage";
import type { Journey, SearchInput } from "@/lib/types";
import { useApp } from "./providers";

export function JourneyCard({
  journey,
  input,
}: {
  journey: Journey;
  input: SearchInput;
}) {
  const router = useRouter();
  const { language, user, setAuthOpen, t } = useApp();
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const [expanded, setExpanded] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(false);
  const proceed = () => {
    saveStorage(storageKeys.checkout, {
      journey,
      input,
      quota: input.mode === "tatkal" ? "TQ" : "GN",
    });
    if (!user) {
      setPendingAuth(true);
      setAuthOpen(true);
    } else router.push("/checkout");
  };
  useEffect(() => {
    if (user && pendingAuth) router.push("/checkout");
  }, [user, pendingAuth, router]);
  const statusClass =
    journey.availability === "AVAILABLE"
      ? "badge-success"
      : journey.availability === "RAC"
        ? "badge-warning"
        : "badge-danger";
  const availabilityLabel = t(
    `common.status.${journey.availability === "AVAILABLE" ? "available" : journey.availability === "WAITLIST" ? "waitlist" : journey.availability.toLowerCase()}`,
  );
  return (
    <article className="card journey-card">
      <div className="journey-label">
        <span>
          <Sparkles size={18} />{" "}
          {journey.label
            ? t(`common.status.${journey.label.toLowerCase()}`)
            : t("components.journeyCard.option")}
          {}· {t("components.journeyCard.score", { score: journey.score })}
        </span>
        <button className="btn-ghost" onClick={() => setWhyOpen(!whyOpen)}>
          {t("components.journeyCard.why")} <Info size={16} />
        </button>
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
            <strong>₹{journey.totalFare.toLocaleString(locale)}</strong>
            <span className={`badge ${statusClass}`}>
              {journey.availability === "AVAILABLE" && <CircleCheck />}
              {availabilityLabel}
            </span>
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
                <span className="badge badge-blue">
                  {t("components.journeyCard.transferTime", { minutes: 45 })}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="quota-row">
          <button className="quota-button" onClick={() => setQuotaOpen(true)}>
            {t("components.journeyCard.generalQuota", {
              status: availabilityLabel,
            })}
          </button>
          <button className="quota-button" onClick={() => setQuotaOpen(true)}>
            {t("components.journeyCard.seniorQuota")}
          </button>
          <button className="btn btn-ghost" onClick={() => setQuotaOpen(true)}>
            {t("components.journeyCard.allQuotas")}
          </button>
        </div>
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
          <button
            className="btn btn-secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? t("components.journeyCard.hideDetails")
              : t("components.journeyCard.details")}
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </button>
          <button className="btn btn-primary" onClick={proceed}>
            {t("common.actions.continueBooking")}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="journey-expanded">
          <h3>{t("components.journeyCard.timeline")}</h3>
          <div className="timeline">
            {journey.legs.map((leg, i) => (
              <div className="timeline-leg" key={leg.id}>
                <div className="timeline-dot">{i + 1}</div>
                <div>
                  <strong>
                    {leg.from.name} → {leg.to.name}
                  </strong>
                  <p>
                    {leg.departure}–{leg.arrival} · {leg.serviceName} (
                    {leg.serviceNumber}) ·{" "}
                    {t("components.journeyCard.platform", { number: 1 + i })}
                  </p>
                  <p className="muted">
                    {formatDuration(leg.durationMinutes)} · ₹
                    {leg.fare.toLocaleString(locale)} · {leg.travelClass} ·{" "}
                    {leg.availability?.status
                      ? t(
                          `common.status.${leg.availability.status.toLowerCase()}`,
                        )
                      : t("components.journeyCard.checkBooking")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {quotaOpen && (
        <div
          className="quota-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("components.journeyCard.quotaLabel")}
        >
          <div className="quota-drawer">
            <button className="icon-btn" onClick={() => setQuotaOpen(false)}>
              <X />
            </button>
            <h2>{t("components.journeyCard.quotaTitle")}</h2>
            <p className="muted">
              {t("components.journeyCard.quotaDescription")}
            </p>
            {quotas.map((q, i) => (
              <div className="quota-detail" key={q.quotaId}>
                <div>
                  <strong>
                    {t(`common.quotas.${q.quotaId.toLowerCase()}.name`)} (
                    {q.shortName})
                  </strong>
                  <p>
                    {t(`common.quotas.${q.quotaId.toLowerCase()}.description`)}
                  </p>
                  {q.eligibility.requiresVerification && (
                    <small>{t("components.journeyCard.verification")}</small>
                  )}
                </div>
                <span
                  className={`badge ${i % 4 === 3 ? "badge-warning" : "badge-success"}`}
                >
                  {i % 4 === 3
                    ? t("components.journeyCard.rac")
                    : t("components.journeyCard.availableSeats", {
                        count: 8 + i,
                      })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
