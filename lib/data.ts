import citiesJson from "@/irctc-hackathon-mock/data/large/cities.json";
import stationsJson from "@/irctc-hackathon-mock/data/large/stations.json";
import trainsJson from "@/irctc-hackathon-mock/data/large/trains.json";
import quotasJson from "@/irctc-hackathon-mock/data/large/quotas.json";
import tourismJson from "@/irctc-hackathon-mock/data/large/tourism.json";
import hotelsJson from "@/irctc-hackathon-mock/data/large/hotels.json";
import type {
  Availability,
  City,
  Connection,
  Fare,
  Hotel,
  Quota,
  Station,
  TourismDestination,
  Train,
  TrainRoute,
} from "./types";

type DataFile<T> = { records: T[] };

// Static `require` calls are intentional here. With `resolveJsonModule`, TypeScript
// attempts to infer a union from every row in these multi-megabyte generated files
// and exhausts its internal type-relation map. Webpack still bundles literal JSON
// requires, while the declared boundary type keeps application code type-safe.
/* eslint-disable @typescript-eslint/no-require-imports */
const routesJson =
  require("@/irctc-hackathon-mock/data/large/train-routes.json") as DataFile<TrainRoute>;
const connectionsJson =
  require("@/irctc-hackathon-mock/data/large/connections.json") as DataFile<Connection>;
const faresJson =
  require("@/irctc-hackathon-mock/data/large/fares.json") as DataFile<Fare>;
const availabilityJson =
  require("@/irctc-hackathon-mock/data/large/availability.json") as DataFile<Availability>;
/* eslint-enable @typescript-eslint/no-require-imports */

// Avoid asking TypeScript to structurally compare every record in these large
// generated JSON files. Runtime consumers use the normalized dataset contract
// represented by the interfaces below.
export const cities = citiesJson.records as unknown as City[];
export const stations = stationsJson.records as unknown as Station[];
export const trains = trainsJson.records as unknown as Train[];
export const routes = routesJson.records;
export const connections = connectionsJson.records;
export const fares = faresJson.records;
export const availability = availabilityJson.records;
export const quotas = quotasJson.records as unknown as Quota[];
export const tourism = tourismJson.records as unknown as TourismDestination[];
export const hotels = hotelsJson.records as unknown as Hotel[];

export const cityById = new Map(cities.map((x) => [x.cityId, x]));
export const stationById = new Map(stations.map((x) => [x.stationId, x]));
export const trainById = new Map(trains.map((x) => [x.trainId, x]));

export function findPlaces(query: string, limit = 8): Station[] {
  const q = query.trim().toLowerCase();
  if (!q)
    return stations
      .filter((x) => x.cityStationRank === 1 && cityById.get(x.cityId)?.popular)
      .slice(0, limit);
  return stations
    .map((station) => ({
      station,
      city: cityById.get(station.cityId),
      rank:
        station.code.toLowerCase() === q
          ? 0
          : station.name.toLowerCase().startsWith(q)
            ? 1
            : cityById.get(station.cityId)?.name.toLowerCase().startsWith(q)
              ? 2
              : 3,
    }))
    .filter(({ station, city }) =>
      `${station.name} ${station.code} ${city?.name ?? ""} ${city?.aliases.join(" ") ?? ""}`
        .toLowerCase()
        .includes(q),
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.station.cityStationRank - b.station.cityStationRank,
    )
    .slice(0, limit)
    .map((x) => x.station);
}

export function destinationDetails(id: string) {
  const destination = tourism.find(
    (x) =>
      x.destinationId === id ||
      cityById.get(x.cityId)?.name.toLowerCase() === id?.toLowerCase(),
  );
  if (!destination) return null;
  return {
    destination,
    city: cityById.get(destination.cityId),
    station: stationById.get(destination.nearestStationId),
    hotels: hotels.filter((x) => x.cityId === destination.cityId).slice(0, 6),
  };
}
