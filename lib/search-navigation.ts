import type { BookingMode, SearchInput } from "./types";

export type SearchValidationCode =
  | "PAST_DATE"
  | "TATKAL_DATE"
  | "MISSING_PLACES"
  | "SAME_PLACE"
  | "INVALID_PASSENGERS";

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDate(now = new Date()) {
  return formatLocalDate(now);
}

export function dateOffset(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + offset);
  return formatLocalDate(value);
}

export function tomorrowDate(now = new Date()) {
  return dateOffset(formatLocalDate(now), 1);
}

export function validateSearchInput(
  input: SearchInput,
  now = new Date(),
): SearchValidationCode | null {
  if (!input.origin || !input.destination) return "MISSING_PLACES";
  if (input.origin === input.destination) return "SAME_PLACE";
  if (input.mode === "tatkal" && input.date !== tomorrowDate(now))
    return "TATKAL_DATE";
  if (input.mode !== "tatkal" && input.date < todayDate(now))
    return "PAST_DATE";
  if (
    input.adults < 1 ||
    input.adults > 9 ||
    input.children < 0 ||
    input.children > 6 ||
    input.infants < 0 ||
    input.infants > 6
  )
    return "INVALID_PASSENGERS";
  return null;
}

export function buildSearchUrl(input: SearchInput) {
  const query = new URLSearchParams({
    origin: input.origin,
    destination: input.destination,
    date: input.date,
    adults: String(input.adults),
    children: String(input.children),
    infants: String(input.infants),
    class: input.travelClass,
    mode: input.mode,
  });
  return `/search?${query.toString()}`;
}

export function normalizedMode(value: string | null): BookingMode {
  return value === "tatkal" || value === "quick" || value === "tourism"
    ? value
    : "explore";
}
