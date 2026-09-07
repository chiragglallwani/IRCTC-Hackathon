import { z } from "zod";

export const travelClasses = [
  "ANY",
  "1A",
  "2A",
  "3A",
  "SL",
  "CC",
  "EC",
] as const;
export const assistantActions = [
  "search_trains",
  "modify_search",
  "filter_results",
  "describe_results",
  "select_journey",
  "plan_tourism",
  "view_tourism_bookings",
  "cancel_tourism_booking",
  "explain_term",
  "clarify",
  "cancel",
  "unsupported",
] as const;

export const voiceSearchDraftSchema = z.object({
  originQuery: z.string().max(100).nullable(),
  destinationQuery: z.string().max(100).nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  adults: z.number().int().min(1).max(9).nullable(),
  children: z.number().int().min(0).max(6).nullable(),
  infants: z.number().int().min(0).max(6).nullable(),
  travelClass: z.enum(travelClasses).nullable(),
  mode: z.enum(["quick", "explore", "tatkal"]).nullable(),
  sort: z.enum(["recommended", "cheapest", "fastest"]).nullable(),
  onlyAvailable: z.boolean().nullable(),
  maxTransfers: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable(),
  maxFare: z.number().positive().max(100000).nullable(),
  departurePeriod: z
    .enum(["morning", "afternoon", "evening", "night"])
    .nullable(),
});

export const emptyVoiceSearchDraft: VoiceSearchDraft = {
  originQuery: null,
  destinationQuery: null,
  date: null,
  adults: null,
  children: null,
  infants: null,
  travelClass: null,
  mode: null,
  sort: null,
  onlyAvailable: null,
  maxTransfers: null,
  maxFare: null,
  departurePeriod: null,
};

export const tourismDraftSchema = z.object({
  destinationQuery: z.string().max(100).nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  durationDays: z.number().int().min(1).max(30).nullable(),
  travelers: z.number().int().min(1).max(20).nullable(),
  rooms: z.number().int().min(1).max(10).nullable(),
  budget: z.number().int().min(5000).max(500000).nullable(),
  style: z.enum(["Family", "Couple", "Solo", "Senior-friendly"]).nullable(),
  pace: z.enum(["Relaxed", "Balanced", "Packed"]).nullable(),
  travelMode: z.enum(["Train", "Train + local transport", "Bus"]).nullable(),
  accommodation: z.enum(["Budget", "3-star", "4-star", "Luxury"]).nullable(),
  mealPlan: z.enum(["No meals", "Breakfast", "Breakfast + dinner"]).nullable(),
});

export const emptyTourismDraft: TourismDraft = {
  destinationQuery: null,
  startDate: null,
  endDate: null,
  durationDays: null,
  travelers: null,
  rooms: null,
  budget: null,
  style: null,
  pace: null,
  travelMode: null,
  accommodation: null,
  mealPlan: null,
};

export const parsedAssistantIntentSchema = z.object({
  action: z.enum(assistantActions),
  draft: voiceSearchDraftSchema,
  tourismDraft: tourismDraftSchema.nullable(),
  tourismBookingReference: z.string().max(40).nullable(),
  resultReference: z
    .object({
      ordinal: z.number().int().min(1).max(20).nullable(),
      journeyId: z.string().max(200).nullable(),
    })
    .nullable(),
  explanationTopic: z
    .enum(["rac", "waitlist", "quota", "tatkal", "class", "cancellation"])
    .nullable(),
  missingFields: z.array(z.string().max(50)).max(8),
  correctionFields: z.array(z.string().max(50)).max(8),
  assistantMessage: z.string().min(1).max(300),
});

export const parseRequestSchema = z.object({
  utterance: z.string().trim().min(1).max(500),
  locale: z.string().trim().min(2).max(20).default("en-IN"),
  timezone: z.string().trim().max(50).default("Asia/Kolkata"),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phase: z.string().trim().max(50),
  pathname: z.string().trim().max(200),
  draft: voiceSearchDraftSchema,
  tourismDraft: tourismDraftSchema,
  displayedResults: z
    .array(
      z.object({
        index: z.number().int().positive(),
        id: z.string().max(200),
        departure: z.string().max(20),
        arrival: z.string().max(20),
        fare: z.number().nonnegative(),
        transfers: z.number().int().nonnegative(),
        status: z.string().max(30),
      }),
    )
    .max(5)
    .default([]),
});

export type VoiceSearchDraft = z.infer<typeof voiceSearchDraftSchema>;
export type TourismDraft = z.infer<typeof tourismDraftSchema>;
export type ParsedAssistantIntent = z.infer<typeof parsedAssistantIntentSchema>;
export type AssistantAction = (typeof assistantActions)[number];

export type ParseResponse =
  | {
      ok: true;
      intent: ParsedAssistantIntent;
      usage?: { inputTokens: number; outputTokens: number };
    }
  | {
      ok: false;
      code:
        | "NOT_CONFIGURED"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "INVALID_REQUEST"
        | "INVALID_OUTPUT"
        | "UPSTREAM_ERROR";
      fallbackAvailable: true;
    };
