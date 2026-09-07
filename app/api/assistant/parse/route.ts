import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  parseRequestSchema,
  parsedAssistantIntentSchema,
  type ParseResponse,
} from "@/lib/assistant/schema";
import {
  assistantModel,
  getOpenAIClient,
  hasOpenAIKey,
} from "@/lib/assistant/openai-client";
import { parseSpokenDate } from "@/lib/assistant/local-command-parser";
import { dateOffset } from "@/lib/search-navigation";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requestWindows = new Map<string, number[]>();

function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  );
}

function rateLimited(address: string) {
  const now = Date.now();
  const recent = (requestWindows.get(address) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  requestWindows.set(address, recent);
  if (requestWindows.size > 500)
    for (const [key, timestamps] of requestWindows)
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS))
        requestWindows.delete(key);
  return false;
}

const instructions = `You are the intent parser for RailEase, an Indian railway prototype.
Return only the supplied structured schema. Interpret English, Hindi, Hinglish, and the supplied locale.
Preserve draft values unless the user clearly changes them. Use currentDate and timezone for relative dates.
Never invent station IDs, train data, fares, availability, quotas, eligibility, or booking success.
Keep originQuery and destinationQuery as short place/station text copied or normalized from the user.
Use null rather than guessing. Ask for missing origin, destination, or date through action clarify.
For holidays, tours, vacations, itineraries, or tourism packages use plan_tourism and populate tourismDraft. Never put a tourism destination in the train draft.
For requests to open saved holiday packages use view_tourism_bookings. Tourism payment and final booking must remain manual.
For cancellation of a tourism package use cancel_tourism_booking and copy its RTP booking reference into tourismBookingReference. Never claim cancellation succeeded; local code confirms and executes it.
Never request payment credentials, passwords, identity documents, or sensitive passenger data.
Use select_journey only for an explicit reference to a displayed result. Keep assistantMessage under 35 words.
Unrelated requests must use unsupported. Cancellation of the current assistant action uses cancel.`;

export async function GET() {
  return NextResponse.json({ configured: hasOpenAIKey() });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = parseRequestSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json<ParseResponse>(
      { ok: false, code: "INVALID_REQUEST", fallbackAvailable: true },
      { status: 400 },
    );
  if (rateLimited(clientAddress(request)))
    return NextResponse.json<ParseResponse>(
      { ok: false, code: "RATE_LIMITED", fallbackAvailable: true },
      { status: 429 },
    );
  const client = getOpenAIClient();
  if (!client)
    return NextResponse.json<ParseResponse>(
      { ok: false, code: "NOT_CONFIGURED", fallbackAvailable: true },
      { status: 503 },
    );

  try {
    const response = await client.responses.parse({
      model: assistantModel(),
      instructions,
      input: JSON.stringify(parsed.data),
      reasoning: { effort: "none" },
      max_output_tokens: 900,
      store: false,
      text: {
        verbosity: "low",
        format: zodTextFormat(parsedAssistantIntentSchema, "railease_intent"),
      },
    });
    const intent = response.output_parsed;
    if (!intent)
      return NextResponse.json<ParseResponse>(
        { ok: false, code: "INVALID_OUTPUT", fallbackAvailable: true },
        { status: 502 },
      );
    const explicitDate = parseSpokenDate(
      parsed.data.utterance.toLowerCase(),
      new Date(`${parsed.data.currentDate}T12:00:00`),
    );
    if (explicitDate) intent.draft.date = explicitDate;
    else if (/tatkal|तत्काल/i.test(parsed.data.utterance))
      intent.draft.date = dateOffset(parsed.data.currentDate, 1);
    return NextResponse.json<ParseResponse>({
      ok: true,
      intent,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    });
  } catch (error) {
    const code =
      error instanceof OpenAI.APIConnectionTimeoutError
        ? "TIMEOUT"
        : error instanceof OpenAI.RateLimitError
          ? "RATE_LIMITED"
          : "UPSTREAM_ERROR";
    return NextResponse.json<ParseResponse>(
      { ok: false, code, fallbackAvailable: true },
      { status: code === "RATE_LIMITED" ? 429 : 502 },
    );
  }
}
