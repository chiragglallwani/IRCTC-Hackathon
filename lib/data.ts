import citiesJson from "@/irctc-hackathon-mock/data/large/cities.json";
import stationsJson from "@/irctc-hackathon-mock/data/large/stations.json";
import trainsJson from "@/irctc-hackathon-mock/data/large/trains.json";
import routesJson from "@/irctc-hackathon-mock/data/large/train-routes.json";
import connectionsJson from "@/irctc-hackathon-mock/data/large/connections.json";
import faresJson from "@/irctc-hackathon-mock/data/large/fares.json";
import availabilityJson from "@/irctc-hackathon-mock/data/large/availability.json";
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

export const cities = citiesJson.records as City[];
export const stations = stationsJson.records as Station[];
export const trains = trainsJson.records as Train[];
export const routes = routesJson.records as TrainRoute[];
export const connections = connectionsJson.records as Connection[];
export const fares = faresJson.records as Fare[];
export const availability = availabilityJson.records as Availability[];
export const quotas = quotasJson.records as Quota[];
export const tourism = tourismJson.records as TourismDestination[];
export const hotels = hotelsJson.records as Hotel[];

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
