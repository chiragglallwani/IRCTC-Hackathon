export type BookingMode = "tatkal" | "quick" | "explore" | "tourism";
export type TransportMode =
  "train" | "metro" | "bus" | "ship" | "plane" | "walk";
export type AvailabilityStatus = "AVAILABLE" | "RAC" | "WAITLIST" | "REGRET";

export interface City {
  cityId: string;
  name: string;
  state: string;
  country: string;
  type: string[];
  latitude: number;
  longitude: number;
  aliases: string[];
  languages: string[];
  popular: boolean;
}
export interface Station {
  stationId: string;
  code: string;
  name: string;
  cityId: string;
  state: string;
  type: string;
  latitude: number;
  longitude: number;
  facilities: string[];
  cityStationRank: number;
}
export interface Train {
  trainId: string;
  trainNumber: string;
  name: string;
  type: string;
  operator: string;
  classes: string[];
  daysOfOperation: string[];
  features: string[];
  reliabilityScore: number;
}
export interface RouteStop {
  stationId: string;
  sequence: number;
  arrival: string | null;
  departure: string | null;
  dayOffset: number;
  distanceKm: number;
  platform: string;
}
export interface TrainRoute {
  routeId: string;
  trainId: string;
  direction: string;
  stops: RouteStop[];
}
export interface Connection {
  connectionId: string;
  fromStation: string;
  toStation: string;
  serviceId: string;
  mode: "train" | "metro_transfer";
  durationMinutes: number;
  distanceKm: number;
  baseWeight: number;
  reliabilityScore: number;
}
export interface Fare {
  fareId: string;
  trainId: string;
  fromStation: string;
  toStation: string;
  travelDate: string;
  class: string;
  quota: string;
  components: Record<string, number>;
  totalFare: number;
  currency: string;
}
export interface Availability {
  availabilityId: string;
  trainId: string;
  fromStation: string;
  toStation: string;
  travelDate: string;
  class: string;
  quota: string;
  status: AvailabilityStatus;
  number: number;
  confirmationLikelihood: number;
  lastUpdated: string;
}
export interface Quota {
  quotaId: string;
  name: string;
  shortName: string;
  description: string;
  eligibility: { type: string; requiresVerification: boolean };
  displayPriority: number;
}
export interface TourismDestination {
  destinationId: string;
  cityId: string;
  title: string;
  themes: string[];
  bestMonths: string[];
  nearestStationId: string;
  attractions: Attraction[];
}
export interface Attraction {
  attractionId: string;
  name: string;
  category: string;
  durationMinutes: number;
  fromPrice: number;
}
export interface Hotel {
  hotelId: string;
  cityId: string;
  name: string;
  starRating: number;
  reviewScore: number;
  fromPrice: number;
  amenities: string[];
  distanceToStationKm: number;
  cancellationPolicy: string;
}

export interface SearchInput {
  origin: string;
  destination: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
  mode: BookingMode;
}
export interface JourneyLeg {
  id: string;
  mode: TransportMode;
  serviceId: string;
  serviceName: string;
  serviceNumber: string;
  from: Station;
  to: Station;
  departure: string;
  arrival: string;
  durationMinutes: number;
  fare: number;
  travelClass: string;
  availability: Availability | null;
  ticketOptions: ClassSeatAvailability[];
  facilities: string[];
}
export interface QuotaSeatAvailability {
  quotaId: string;
  status: AvailabilityStatus;
  number: number;
  confirmationLikelihood: number;
}
export interface ClassSeatAvailability {
  travelClass: string;
  fare: number;
  status: AvailabilityStatus;
  number: number;
  quotas: QuotaSeatAvailability[];
}
export interface Journey {
  id: string;
  origin: Station;
  destination: Station;
  departure: string;
  arrival: string;
  durationMinutes: number;
  totalFare: number;
  transfers: number;
  legs: JourneyLeg[];
  modes: TransportMode[];
  availability: AvailabilityStatus;
  classAvailability: ClassSeatAvailability[];
  score: number;
  label: "Recommended" | "Fastest" | "Cheapest" | null;
  whyRecommended: {
    key: string;
    variables?: Record<string, string | number>;
  }[];
}

export interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: "female" | "male" | "other";
  citizenship: string;
  berth: string;
  disabilityAssistance?: boolean;
  claimForeignTourist?: boolean;
  passportNumber?: string;
  claimDefence?: boolean;
  defenceServiceId?: string;
  claimDisability?: boolean;
  disabilityCertificate?: string;
  claimRailwayEmployee?: boolean;
  railwayEmployeeId?: string;
  saveForFuture?: boolean;
  mealRequested?: boolean;
}
export interface Booking {
  bookingId: string;
  pnr: string;
  userId: string;
  journey: Journey;
  date: string;
  passengers: Passenger[];
  travelClass: string;
  quota: string;
  fare: number;
  fareBreakdown?: {
    baseFare: number;
    passengerCount?: number;
    mealCount?: number;
    mealCost?: number;
    discountRate: number;
    discount: number;
    discountedFare: number;
    serviceFee: number;
    gst: number;
    total: number;
  };
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  bookingStatus: "upcoming" | "completed" | "cancelled";
  createdAt: string;
  cancelledAt?: string;
  refundAmount?: number;
}

export interface ItineraryActivity extends Attraction {
  time: string;
  travelMinutes: number;
  transportation: string;
}
export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}
export interface Itinerary {
  id: string;
  destination: TourismDestination;
  startDate: string;
  endDate: string;
  style: string;
  pace: string;
  travelers?: number;
  rooms?: number;
  travelMode?: string;
  accommodationType?: string;
  mealPlan?: string;
  hotel?: Hotel;
  days: ItineraryDay[];
  costs: {
    transport: number;
    accommodation: number;
    activities: number;
    meals: number;
    serviceFee: number;
    total: number;
  };
  confirmed: boolean;
  bookingReference?: string;
  bookedAt?: string;
  bookingStatus?: "confirmed" | "cancelled";
  paymentMethod?: "upi" | "card" | "pay_later";
  contact?: {
    name: string;
    email: string;
    phone: string;
  };
}
