import { cityById, findPlaces } from "../places";
import type { Station } from "../types";

export interface StationResolution {
  status: "resolved" | "ambiguous" | "not_found";
  station: Station | null;
  candidates: Station[];
}

export function resolveStation(query: string | null): StationResolution {
  if (!query) return { status: "not_found", station: null, candidates: [] };
  const candidates = findPlaces(query, 5);
  if (!candidates.length)
    return { status: "not_found", station: null, candidates: [] };
  const normalized = query.trim().toLowerCase();
  const exact = candidates.filter((station) => {
    const city = cityById.get(station.cityId);
    return (
      station.code.toLowerCase() === normalized ||
      station.name.toLowerCase() === normalized ||
      city?.name.toLowerCase() === normalized
    );
  });
  if (exact.length === 1)
    return { status: "resolved", station: exact[0], candidates };
  if (candidates.length === 1)
    return { status: "resolved", station: candidates[0], candidates };
  return { status: "ambiguous", station: null, candidates };
}
