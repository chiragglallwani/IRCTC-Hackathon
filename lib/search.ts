import {
  availability,
  connections,
  fares,
  stationById,
  trainById,
} from "./data";
import type {
  AvailabilityStatus,
  ClassSeatAvailability,
  Connection,
  Journey,
  JourneyLeg,
  Passenger,
  QuotaSeatAvailability,
  SearchInput,
  TransportMode,
} from "./types";

export const DISPLAY_QUOTA_IDS = [
  "GN",
  "LD",
  "SS",
  "DF",
  "FT",
  "HP",
  "DP",
  "RE",
] as const;

const classFareFactors: Record<string, number> = {
  "1A": 2.7,
  "2A": 2.05,
  "3A": 1.55,
  "3E": 1.35,
  EC: 1.8,
  CC: 1.25,
  SL: 0.72,
  "2S": 0.48,
};

const adjacency = new Map<string, Connection[]>();
for (const edge of connections)
  adjacency.set(edge.fromStation, [
    ...(adjacency.get(edge.fromStation) ?? []),
    edge,
  ]);

function time(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}
function datasetDate(date: string) {
  const day = Math.abs(new Date(`${date}T00:00:00`).getUTCDate() - 24) % 7;
  return `2026-08-${String(24 + day).padStart(2, "0")}`;
}
function availabilityRank(status: AvailabilityStatus) {
  return { AVAILABLE: 4, RAC: 3, WAITLIST: 2, REGRET: 1 }[status];
}

function stableNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function normalizeAvailabilityStatus(value: string): AvailabilityStatus {
  if (value === "WL" || value === "WAITLIST") return "WAITLIST";
  if (value === "RAC") return "RAC";
  if (value === "REGRET") return "REGRET";
  return "AVAILABLE";
}

function generatedQuotaAvailability(
  journeyKey: string,
  travelClass: string,
  quotaId: string,
  seed?: { status: string; number: number; confirmationLikelihood: number },
): QuotaSeatAvailability {
  if (seed) {
    return {
      quotaId,
      status: normalizeAvailabilityStatus(seed.status),
      number: seed.number,
      confirmationLikelihood: seed.confirmationLikelihood,
    };
  }

  const value = stableNumber(`${journeyKey}:${travelClass}:${quotaId}`);
  const bucket = value % 100;
  if (bucket < 56) {
    return {
      quotaId,
      status: "AVAILABLE",
      number: 4 + (value % 45),
      confirmationLikelihood: 0.96,
    };
  }
  if (bucket < 74) {
    return {
      quotaId,
      status: "RAC",
      number: 1 + (value % 18),
      confirmationLikelihood: 0.68,
    };
  }
  if (bucket < 94) {
    return {
      quotaId,
      status: "WAITLIST",
      number: 1 + (value % 42),
      confirmationLikelihood: 0.42,
    };
  }
  return {
    quotaId,
    status: "REGRET",
    number: 0,
    confirmationLikelihood: 0.08,
  };
}

function summarizeClassAvailability(
  travelClass: string,
  fare: number,
  quotasForClass: QuotaSeatAvailability[],
): ClassSeatAvailability {
  const general = quotasForClass.find((item) => item.quotaId === "GN");
  const representative = general ?? quotasForClass[0];
  return {
    travelClass,
    fare,
    status: representative?.status ?? "REGRET",
    number: representative?.number ?? 0,
    quotas: quotasForClass,
  };
}

function journeyClassAvailability(
  legs: JourneyLeg[],
  input: SearchInput,
): ClassSeatAvailability[] {
  const passengerCount = Math.max(1, input.adults + input.children);
  const serviceClasses = legs.map(
    (leg) => trainById.get(leg.serviceId)?.classes ?? [leg.travelClass],
  );
  const commonClasses = serviceClasses[0].filter((travelClass) =>
    serviceClasses.every((classes) => classes.includes(travelClass)),
  );
  const classes = commonClasses.length
    ? commonClasses
    : [...new Set(serviceClasses.flat())];
  const journeyKey = legs.map((leg) => leg.id).join(":");
  const date = datasetDate(input.date);
  const distanceFare = legs.reduce(
    (total, leg) => total + Math.max(80, leg.fare),
    0,
  );

  return classes.map((travelClass) => {
    const factor = classFareFactors[travelClass] ?? 1;
    const baseFactor = classFareFactors[legs[0]?.travelClass] ?? 1;
    const exactFares = legs.map((leg) =>
      fares.find(
        (fare) =>
          fare.trainId === leg.serviceId &&
          fare.fromStation === leg.from.stationId &&
          fare.toStation === leg.to.stationId &&
          fare.travelDate === date &&
          fare.class === travelClass &&
          fare.quota === "GN",
      ),
    );
    const perPassengerFare = exactFares.every(Boolean)
      ? exactFares.reduce((total, fare) => total + (fare?.totalFare ?? 0), 0)
      : Math.max(80, Math.round((distanceFare / baseFactor) * factor));
    const quotaAvailability = DISPLAY_QUOTA_IDS.map((quotaId) => {
      const seeded = legs
        .map((leg) =>
          availability.find(
            (item) =>
              item.trainId === leg.serviceId &&
              item.fromStation === leg.from.stationId &&
              item.toStation === leg.to.stationId &&
              item.travelDate === date &&
              item.class === travelClass &&
              item.quota === quotaId,
          ),
        )
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const generated = generatedQuotaAvailability(
        journeyKey,
        travelClass,
        quotaId,
        seeded[0],
      );
      if (seeded.length <= 1) return generated;
      return seeded.reduce<QuotaSeatAvailability>((worst, item) => {
        const status = normalizeAvailabilityStatus(item.status);
        return availabilityRank(status) < availabilityRank(worst.status)
          ? {
              quotaId,
              status,
              number: item.number,
              confirmationLikelihood: item.confirmationLikelihood,
            }
          : worst;
      }, generated);
    });
    return summarizeClassAvailability(
      travelClass,
      perPassengerFare * passengerCount,
      quotaAvailability,
    );
  });
}

