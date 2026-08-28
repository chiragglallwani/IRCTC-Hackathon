"use client";
import type { Booking, Itinerary, Passenger } from "./types";

export const storageKeys = {
  user: "railease_user",
  accounts: "railease_accounts",
  session: "railease_session",
  passengers: "railease_passengers",
  bookings: "railease_bookings",
  itineraries: "railease_itineraries",
  preferences: "railease_preferences",
  checkout: "railease_checkout",
} as const;

export function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function saveStorage<T>(key: string, value: T) {
  if (typeof window !== "undefined")
    localStorage.setItem(key, JSON.stringify(value));
}
export function savedPassengers() {
  return loadStorage<Passenger[]>(storageKeys.passengers, []);
}
export function savedBookings() {
  return loadStorage<Booking[]>(storageKeys.bookings, []);
}
export function savedItineraries() {
  return loadStorage<Itinerary[]>(storageKeys.itineraries, []);
}
export function makePnr() {
  return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
}
