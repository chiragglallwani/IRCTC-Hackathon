import {
  emptyVoiceSearchDraft,
  type ParsedAssistantIntent,
  type VoiceSearchDraft,
} from "./schema";
import { dateOffset, todayDate, tomorrowDate } from "../search-navigation";

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  छह: 6,
};

function numberFrom(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : (numberWords[value.toLowerCase()] ?? null);
}

function nextWeekday(name: string, now = new Date()) {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = names.indexOf(name.toLowerCase());
  if (target < 0) return null;
  const delta = (target - now.getDay() + 7) % 7 || 7;
  return dateOffset(todayDate(now), delta);
}

const monthNumbers: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const monthPattern = Object.keys(monthNumbers).join("|");

function calendarDate(day: number, month: number, year: number) {
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function spokenCalendarDate(text: string, now: Date) {
  const dayFirst = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthPattern})(?:[\\s,]+(20\\d{2}))?\\b`),
  );
  const monthFirst = text.match(
    new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[\\s,]+(20\\d{2}))?\\b`),
  );
  const numeric = text.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/);

  const day = dayFirst
    ? Number(dayFirst[1])
    : monthFirst
      ? Number(monthFirst[2])
      : numeric
        ? Number(numeric[1])
        : null;
  const month = dayFirst
    ? monthNumbers[dayFirst[2]]
    : monthFirst
      ? monthNumbers[monthFirst[1]]
      : numeric
        ? Number(numeric[2])
        : null;
  const spokenYear = dayFirst?.[3] ?? monthFirst?.[3] ?? numeric?.[3];
  if (day === null || month === null) return null;

  let year = spokenYear ? Number(spokenYear) : now.getFullYear();
  let date = calendarDate(day, month, year);
  if (!spokenYear && date && date < todayDate(now)) {
    year += 1;
    date = calendarDate(day, month, year);
  }
  return date;
}

export function parseSpokenDate(text: string, now = new Date()) {
  if (/day after tomorrow|परसों/.test(text)) return dateOffset(todayDate(now), 2);
  if (/tomorrow|कल/.test(text)) return dateOffset(todayDate(now), 1);
  if (/today|आज/.test(text)) return todayDate(now);
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;
  const calendar = spokenCalendarDate(text, now);
  if (calendar) return calendar;
  for (const weekday of ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) {
    if (text.includes(weekday)) return nextWeekday(weekday, now);
  }
  return null;
}

function parseClass(text: string): VoiceSearchDraft["travelClass"] {
  if (/\b(1a|first ac|first class)\b/.test(text)) return "1A";
  if (/\b(2a|second ac|two tier|2 tier)\b/.test(text)) return "2A";
  if (/\b(3a|third ac|three tier|3 tier)\b/.test(text)) return "3A";
  if (/\b(sleeper|sl)\b|स्लीपर/.test(text)) return "SL";
  if (/\b(chair car|cc)\b/.test(text)) return "CC";
  if (/\b(executive|ec)\b/.test(text)) return "EC";
  if (/\b(any class|any)\b/.test(text)) return "ANY";
  return null;
}

function baseIntent(
  action: ParsedAssistantIntent["action"],
  draft: VoiceSearchDraft,
  assistantMessage: string,
): ParsedAssistantIntent {
  return {
    action,
    draft,
    tourismDraft: null,
    tourismBookingReference: null,
    resultReference: null,
    explanationTopic: null,
    missingFields: [],
    correctionFields: [],
    assistantMessage,
  };
}

