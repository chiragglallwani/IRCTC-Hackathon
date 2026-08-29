import hotelsJson from "@/irctc-hackathon-mock/data/large/hotels.json";
import tourismPlacesJson from "@/irctc-hackathon-mock/data/large/tourism-places.json";
import tourismJson from "@/irctc-hackathon-mock/data/large/tourism.json";
import { cityById, stationById } from "./places";
import type { Hotel, TourismDestination } from "./types";

export { cityById } from "./places";
const tourismEnhancements = new Map(
  tourismPlacesJson.records.map((item) => [item.destinationId, item]),
);
export const tourism = (tourismJson.records as TourismDestination[]).map(
  (destination) => ({
    ...destination,
    ...tourismEnhancements.get(destination.destinationId),
  }),
);
export const hotels = hotelsJson.records as Hotel[];

export function destinationDetails(id: string) {
  const destination = tourism.find(
    (item) =>
      item.destinationId === id ||
      cityById.get(item.cityId)?.name.toLowerCase() === id?.toLowerCase(),
  );
  if (!destination) return null;
  return {
    destination,
    city: cityById.get(destination.cityId),
    station: stationById.get(destination.nearestStationId),
    hotels: hotels
      .filter((hotel) => hotel.cityId === destination.cityId)
      .slice(0, 6),
  };
}