function fareAndAvailability(edge: Connection, input: SearchInput) {
  const travelClass =
    input.travelClass === "ANY"
      ? (trainById.get(edge.serviceId)?.classes[0] ?? "SL")
      : input.travelClass;
  const date = datasetDate(input.date);
  const fare =
    fares.find(
      (x) =>
        x.trainId === edge.serviceId &&
        x.fromStation === edge.fromStation &&
        x.toStation === edge.toStation &&
        x.travelDate === date &&
        x.class === travelClass,
    ) ??
    fares.find(
      (x) =>
        x.trainId === edge.serviceId &&
        x.fromStation === edge.fromStation &&
        x.toStation === edge.toStation &&
        x.travelDate === date,
    );
  const seats =
    availability.find(
      (x) =>
        x.trainId === edge.serviceId &&
        x.fromStation === edge.fromStation &&
        x.toStation === edge.toStation &&
        x.travelDate === date &&
        x.class === (fare?.class ?? travelClass) &&
        x.quota === (input.mode === "tatkal" ? "TQ" : "GN"),
    ) ??
    availability.find(
      (x) =>
        x.trainId === edge.serviceId &&
        x.fromStation === edge.fromStation &&
        x.toStation === edge.toStation &&
        x.travelDate === date,
    );
  return {
    fare: fare?.totalFare ?? Math.max(80, Math.round(edge.distanceKm * 1.6)),
    seats: seats
      ? { ...seats, status: normalizeAvailabilityStatus(seats.status) }
      : null,
    travelClass: fare?.class ?? travelClass,
  };
}

function toLeg(
  edge: Connection,
  index: number,
  elapsed: number,
  input: SearchInput,
): JourneyLeg | null {
  const from = stationById.get(edge.fromStation);
  const to = stationById.get(edge.toStation);
  if (!from || !to) return null;
  const service = trainById.get(edge.serviceId);
  const details = fareAndAvailability(edge, input);
  const departureMinutes =
    360 +
    ((Number(edge.serviceId.replace(/\D/g, "")) || index * 37) % 720) +
    elapsed;
  return {
    id: edge.connectionId,
    mode: edge.mode === "train" ? "train" : "metro",
    serviceId: edge.serviceId,
    serviceName: service?.name ?? "RailEase Metro Link",
    serviceNumber: service?.trainNumber ?? "CITY-LINK",
    from,
    to,
    departure: time(departureMinutes),
    arrival: time(departureMinutes + edge.durationMinutes),
    durationMinutes: edge.durationMinutes,
    fare: details.fare,
    travelClass: details.travelClass,
    availability: details.seats,
    facilities: service?.features ?? ["wheelchair"],
  };
}

function paths(
  origin: string,
  destination: string,
  maxEdges: number,
): Connection[][] {
  const results: Connection[][] = [];
  const queue: { at: string; path: Connection[]; seen: Set<string> }[] = [
    { at: origin, path: [], seen: new Set([origin]) },
  ];
  while (queue.length && results.length < 40) {
    const current = queue.shift()!;
    if (current.path.length >= maxEdges) continue;
    for (const edge of (adjacency.get(current.at) ?? []).slice(0, 80)) {
      if (current.seen.has(edge.toStation)) continue;
      const next = [...current.path, edge];
      if (edge.toStation === destination) results.push(next);
      else
        queue.push({
          at: edge.toStation,
          path: next,
          seen: new Set([...current.seen, edge.toStation]),
        });
      if (queue.length > 2500) queue.length = 2500;
    }
  }
  return results;
}

