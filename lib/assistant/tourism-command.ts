import { tourism, cityById } from "@/lib/tourism-data";
import { dateOffset } from "@/lib/search-navigation";
import { parseSpokenDate } from "./local-command-parser";
import { emptyTourismDraft, type TourismDraft } from "./schema";

const monthNames =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

export function normalizeTourismBookingReference(value: string) {
  const match = value.match(/\br\s*t\s*p(?:\s+hyphen)?[\s-]*((?:\d[\s-]*){8})\b/i);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits.length === 8 ? `RTP-${digits}` : null;
}

export function resolveTourismDestination(query: string) {
  const normalized = query.trim().toLowerCase().replace(/^discover\s+/, "");
  return tourism.filter((destination) => {
    const city = cityById.get(destination.cityId);
    return [destination.destinationId, destination.title, city?.name]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().replace(/^discover\s+/, "") === normalized,
      );
  });
}

function mentionedDates(text: string, now: Date) {
  const pattern = new RegExp(
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${monthNames})(?:[\\s,]+20\\d{2})?\\b`,
    "g",
  );
  return [...text.matchAll(pattern)]
    .map((match) => parseSpokenDate(match[0], now))
    .filter((date): date is string => Boolean(date));
}

function count(text: string, noun: string) {
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const match = text.match(
    new RegExp(`\\b(\\d+|${Object.keys(words).join("|")})\\s+${noun}s?\\b`),
  );
  if (!match) return null;
  return Number.isFinite(Number(match[1])) ? Number(match[1]) : words[match[1]];
}

export function parseLocalTourismCommand(
  utterance: string,
  existing: TourismDraft = emptyTourismDraft,
  now = new Date(),
) {
  const text = utterance.trim().toLowerCase();
  if (
    /\b(cancel|cancellation)\b/.test(text) &&
    /\b(tourism|tour|trip|holiday|vacation|itinerary|package)\b/.test(text)
  )
    return {
      action: "cancel_tourism_booking" as const,
      draft: existing,
      bookingReference: normalizeTourismBookingReference(utterance),
    };
  if (/\b(?:show|open|view)\b.*\b(?:tourism|holiday|package)\s+bookings?\b/.test(text))
    return { action: "view_tourism_bookings" as const, draft: existing };
  if (!/\b(tourism|tour|trip|holiday|vacation|itinerary|package|getaway)\b/.test(text))
    return null;

  const destination = text.match(
    /\b(?:tourism|tour|trip|holiday|vacation|itinerary|package|getaway)\s+(?:to|for|in)\s+(.+?)(?=\s+(?:from|starting|on|between|for\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)|with|under|within|budget)|$)/,
  )?.[1];
  const dates = mentionedDates(text, now);
  const durationDays = count(text, "day") ?? existing.durationDays;
  const startDate = dates[0] ?? existing.startDate;
  const endDate =
    dates[1] ??
    (dates[0] && durationDays ? dateOffset(dates[0], durationDays - 1) : existing.endDate);
  const budgetMatch = text.match(
    /(?:budget(?:\s+of)?|under|within)\s*(?:₹|rs\.?|rupees?)?\s*(\d{4,6})/,
  );
  const travelers =
    count(text, "traveler") ??
    count(text, "traveller") ??
    count(text, "person") ??
    count(text, "people") ??
    existing.travelers;
  const rooms = count(text, "room") ?? existing.rooms;
  const draft: TourismDraft = {
    ...existing,
    destinationQuery: destination?.trim() ?? existing.destinationQuery,
    startDate,
    endDate,
    durationDays,
    travelers,
    rooms,
    budget: budgetMatch ? Number(budgetMatch[1]) : existing.budget,
    style: /senior/.test(text)
      ? "Senior-friendly"
      : /couple|romantic|honeymoon/.test(text)
        ? "Couple"
        : /solo/.test(text)
          ? "Solo"
          : /family/.test(text)
            ? "Family"
            : existing.style,
    pace: /relaxed|slow/.test(text)
      ? "Relaxed"
      : /packed|busy/.test(text)
        ? "Packed"
        : /balanced/.test(text)
          ? "Balanced"
          : existing.pace,
    travelMode: /\bbus\b/.test(text)
      ? "Bus"
      : /train.+local|local.+train/.test(text)
        ? "Train + local transport"
        : /\btrain\b/.test(text)
          ? "Train"
          : existing.travelMode,
    accommodation: /luxury|5-star|five star/.test(text)
      ? "Luxury"
      : /4-star|four star/.test(text)
        ? "4-star"
        : /3-star|three star/.test(text)
          ? "3-star"
          : /budget (?:hotel|stay|accommodation)/.test(text)
            ? "Budget"
            : existing.accommodation,
    mealPlan: /no meals?/.test(text)
      ? "No meals"
      : /breakfast.+dinner|dinner.+breakfast/.test(text)
        ? "Breakfast + dinner"
        : /breakfast/.test(text)
          ? "Breakfast"
          : existing.mealPlan,
  };
  return { action: "plan_tourism" as const, draft };
}

export function buildTourismPlannerUrl(destinationId: string, draft: TourismDraft) {
  const params = new URLSearchParams({ destination: destinationId });
  const values: Array<[string, string | number | null]> = [
    ["startDate", draft.startDate],
    ["endDate", draft.endDate],
    ["budget", draft.budget],
    ["style", draft.style],
    ["pace", draft.pace],
    ["travelMode", draft.travelMode],
    ["accommodation", draft.accommodation],
    ["mealPlan", draft.mealPlan],
    ["travelers", draft.travelers],
    ["rooms", draft.rooms],
  ];
  for (const [key, value] of values)
    if (value !== null) params.set(key, String(value));
  return `/tourism/plan?${params.toString()}`;
}