export function parseLocalCommand(
  utterance: string,
  existing: VoiceSearchDraft = emptyVoiceSearchDraft,
  now = new Date(),
): ParsedAssistantIntent | null {
  const text = utterance.trim().toLowerCase();
  if (!text) return null;
  const containsRoute = /\bfrom\b.+\bto\b/.test(text) || /से.+तक/.test(text);
  const tatkalRequested = /tatkal|तत्काल/.test(text);
  if (/^(cancel|stop|start over|reset|रद्द|रोक)/.test(text))
    return baseIntent("cancel", emptyVoiceSearchDraft, "I cleared the current request.");

  const topic = /\brac\b/.test(text)
    ? "rac"
    : /waitlist|waiting list|\bwl\b/.test(text)
      ? "waitlist"
      : /quota|कोटा/.test(text)
        ? "quota"
        : /tatkal|तत्काल/.test(text)
          ? "tatkal"
          : /cancel.*ticket|cancellation/.test(text)
            ? "cancellation"
            : null;
  if (topic && /what|explain|meaning|mean|क्या|समझा/.test(text)) {
    const intent = baseIntent("explain_term", existing, "I can explain that railway term.");
    intent.explanationTopic = topic;
    return intent;
  }

  const ordinalMatch = text.match(/(?:select|choose|book|option|train)\s*(?:the\s*)?(\d+|one|two|three|four|five|first|second|third|fourth|fifth)/);
  if (ordinalMatch) {
    const ordinalNames: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
    const ordinal = ordinalNames[ordinalMatch[1]] ?? numberFrom(ordinalMatch[1]);
    if (ordinal) {
      const intent = baseIntent("select_journey", existing, `Reviewing option ${ordinal}.`);
      intent.resultReference = { ordinal, journeyId: null };
      return intent;
    }
  }

  if (!containsRoute && /cheapest|lowest fare|सबसे सस्त/.test(text))
    return { ...baseIntent("filter_results", { ...existing, sort: "cheapest" }, "Showing cheapest journeys first."), correctionFields: ["sort"] };
  if (!containsRoute && /fastest|earliest arrival|सबसे तेज/.test(text))
    return { ...baseIntent("filter_results", { ...existing, sort: "fastest" }, "Showing fastest journeys first."), correctionFields: ["sort"] };
  if (!containsRoute && /recommended|best option/.test(text))
    return { ...baseIntent("filter_results", { ...existing, sort: "recommended" }, "Showing recommended journeys first."), correctionFields: ["sort"] };
  if (!containsRoute && /direct only|no transfers|सीधी/.test(text))
    return { ...baseIntent("filter_results", { ...existing, maxTransfers: 0 }, "Showing direct journeys only."), correctionFields: ["maxTransfers"] };
  if (!containsRoute && /available only|confirmed only|confirmed seats|उपलब्ध/.test(text))
    return { ...baseIntent("filter_results", { ...existing, onlyAvailable: true }, "Showing journeys with confirmed availability."), correctionFields: ["onlyAvailable"] };
  if (/read.*result|describe.*result|what.*option/.test(text))
    return baseIntent("describe_results", existing, "Here are the leading journey options.");

  const budgetMatch = text.match(/(?:under|below|less than|maximum|budget)\s*(?:₹|rs\.?|rupees?)?\s*(\d{2,6})/);
  const departurePeriod = /morning|सुबह/.test(text)
    ? "morning"
    : /afternoon|दोपहर/.test(text)
      ? "afternoon"
      : /evening|शाम/.test(text)
        ? "evening"
        : /night|रात/.test(text)
          ? "night"
          : null;
  if (!containsRoute && (budgetMatch || departurePeriod)) {
    const next = {
      ...existing,
      maxFare: budgetMatch ? Number(budgetMatch[1]) : existing.maxFare,
      departurePeriod: departurePeriod ?? existing.departurePeriod,
    };
    return {
      ...baseIntent("filter_results", next, "I applied the requested fare or departure-time filter."),
      correctionFields: [
        ...(budgetMatch ? ["maxFare"] : []),
        ...(departurePeriod ? ["departurePeriod"] : []),
      ],
    };
  }

  const route = text.match(
    /(?:from\s+)(.+?)\s+(?:to)\s+(.+?)(?=\s+(?:(?:and\s+)?(?:today|tomorrow|day after tomorrow|on|date|journey date|travel date|for|in|with|cheapest|fastest|available|direct|redirect|take me|send me|go to))\b|$)/,
  );
  const hindiRoute = text.match(/(.+?)\s+से\s+(.+?)\s+(?:तक|जाना|की)/);
  const passenger = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|एक|दो|तीन|चार|पांच|छह)\s+(adult|adults|passenger|passengers|वयस्क|यात्री)/);
  const child = text.match(/(\d+|one|two|three|four|five|six|एक|दो|तीन|चार|पांच|छह)\s+(child|children|बच्च)/);
  const infant = text.match(/(\d+|one|two|three|four|five|six|एक|दो|तीन|चार|पांच|छह)\s+(infant|infants|शिशु)/);
  const spokenDate = parseSpokenDate(text, now);
  if (route || hindiRoute || spokenDate || passenger || parseClass(text) || tatkalRequested) {
    const next: VoiceSearchDraft = {
      ...existing,
      originQuery: route?.[1]?.trim() ?? hindiRoute?.[1]?.trim() ?? existing.originQuery,
      destinationQuery: route?.[2]?.trim() ?? hindiRoute?.[2]?.trim() ?? existing.destinationQuery,
      date: spokenDate ?? (tatkalRequested ? tomorrowDate(now) : existing.date),
      adults: numberFrom(passenger?.[1]) ?? existing.adults ?? 1,
      children: numberFrom(child?.[1]) ?? existing.children ?? 0,
      infants: numberFrom(infant?.[1]) ?? existing.infants ?? 0,
      travelClass: parseClass(text) ?? existing.travelClass ?? "ANY",
      mode: tatkalRequested ? "tatkal" : (existing.mode ?? "quick"),
      sort: /cheapest|सस्त/.test(text) ? "cheapest" : /fastest|तेज/.test(text) ? "fastest" : (existing.sort ?? "recommended"),
      onlyAvailable: /available|confirmed|उपलब्ध/.test(text) ? true : (existing.onlyAvailable ?? false),
      maxTransfers: /direct|सीधी/.test(text) ? 0 : existing.maxTransfers,
      maxFare: budgetMatch ? Number(budgetMatch[1]) : existing.maxFare,
      departurePeriod: departurePeriod ?? existing.departurePeriod,
    };
    const missing = [
      !next.originQuery && "originQuery",
      !next.destinationQuery && "destinationQuery",
      !next.date && "date",
    ].filter(Boolean) as string[];
    const intent = baseIntent(missing.length ? "clarify" : "search_trains", next, missing.length ? "I need a little more information." : "Please confirm the journey details before I search.");
    intent.missingFields = missing;
    return intent;
  }
  return null;
}

export function isAffirmative(value: string) {
  return /^(yes|yeah|yep|confirm|continue|search|go ahead|हाँ|हां|जी|ठीक)/i.test(value.trim());
}

export function isNegative(value: string) {
  return /^(no|cancel|stop|नहीं|नही|रद्द)/i.test(value.trim());
}
