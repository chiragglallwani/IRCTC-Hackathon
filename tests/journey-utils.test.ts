import { describe, expect, it } from "vitest";

import { calculateLayoverMinutes, formatDuration } from "@/lib/journey-utils";
import type { JourneyLeg } from "@/lib/types";

function leg(arrival: string, departure: string) {
  return { arrival, departure } as JourneyLeg;
}

describe("layover timing", () => {
  it("calculates a same-day layover from arrival and departure times", () => {
    expect(
      calculateLayoverMinutes(leg("10:20", "08:00"), leg("15:00", "12:05")),
    ).toBe(105);
  });

  it("rolls an overnight connection into the following day", () => {
    expect(
      calculateLayoverMinutes(leg("23:40", "20:00"), leg("06:00", "00:25")),
    ).toBe(45);
  });
});

describe("duration formatting", () => {
  it("uses minutes for durations below one hour", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("uses hours and remaining minutes from one hour", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(135)).toBe("2h 15m");
  });

  it("uses days, hours and remaining minutes from 24 hours", () => {
    expect(formatDuration(1440)).toBe("1d");
    expect(formatDuration(3010)).toBe("2d 2h 10m");
  });
});
