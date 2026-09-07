import { describe, expect, it } from "vitest";
import { parseLocalCommand } from "@/lib/assistant/local-command-parser";
import { emptyVoiceSearchDraft } from "@/lib/assistant/schema";
import { resolveStation } from "@/lib/assistant/station-resolver";
import { buildSearchUrl, validateSearchInput } from "@/lib/search-navigation";

describe("voice assistant parsing", () => {
  const now = new Date(2026, 8, 5, 10, 0, 0);

  it("extracts a complete cost-aware journey request locally", () => {
    const result = parseLocalCommand(
      "Find the cheapest available train from Ahmedabad to Mumbai tomorrow for two adults in sleeper",
      emptyVoiceSearchDraft,
      now,
    );
    expect(result?.action).toBe("search_trains");
    expect(result?.draft).toMatchObject({
      originQuery: "ahmedabad",
      destinationQuery: "mumbai",
      date: "2026-09-06",
      adults: 2,
      travelClass: "SL",
      sort: "cheapest",
      onlyAvailable: true,
    });
  });

  it("collects missing details instead of guessing", () => {
    const result = parseLocalCommand(
      "from Ahmedabad to Mumbai",
      emptyVoiceSearchDraft,
      now,
    );
    expect(result?.action).toBe("clarify");
    expect(result?.missingFields).toContain("date");
  });

  it("uses tomorrow automatically when Tatkal is requested", () => {
    const complete = parseLocalCommand(
      "Book Tatkal from Ahmedabad to Mumbai for two adults",
      emptyVoiceSearchDraft,
      now,
    );
    expect(complete?.action).toBe("search_trains");
    expect(complete?.draft).toMatchObject({
      date: "2026-09-06",
      mode: "tatkal",
    });

    const followUp = parseLocalCommand(
      "Tatkal",
      {
        ...emptyVoiceSearchDraft,
        originQuery: "Ahmedabad",
        destinationQuery: "Mumbai",
        date: "2026-10-06",
      },
      now,
    );
    expect(followUp?.action).toBe("search_trains");
    expect(followUp?.draft.date).toBe("2026-09-06");
  });

  it("normalizes an explicit spoken calendar date without retaining an older draft date", () => {
    const result = parseLocalCommand(
      "Find trains from Ahmedabad to Mumbai on 6th October 2026",
      { ...emptyVoiceSearchDraft, date: "2026-09-06" },
      now,
    );
    expect(result?.action).toBe("search_trains");
    expect(result?.draft.date).toBe("2026-10-06");
  });

  it("extracts stations and passengers from a long checkout-oriented request", () => {
    const result = parseLocalCommand(
      "I want to do a quick booking from Ahmedabad to Pune and date of journey will be 6 October 2026 for one adult and one child in third AC redirect me to the check out page for the best recommended search option",
      {
        ...emptyVoiceSearchDraft,
        originQuery: "old unresolved text",
        date: "2026-09-06",
      },
      now,
    );
    expect(result?.action).toBe("search_trains");
    expect(result?.draft).toMatchObject({
      originQuery: "ahmedabad",
      destinationQuery: "pune",
      date: "2026-10-06",
      adults: 1,
      children: 1,
      travelClass: "3A",
      mode: "quick",
      sort: "recommended",
    });
  });

  it("supports month-first and Indian numeric spoken date formats", () => {
    expect(
      parseLocalCommand(
        "from Ahmedabad to Mumbai on October 6, 2026",
        emptyVoiceSearchDraft,
        now,
      )?.draft.date,
    ).toBe("2026-10-06");
    expect(
      parseLocalCommand(
        "from Ahmedabad to Mumbai on 06/10/2026",
        emptyVoiceSearchDraft,
        now,
      )?.draft.date,
    ).toBe("2026-10-06");
  });

  it("recognizes safe local result commands", () => {
    expect(parseLocalCommand("select option 2")?.resultReference?.ordinal).toBe(
      2,
    );
    expect(parseLocalCommand("show direct only")?.draft.maxTransfers).toBe(0);
    expect(parseLocalCommand("confirmed seats only")?.draft.onlyAvailable).toBe(
      true,
    );
    expect(parseLocalCommand("evening trains under 1500")?.draft).toMatchObject(
      {
        departurePeriod: "evening",
        maxFare: 1500,
      },
    );
  });

  it("understands a basic Hindi route request", () => {
    const result = parseLocalCommand(
      "अहमदाबाद से मुंबई तक कल दो यात्री स्लीपर",
      emptyVoiceSearchDraft,
      now,
    );
    expect(result?.action).toBe("search_trains");
    expect(result?.draft).toMatchObject({
      originQuery: "अहमदाबाद",
      destinationQuery: "मुंबई",
      adults: 2,
      travelClass: "SL",
    });
  });

  it("resolves station data locally", () => {
    const resolution = resolveStation("ADI");
    expect(resolution.status).toBe("resolved");
    expect(resolution.station?.code).toBe("ADI");
  });
});

describe("shared search navigation", () => {
  const input = {
    origin: "station_085_central",
    destination: "station_183_central",
    date: "2026-09-06",
    adults: 2,
    children: 0,
    infants: 0,
    travelClass: "SL",
    mode: "quick" as const,
  };

  it("builds the existing search-page URL contract", () => {
    const url = buildSearchUrl(input);
    expect(url).toContain("/search?");
    expect(url).toContain("adults=2");
    expect(url).toContain("class=SL");
  });

  it("rejects same-station and past-date searches", () => {
    const now = new Date(2026, 8, 5);
    expect(
      validateSearchInput({ ...input, destination: input.origin }, now),
    ).toBe("SAME_PLACE");
    expect(validateSearchInput({ ...input, date: "2026-09-04" }, now)).toBe(
      "PAST_DATE",
    );
  });
});
