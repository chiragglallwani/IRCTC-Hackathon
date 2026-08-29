import {
  availability,
  connections,
  fares,
  routes,
  stationById,
  trainById,
} from "./data";
import type {
  AvailabilityStatus,
  Availability,
  ClassSeatAvailability,
  Connection,
  Fare,
  Journey,
  JourneyLeg,
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
for (const edge of connections) {
  const outgoing = adjacency.get(edge.fromStation);
  if (outgoing) outgoing.push(edge);
  else adjacency.set(edge.fromStation, [edge]);
}

const routeByTrain = new Map(routes.map((route) => [route.trainId, route]));

const fareByClass = new Map<string, Fare>();
const fareByClassQuota = new Map<string, Fare>();
const firstFareByRoute = new Map<string, Fare>();
const availabilityByClassQuota = new Map<string, Availability>();
const firstAvailabilityByRoute = new Map<string, Availability>();

function routeDateKey(
  trainId: string,
  fromStation: string,
  toStation: string,
  travelDate: string,
) {
  return `${trainId}|${fromStation}|${toStation}|${travelDate}`;
}

for (const fare of fares) {
  const routeKey = routeDateKey(
    fare.trainId,
    fare.fromStation,
    fare.toStation,
    fare.travelDate,
  );
  if (!firstFareByRoute.has(routeKey)) firstFareByRoute.set(routeKey, fare);
  const classKey = `${routeKey}|${fare.class}`;
  if (!fareByClass.has(classKey)) fareByClass.set(classKey, fare);
  fareByClassQuota.set(`${classKey}|${fare.quota}`, fare);
}

for (const item of availability) {
  const routeKey = routeDateKey(
    item.trainId,
    item.fromStation,
    item.toStation,
    item.travelDate,
  );
  if (!firstAvailabilityByRoute.has(routeKey))
    firstAvailabilityByRoute.set(routeKey, item);
  availabilityByClassQuota.set(`${routeKey}|${item.class}|${item.quota}`, item);
}

function fareFor(
  trainId: string,
  fromStation: string,
  toStation: string,
  travelDate: string,
  travelClass?: string,
  quota?: string,
) {
  const routeKey = routeDateKey(trainId, fromStation, toStation, travelDate);
  if (!travelClass) return firstFareByRoute.get(routeKey);
  const classKey = `${routeKey}|${travelClass}`;
  return quota
    ? fareByClassQuota.get(`${classKey}|${quota}`)
    : fareByClass.get(classKey);
}

function availabilityFor(
  trainId: string,
  fromStation: string,
  toStation: string,
  travelDate: string,
  travelClass?: string,
  quota?: string,
) {
  const routeKey = routeDateKey(trainId, fromStation, toStation, travelDate);
  return travelClass && quota
    ? availabilityByClassQuota.get(`${routeKey}|${travelClass}|${quota}`)
    : firstAvailabilityByRoute.get(routeKey);
}

function time(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function clockMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function scheduledDeparture(edge: Connection, index: number) {
  const departure = routeByTrain
    .get(edge.serviceId)
    ?.stops.find((stop) => stop.stationId === edge.fromStation)?.departure;
  return departure
    ? clockMinutes(departure)
    : 360 + ((Number(edge.serviceId.replace(/\D/g, "")) || index * 37) % 720);
}

function nextDepartureAfter(scheduledClock: number, arrival: number) {
  const arrivalDay = Math.floor(arrival / 1440) * 1440;
  const sameDayDeparture = arrivalDay + scheduledClock;
  return sameDayDeparture >= arrival
    ? sameDayDeparture
    : sameDayDeparture + 1440;
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
    (total, leg) =>
      total + Math.max(80, leg.fare / Math.max(1, passengerCount)),
    0,
  );

  return classes.map((travelClass) => {
    const factor = classFareFactors[travelClass] ?? 1;
    const baseFactor = classFareFactors[legs[0]?.travelClass] ?? 1;
    const exactFares = legs.map((leg) =>
      fareFor(
        leg.serviceId,
        leg.from.stationId,
        leg.to.stationId,
        date,
        travelClass,
        "GN",
      ),
    );
    const perPassengerFare = exactFares.every(Boolean)
      ? exactFares.reduce((total, fare) => total + (fare?.totalFare ?? 0), 0)
      : Math.max(80, Math.round((distanceFare / baseFactor) * factor));
    const quotaAvailability = DISPLAY_QUOTA_IDS.map((quotaId) => {
      const seeded = legs
        .map((leg) =>
          availabilityFor(
            leg.serviceId,
            leg.from.stationId,
            leg.to.stationId,
            date,
            travelClass,
            quotaId,
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
    fareFor(
      edge.serviceId,
      edge.fromStation,
      edge.toStation,
      date,
      travelClass,
    ) ?? fareFor(edge.serviceId, edge.fromStation, edge.toStation, date);
  const seats =
    availabilityFor(
      edge.serviceId,
      edge.fromStation,
      edge.toStation,
      date,
      fare?.class ?? travelClass,
      input.mode === "tatkal" ? "TQ" : "GN",
    ) ??
    availabilityFor(edge.serviceId, edge.fromStation, edge.toStation, date);
  return {
    fare: fare?.totalFare ?? Math.max(80, Math.round(edge.distanceKm * 1.6)),
    seats: seats
      ? { ...seats, status: normalizeAvailabilityStatus(seats.status) }
      : null,
    travelClass: fare?.class ?? travelClass,
  };
}

function legTicketOptions(
  edge: Connection,
  input: SearchInput,
  fallbackFare: number,
): ClassSeatAvailability[] {
  const passengerCount = Math.max(1, input.adults + input.children);
  const classes = trainById.get(edge.serviceId)?.classes ?? [input.travelClass];
  const date = datasetDate(input.date);
  const baseClass = classes[0] ?? "SL";

  return classes.map((travelClass) => {
    const exactFare = fareFor(
      edge.serviceId,
      edge.fromStation,
      edge.toStation,
      date,
      travelClass,
      "GN",
    );
    const perPassengerFare =
      exactFare?.totalFare ??
      Math.max(
        80,
        Math.round(
          (fallbackFare / (classFareFactors[baseClass] ?? 1)) *
            (classFareFactors[travelClass] ?? 1),
        ),
      );
    const quotasForClass = DISPLAY_QUOTA_IDS.map((quotaId) => {
      const seeded = availabilityFor(
        edge.serviceId,
        edge.fromStation,
        edge.toStation,
        date,
        travelClass,
        quotaId,
      );
      return generatedQuotaAvailability(
        edge.connectionId,
        travelClass,
        quotaId,
        seeded,
      );
    });
    return summarizeClassAvailability(
      travelClass,
      perPassengerFare * passengerCount,
      quotasForClass,
    );
  });
}

function toLeg(
  edge: Connection,
  departureMinutes: number,
  input: SearchInput,
): JourneyLeg | null {
  const from = stationById.get(edge.fromStation);
  const to = stationById.get(edge.toStation);
  if (!from || !to) return null;
  const service = trainById.get(edge.serviceId);
  const details = fareAndAvailability(edge, input);
  const ticketOptions = legTicketOptions(edge, input, details.fare);
  const preferredTicket =
    ticketOptions.find((item) => item.travelClass === details.travelClass) ??
    ticketOptions[0];
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
    fare: preferredTicket?.fare ?? details.fare,
    travelClass: preferredTicket?.travelClass ?? details.travelClass,
    availability: details.seats,
    ticketOptions,
    facilities: service?.features ?? ["wheelchair"],
  };
}

const pathCache = new Map<string, Connection[][]>();

function paths(
  origin: string,
  destination: string,
  maxEdges: number,
): Connection[][] {
  const cacheKey = `${origin}|${destination}|${maxEdges}`;
  const cached = pathCache.get(cacheKey);
  if (cached) return cached;
  const results: Connection[][] = [];
  const queue: { at: string; path: Connection[]; seen: Set<string> }[] = [
    { at: origin, path: [], seen: new Set([origin]) },
  ];
  let cursor = 0;
  while (cursor < queue.length && results.length < 40) {
    const current = queue[cursor++];
    if (current.path.length >= maxEdges) continue;
    const outgoing = adjacency.get(current.at) ?? [];
    for (
      let edgeIndex = 0;
      edgeIndex < Math.min(80, outgoing.length);
      edgeIndex++
    ) {
      const edge = outgoing[edgeIndex];
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
  if (pathCache.size >= 100) pathCache.delete(pathCache.keys().next().value!);
  pathCache.set(cacheKey, results);
  return results;
}

const journeyCache = new Map<string, Journey[]>();

export function searchJourneys(input: SearchInput): Journey[] {
  const cacheKey = [
    input.origin,
    input.destination,
    input.date,
    input.adults,
    input.children,
    input.infants,
    input.travelClass,
    input.mode,
  ].join("|");
  const cached = journeyCache.get(cacheKey);
  if (cached) return cached;
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
      let firstDeparture = 0;
      let previousArrival: number | null = null;
      const legs: JourneyLeg[] = [];
      path.forEach((edge, index) => {
        const departureClock = scheduledDeparture(edge, index);
        const departureMinutes =
          previousArrival === null
            ? departureClock
            : nextDepartureAfter(departureClock, previousArrival);
        if (index === 0) firstDeparture = departureMinutes;
        const leg = toLeg(edge, departureMinutes, input);
        if (leg) legs.push(leg);
        previousArrival = departureMinutes + edge.durationMinutes;
      });
      if (!legs.length) return null;
      const elapsed = (previousArrival ?? firstDeparture) - firstDeparture;
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
  const result = journeys.sort((a, b) => b.score - a.score).slice(0, 16);
  if (journeyCache.size >= 80)
    journeyCache.delete(journeyCache.keys().next().value!);
  journeyCache.set(cacheKey, result);
  return result;
}

export {
  calculateFareBreakdown,
  formatDuration,
  MEAL_PRICE,
  passengerEligibleQuotaIds,
  quotaEligibility,
  selectBestAvailableQuota,
  selectEligibleQuota,
} from "./journey-utils";
