import type {
  ClassSeatAvailability,
  Journey,
  Passenger,
  QuotaSeatAvailability,
  SearchInput,
} from "./types";
import { selectBestAvailableQuota } from "./journey-utils";

export type AdvisoryCode =
  | "AVAILABLE"
  | "INSUFFICIENT_SEATS"
  | "RAC"
  | "WAITLIST"
  | "REGRET"
  | "MULTI_LEG_RISK"
  | "QUOTA_PENDING"
  | "QUOTA_RECOMMENDED"
  | "QUOTA_FALLBACK"
  | "QUOTA_VERIFICATION";

export interface BookingAdvisory {
  code: AdvisoryCode;
  severity: "success" | "info" | "warning" | "danger";
  title: string;
  message: string;
  blocking: boolean;
  spokenPriority: 0 | 1 | 2;
}

function availabilityAdvisory(
  item: ClassSeatAvailability | QuotaSeatAvailability,
  requiredSeats: number,
): BookingAdvisory {
  const likelihood =
    "confirmationLikelihood" in item ? item.confirmationLikelihood : 0;
  if (item.status === "REGRET")
    return {
      code: "REGRET",
      severity: "danger",
      title: "Booking unavailable",
      message:
        "This option cannot currently be booked. Choose another class or journey.",
      blocking: true,
      spokenPriority: 2,
    };
  if (item.status === "WAITLIST")
    return {
      code: "WAITLIST",
      severity: "danger",
      title: `Waitlist ${item.number}`,
      message: `Confirmation is not guaranteed${likelihood ? ` (${likelihood}% estimated likelihood)` : ""}. Consider another train, date, or class.`,
      blocking: false,
      spokenPriority: 2,
    };
  if (item.status === "RAC")
    return {
      code: "RAC",
      severity: "warning",
      title: `RAC ${item.number}`,
      message: `Travel may be permitted, but a full berth is not guaranteed${likelihood ? ` (${likelihood}% estimated likelihood)` : ""}.`,
      blocking: false,
      spokenPriority: 2,
    };
  if (item.number < requiredSeats)
    return {
      code: "INSUFFICIENT_SEATS",
      severity: "danger",
      title: "Not enough confirmed seats",
      message: `Only ${item.number} confirmed seat${item.number === 1 ? " is" : "s are"} available for ${requiredSeats} passengers.`,
      blocking: true,
      spokenPriority: 2,
    };
  return {
    code: "AVAILABLE",
    severity: "success",
    title: `${item.number} seats available`,
    message: `There are enough confirmed seats for ${requiredSeats} passenger${requiredSeats === 1 ? "" : "s"}.`,
    blocking: false,
    spokenPriority: 0,
  };
}

export function journeyAdvisories(
  journey: Journey,
  input: SearchInput,
  travelClass?: string,
): BookingAdvisory[] {
  const requiredSeats = Math.max(1, input.adults + input.children);
  const selected =
    journey.classAvailability.find(
      (item) => item.travelClass === travelClass,
    ) ??
    (input.travelClass !== "ANY"
      ? journey.classAvailability.find(
          (item) => item.travelClass === input.travelClass,
        )
      : undefined) ??
    journey.classAvailability[0];
  const advisories = selected
    ? [availabilityAdvisory(selected, requiredSeats)]
    : [];
  if (journey.legs.length > 1 && journey.availability !== "AVAILABLE")
    advisories.unshift({
      code: "MULTI_LEG_RISK",
      severity: journey.availability === "REGRET" ? "danger" : "warning",
      title: "One or more legs are not confirmed",
      message:
        "The overall status reflects the least available leg. Review every leg before continuing.",
      blocking: journey.availability === "REGRET",
      spokenPriority: 2,
    });
  advisories.push({
    code: "QUOTA_PENDING",
    severity: "info",
    title: "Best quota checked after passenger selection",
    message:
      "General quota is the current baseline. RailEase will choose the best eligible available quota after passenger criteria are verified.",
    blocking: false,
    spokenPriority: 1,
  });
  return advisories;
}

export function quotaAdvisories({
  passengers,
  mode,
  availability,
}: {
  passengers: Passenger[];
  mode: SearchInput["mode"];
  availability: QuotaSeatAvailability[];
}): BookingAdvisory[] {
  if (!passengers.length)
    return [
      {
        code: "QUOTA_PENDING",
        severity: "info",
        title: "Passenger details required",
        message:
          "Add or select passengers to calculate the best eligible quota.",
        blocking: false,
        spokenPriority: 1,
      },
    ];
  const best = selectBestAvailableQuota(
    passengers,
    mode,
    availability,
    passengers.length,
  );
  const selected = availability.find((item) => item.quotaId === best.quotaId);
  const result: BookingAdvisory[] = [
    {
      code: best.usedFallback ? "QUOTA_FALLBACK" : "QUOTA_RECOMMENDED",
      severity: best.usedFallback ? "warning" : "success",
      title: best.usedFallback
        ? `Using ${best.quotaId} instead of ${best.preferredQuotaId}`
        : `Recommended quota: ${best.quotaId}`,
      message: best.usedFallback
        ? "The preferred eligible quota did not have the best confirmed availability for all selected passengers."
        : "This is the best eligible quota with the current availability.",
      blocking: false,
      spokenPriority: best.usedFallback ? 2 : 1,
    },
  ];
  if (selected)
    result.unshift(availabilityAdvisory(selected, passengers.length));
  if (
    passengers.some(
      (passenger) =>
        passenger.claimForeignTourist ||
        passenger.claimDefence ||
        passenger.claimDisability ||
        passenger.claimRailwayEmployee,
    )
  )
    result.push({
      code: "QUOTA_VERIFICATION",
      severity: "warning",
      title: "Eligibility verification required",
      message:
        "Carry valid supporting documents for every claimed concession or special quota.",
      blocking: false,
      spokenPriority: 2,
    });
  return result;
}
