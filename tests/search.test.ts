import { describe, expect, it } from "vitest";
import {
  DISPLAY_QUOTA_IDS,
  calculateFareBreakdown,
  MEAL_PRICE,
  quotaEligibility,
  selectBestAvailableQuota,
  selectEligibleQuota,
  searchJourneys,
} from "@/lib/search";

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
    expect(results[0].legs.every((leg) => leg.ticketOptions.length > 0)).toBe(
      true,
    );
    expect(
      results[0].legs.every((leg) =>
        leg.ticketOptions.every(
          (ticket) => ticket.quotas.length === DISPLAY_QUOTA_IDS.length,
        ),
      ),
    ).toBe(true);
    expect(results[0].whyRecommended.length).toBe(4);
    expect(results[0].classAvailability.length).toBeGreaterThan(0);
    expect(
      results[0].classAvailability.every(
        (travelClass) => travelClass.quotas.length === DISPLAY_QUOTA_IDS.length,
      ),
    ).toBe(true);
    expect(results.some((x) => x.label === "Recommended")).toBe(true);
  });
  it("adds selected passenger meals to the payable total", () => {
    const withoutMeals = calculateFareBreakdown(1000, "GN");
    const withMeals = calculateFareBreakdown(1000, "GN", MEAL_PRICE * 2);
    expect(withMeals.mealCost).toBe(300);
    expect(withMeals.total).toBe(withoutMeals.total + 300);
  });
  it("changes fare when passenger count changes", () => {
    const one = searchJourneys(input)[0];
    const two = searchJourneys({ ...input, adults: 2 })[0];
    expect(two.totalFare).toBe(one.totalFare * 2);
    expect(two.classAvailability[0].fare).toBe(
      one.classAvailability[0].fare * 2,
    );
  });
  it("reuses an identical computed search result", () => {
    const first = searchJourneys(input);
    const second = searchJourneys({ ...input });
    expect(second).toBe(first);
  });
  it("excludes unsupported quotas from seat comparison", () => {
    expect(DISPLAY_QUOTA_IDS).not.toContain("TQ");
    expect(DISPLAY_QUOTA_IDS).not.toContain("PT");
    expect(DISPLAY_QUOTA_IDS).not.toContain("YU");
    expect(DISPLAY_QUOTA_IDS).not.toContain("PH");
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
  it("does not auto-select removed Tatkal quotas", () => {
    const quota = selectEligibleQuota(
      [
        {
          id: "passenger-1",
          name: "Test Passenger",
          age: 30,
          gender: "male",
          citizenship: "Indian",
          berth: "No preference",
        },
      ],
      "tatkal",
    );
    expect(["TQ", "PT", "YU", "PH"]).not.toContain(quota);
  });
  it("falls back from an unavailable concession quota to confirmed general seats", () => {
    const passenger = {
      id: "passenger-disabled",
      name: "Test Passenger",
      age: 35,
      gender: "female" as const,
      citizenship: "Indian",
      berth: "No preference",
      claimDisability: true,
      disabilityCertificate: "CERT-1",
    };
    const result = selectBestAvailableQuota(
      [passenger],
      "explore",
      [
        {
          quotaId: "HP",
          status: "REGRET",
          number: 0,
          confirmationLikelihood: 0,
        },
        {
          quotaId: "GN",
          status: "AVAILABLE",
          number: 9,
          confirmationLikelihood: 0.96,
        },
      ],
      1,
    );
    expect(result).toEqual({
      quotaId: "GN",
      preferredQuotaId: "HP",
      usedFallback: true,
    });
  });

  it("keeps an eligible concession quota when it can confirm the group", () => {
    const result = selectBestAvailableQuota(
      [
        {
          id: "passenger-senior",
          name: "Senior Passenger",
          age: 65,
          gender: "male",
          citizenship: "Indian",
          berth: "Lower",
        },
      ],
      "explore",
      [
        {
          quotaId: "SS",
          status: "AVAILABLE",
          number: 2,
          confirmationLikelihood: 0.96,
        },
        {
          quotaId: "GN",
          status: "AVAILABLE",
          number: 20,
          confirmationLikelihood: 0.96,
        },
      ],
      1,
    );
    expect(result).toEqual({
      quotaId: "SS",
      preferredQuotaId: "SS",
      usedFallback: false,
    });
  });
});
