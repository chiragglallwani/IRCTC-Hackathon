import {
  availability,
  connections,
  fares,
  stationById,
  trainById,
} from "./data";
import type {
  AvailabilityStatus,
  Connection,
  Journey,
  JourneyLeg,
  SearchInput,
  TransportMode,
} from "./types";

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
    seats: seats ?? null,
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
      const totalFare =
        legs.reduce((sum, x) => sum + x.fare, 0) * Math.max(1, passengers);
      const status = legs.reduce<AvailabilityStatus>(
        (worst, x) =>
          x.availability &&
          availabilityRank(x.availability.status) < availabilityRank(worst)
            ? x.availability.status
            : worst,
        "AVAILABLE",
      );
      const modes = [...new Set(legs.map((x) => x.mode))] as TransportMode[];
      const score = Math.round(
        Math.max(
          1,
          100 -
            elapsed / 80 -
            totalFare / 650 -
            Math.max(0, legs.length - 1) * 7 +
            availabilityRank(status) * 4,
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
