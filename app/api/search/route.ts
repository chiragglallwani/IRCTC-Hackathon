import { NextResponse } from "next/server";
import { searchJourneys } from "@/lib/search";
import type { SearchInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    input?: SearchInput;
    previewDates?: string[];
  } | null;
  if (!body?.input)
    return NextResponse.json(
      { error: "Search input is required." },
      { status: 400 },
    );

  const journeys = searchJourneys(body.input);
  const previews = Object.fromEntries(
    (body.previewDates ?? [])
      .slice(0, 7)
      .map((date) => [
        date,
        searchJourneys({ ...body.input!, date })[0]?.totalFare,
      ]),
  );
  return NextResponse.json({ journeys, previews });
}
