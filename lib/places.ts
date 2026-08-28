import citiesJson from "@/irctc-hackathon-mock/data/large/cities.json";
import stationsJson from "@/irctc-hackathon-mock/data/large/stations.json";
import type { City, Station } from "./types";

export const cities = citiesJson.records as City[];
export const stations = stationsJson.records as Station[];
export const cityById = new Map(cities.map((city) => [city.cityId, city]));
export const stationById = new Map(
  stations.map((station) => [station.stationId, station]),
);

export function findPlaces(query: string, limit = 8): Station[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery)
    return stations
      .filter(
        (station) =>
          station.cityStationRank === 1 &&
          cityById.get(station.cityId)?.popular,
      )
      .slice(0, limit);
  return stations
    .map((station) => {
      const city = cityById.get(station.cityId);
      const stationCode = station.code.toLowerCase();
      const stationName = station.name.toLowerCase();
      const cityName = city?.name.toLowerCase() ?? "";
      return {
        station,
        city,
        haystack:
          `${stationName} ${stationCode} ${cityName} ${city?.aliases.join(" ") ?? ""}`.toLowerCase(),
        rank:
          stationCode === normalizedQuery
            ? 0
            : stationName.startsWith(normalizedQuery)
              ? 1
              : cityName.startsWith(normalizedQuery)
                ? 2
                : 3,
      };
    })
    .filter(({ haystack }) => haystack.includes(normalizedQuery))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.station.cityStationRank - b.station.cityStationRank,
    )
    .slice(0, limit)
    .map(({ station }) => station);
}
