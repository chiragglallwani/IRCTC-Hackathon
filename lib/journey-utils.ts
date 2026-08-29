import type {
  Journey,
  JourneyLeg,
  Passenger,
  QuotaSeatAvailability,
  SearchInput,
} from "./types";

const DISPLAY_QUOTA_IDS = ["GN", "LD", "SS", "DF", "FT", "HP", "DP", "RE"];

export function formatDuration(minutes: number) {
  const totalMinutes = Math.max(0, Math.floor(minutes));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const remainingMinutes = totalMinutes % 60;

  if (days > 0)
    return [
      `${days}d`,
      hours > 0 ? `${hours}h` : "",
      remainingMinutes > 0 ? `${remainingMinutes}m` : "",
    ]
      .filter(Boolean)
      .join(" ");
  if (hours > 0)
    return [`${hours}h`, remainingMinutes > 0 ? `${remainingMinutes}m` : ""]
      .filter(Boolean)
      .join(" ");
  return `${remainingMinutes}m`;
}

function clockMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateLayoverMinutes(
  arrivingLeg: JourneyLeg,
  departingLeg: JourneyLeg,
) {
  const arrival = clockMinutes(arrivingLeg.arrival);
  const departure = clockMinutes(departingLeg.departure);
  return (departure - arrival + 24 * 60) % (24 * 60);
}

export function quotaEligibility(
  quotaId: string,
  passengers: { age: number; gender: string; citizenship: string }[],
) {
  if (quotaId === "SS")
    return passengers.every((passenger) =>
      passenger.gender === "female" ? passenger.age >= 58 : passenger.age >= 60,
    );
  if (quotaId === "LD")
    return passengers.every((passenger) => passenger.gender === "female");
  if (quotaId === "FT")
    return passengers.every((passenger) => passenger.citizenship !== "Indian");
  return true;
}

export function passengerEligibleQuotaIds(
  passenger: Passenger,
  mode: SearchInput["mode"],
) {
  void mode;
  const eligible = ["GN"];
  if (passenger.gender === "female") eligible.push("LD");
  if (passenger.gender === "female" ? passenger.age >= 58 : passenger.age >= 60)
    eligible.push("SS");
  if (
    passenger.citizenship !== "Indian" &&
    passenger.claimForeignTourist &&
    passenger.passportNumber
  )
    eligible.push("FT");
  if (passenger.claimDefence && passenger.defenceServiceId) eligible.push("DF");
  if (passenger.claimDisability && passenger.disabilityCertificate)
    eligible.push("HP");
  if (passenger.claimRailwayEmployee && passenger.railwayEmployeeId)
    eligible.push("RE");
  return eligible;
}

export function selectEligibleQuota(
  passengers: Passenger[],
  mode: SearchInput["mode"],
) {
  if (!passengers.length) return "GN";
  const preferredQuotas = ["HP", "SS", "RE", "DF", "FT", "LD"];
  return (
    preferredQuotas.find((quotaId) =>
      passengers.every((passenger) =>
        passengerEligibleQuotaIds(passenger, mode).includes(quotaId),
      ),
    ) ?? "GN"
  );
}

export function selectBestAvailableQuota(
  passengers: Passenger[],
  mode: SearchInput["mode"],
  quotaAvailability: QuotaSeatAvailability[],
  requiredSeats: number,
) {
  const preferredQuotaId = selectEligibleQuota(passengers, mode);
  const eligibleQuotaIds = new Set(
    DISPLAY_QUOTA_IDS.filter((quotaId) =>
      passengers.every((passenger) =>
        passengerEligibleQuotaIds(passenger, mode).includes(quotaId),
      ),
    ),
  );
  const priority = ["HP", "SS", "RE", "DF", "FT", "LD", "DP", "GN"];
  const outcomeRank = (item: QuotaSeatAvailability) => {
    if (item.status === "AVAILABLE" && item.number >= requiredSeats) return 4;
    if (item.status === "RAC") return 3;
    if (item.status === "WAITLIST") return 2;
    if (item.status === "AVAILABLE") return 1;
    return 0;
  };
  const preferredAvailability = quotaAvailability.find(
    (item) => item.quotaId === preferredQuotaId,
  );
  if (preferredAvailability && outcomeRank(preferredAvailability) === 4)
    return { quotaId: preferredQuotaId, preferredQuotaId, usedFallback: false };
  const best = quotaAvailability
    .filter((item) => eligibleQuotaIds.has(item.quotaId))
    .sort(
      (a, b) =>
        outcomeRank(b) - outcomeRank(a) ||
        priority.indexOf(a.quotaId) - priority.indexOf(b.quotaId),
    )[0];
  const quotaId = best?.quotaId ?? preferredQuotaId;
  return {
    quotaId,
    preferredQuotaId,
    usedFallback: quotaId !== preferredQuotaId,
  };
}

const quotaDiscountRates: Record<string, number> = {
  HP: 0.5,
  SS: 0.4,
  RE: 0.15,
  DF: 0.1,
  FT: 0.05,
};

export const MEAL_PRICE = 150;

export function selectedLegAvailability(leg: JourneyLeg, quotaId: string) {
  const ticket = leg.ticketOptions?.find(
    (item) => item.travelClass === leg.travelClass,
  );
  return (
    ticket?.quotas.find((item) => item.quotaId === quotaId) ??
    ticket ??
    leg.availability ??
    undefined
  );
}

export function reservationStatusForPassenger(
  journey: Journey,
  quotaId: string,
  passengerIndex: number,
) {
  const rank = { AVAILABLE: 4, RAC: 3, WAITLIST: 2, REGRET: 1 } as const;
  const limitingAvailability = journey.legs
    .map((leg) => selectedLegAvailability(leg, quotaId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => rank[a.status] - rank[b.status])[0];

  if (!limitingAvailability || limitingAvailability.status === "AVAILABLE")
    return { status: "CONFIRMED" as const };
  if (limitingAvailability.status === "RAC")
    return {
      status: "RAC" as const,
      position: limitingAvailability.number + passengerIndex,
    };
  return {
    status: "WAITLIST" as const,
    position: Math.max(1, limitingAvailability.number + passengerIndex),
  };
}

export function calculateFareBreakdown(
  baseFare: number,
  quotaId: string,
  mealCost = 0,
) {
  const discountRate = quotaDiscountRates[quotaId] ?? 0;
  const discount = Math.round(baseFare * discountRate);
  const discountedFare = baseFare - discount;
  const serviceFee = Math.round(discountedFare * 0.035);
  const gst = Math.round(discountedFare * 0.05);
  return {
    discountRate,
    discount,
    discountedFare,
    serviceFee,
    gst,
    mealCost,
    total: discountedFare + mealCost + serviceFee + gst,
  };
}
