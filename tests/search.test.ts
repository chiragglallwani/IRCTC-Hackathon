import { describe, expect, it } from "vitest";
import { quotaEligibility, searchJourneys } from "@/lib/search";

describe("data-driven journey search", () => {
  const input = {
    origin: "station_085_central",
    destination: "station_183_central",
    date: "2026-08-24",
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: "ANY",
    mode: "explore" as const,
  };
  it("finds graph journeys and attaches deterministic recommendations", () => {
    const results = searchJourneys(input);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].legs.length).toBeGreaterThan(0);
    expect(results[0].whyRecommended.length).toBe(4);
    expect(results.some((x) => x.label === "Recommended")).toBe(true);
  });
  it("changes fare when passenger count changes", () => {
    const one = searchJourneys(input)[0];
    const two = searchJourneys({ ...input, adults: 2 })[0];
    expect(two.totalFare).toBe(one.totalFare * 2);
  });
});
describe("quota eligibility", () => {
  it("validates senior and ladies quotas before payment", () => {
    expect(
      quotaEligibility("SS", [
        { age: 62, gender: "female", citizenship: "Indian" },
      ]),
    ).toBe(true);
    expect(
      quotaEligibility("SS", [
        { age: 40, gender: "male", citizenship: "Indian" },
      ]),
    ).toBe(false);
    expect(
      quotaEligibility("LD", [
        { age: 30, gender: "male", citizenship: "Indian" },
      ]),
    ).toBe(false);
  });
});