export function searchJourneys(input: SearchInput): Journey[] {
  const originStation = stationById.get(input.origin);
  const destinationStation = stationById.get(input.destination);
  if (
    !originStation ||
    !destinationStation ||
    input.origin === input.destination
  )
    return [];
  let found = paths(input.origin, input.destination, 3);
  if (!found.length) {
    const originPeers = [...stationById.values()]
      .filter((x) => x.cityId === originStation.cityId)
      .slice(0, 3);
    const destinationPeers = [...stationById.values()]
      .filter((x) => x.cityId === destinationStation.cityId)
      .slice(0, 3);
    found = originPeers
      .flatMap((o) =>
        destinationPeers.flatMap((d) => paths(o.stationId, d.stationId, 3)),
      )
      .slice(0, 30);
  }
  const passengers = input.adults + input.children;
  const journeys = found
    .map((path, journeyIndex): Journey | null => {
      let elapsed = 0;
      const legs: JourneyLeg[] = [];
      path.forEach((edge, index) => {
        const leg = toLeg(edge, index, elapsed, input);
        if (leg) legs.push(leg);
        elapsed += edge.durationMinutes + (index < path.length - 1 ? 45 : 0);
      });
      if (!legs.length) return null;
      const classAvailability = journeyClassAvailability(legs, input);
      const selectedClass =
        classAvailability.find(
          (item) => item.travelClass === input.travelClass,
        ) ?? classAvailability[0];
      const totalFare =
        selectedClass?.fare ??
        legs.reduce((sum, x) => sum + x.fare, 0) * Math.max(1, passengers);
      const status = selectedClass?.status ?? "REGRET";
      const modes = [...new Set(legs.map((x) => x.mode))] as TransportMode[];
      const score = Math.round(
        Math.min(
          100,
          Math.max(
            1,
            100 -
              elapsed / 80 -
              totalFare / 650 -
              Math.max(0, legs.length - 1) * 7 +
              availabilityRank(status) * 4,
          ),
        ),
      );
      return {
        id: `journey-${journeyIndex}-${path.map((x) => x.connectionId).join("-")}`,
        origin: legs[0].from,
        destination: legs.at(-1)!.to,
        departure: legs[0].departure,
        arrival: legs.at(-1)!.arrival,
        durationMinutes: elapsed,
        totalFare,
        transfers: Math.max(0, legs.length - 1),
        legs,
        modes,
        availability: status,
        classAvailability,
        score,
        label: null,
        whyRecommended: [],
      };
    })
    .filter((x): x is Journey => Boolean(x));
  if (!journeys.length) return [];
  const fastest = [...journeys].sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  )[0];
  const cheapest = [...journeys].sort((a, b) => a.totalFare - b.totalFare)[0];
  for (const j of journeys) {
    j.whyRecommended = [
      j.totalFare < fastest.totalFare
        ? {
            key: "components.journeyCard.reasons.cheaper",
            variables: { amount: fastest.totalFare - j.totalFare },
          }
        : { key: "components.journeyCard.reasons.fastest" },
      j.transfers === 0
        ? { key: "components.journeyCard.reasons.direct" }
        : {
            key: `components.journeyCard.reasons.${j.transfers === 1 ? "transfer" : "transfers"}`,
            variables: { count: j.transfers },
          },
      j.availability === "AVAILABLE"
        ? { key: "components.journeyCard.reasons.availability" }
        : {
            key: "components.journeyCard.reasons.status",
            variables: { status: j.availability },
          },
      j.durationMinutes < cheapest.durationMinutes
        ? {
            key: "components.journeyCard.reasons.faster",
            variables: {
              hours: Math.round(
                (cheapest.durationMinutes - j.durationMinutes) / 60,
              ),
            },
          }
        : { key: "components.journeyCard.reasons.lowest" },
    ];
  }
  const recommended = [...journeys].sort((a, b) => b.score - a.score)[0];
  recommended.label = "Recommended";
  fastest.label ||= "Fastest";
  cheapest.label ||= "Cheapest";
  return journeys.sort((a, b) => b.score - a.score).slice(0, 16);
}

export function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function quotaEligibility(
  quotaId: string,
  passengers: { age: number; gender: string; citizenship: string }[],
) {
  if (quotaId === "SS")
    return passengers.every((p) =>
      p.gender === "female" ? p.age >= 58 : p.age >= 60,
    );
  if (quotaId === "LD") return passengers.every((p) => p.gender === "female");
  if (quotaId === "FT")
    return passengers.every((p) => p.citizenship !== "Indian");
  return true;
}

export function passengerEligibleQuotaIds(
  passenger: Passenger,
  _mode: SearchInput["mode"],
) {
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
  const eligibleQuotaIds = new Set<string>(
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
    return {
      quotaId: preferredQuotaId,
      preferredQuotaId,
      usedFallback: false,
    };

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

export function calculateFareBreakdown(baseFare: number, quotaId: string) {
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
    total: discountedFare + serviceFee + gst,
  };
}
