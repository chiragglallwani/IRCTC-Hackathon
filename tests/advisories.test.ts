import { describe, expect, it } from "vitest";
import { journeyAdvisories, quotaAdvisories } from "@/lib/booking-advisories";
import { createCheckoutContext } from "@/lib/checkout-selection";
import type { Journey } from "@/lib/types";

const input = {
  origin: "station_085_central",
  destination: "station_183_junction",
  date: "2026-08-24",
  adults: 2,
  children: 0,
  infants: 0,
  travelClass: "ANY",
  mode: "explore" as const,
};

const station = {
  stationId: "station-a",
  code: "AAA",
  name: "Alpha",
  cityId: "city-a",
  state: "Test",
  type: "junction",
  latitude: 0,
  longitude: 0,
  facilities: [],
  cityStationRank: 1,
};

const journey: Journey = {
  id: "journey-1",
  origin: station,
  destination: { ...station, stationId: "station-b", code: "BBB", name: "Beta" },
  departure: "10:00",
  arrival: "12:00",
  durationMinutes: 120,
  totalFare: 1000,
  transfers: 0,
  modes: ["train"],
  availability: "AVAILABLE",
  score: 90,
  label: "Recommended",
  whyRecommended: [],
  classAvailability: [
    {
      travelClass: "SL",
      fare: 1000,
      status: "AVAILABLE",
      number: 10,
      quotas: [
        { quotaId: "GN", status: "AVAILABLE", number: 10, confirmationLikelihood: 100 },
      ],
    },
  ],
  legs: [
    {
      id: "leg-1",
      mode: "train",
      serviceId: "train-1",
      serviceName: "Test Express",
      serviceNumber: "10001",
      from: station,
      to: { ...station, stationId: "station-b", code: "BBB", name: "Beta" },
      departure: "10:00",
      arrival: "12:00",
      durationMinutes: 120,
      fare: 1000,
      travelClass: "SL",
      availability: null,
      ticketOptions: [
        {
          travelClass: "SL",
          fare: 1000,
          status: "AVAILABLE",
          number: 10,
          quotas: [
            { quotaId: "GN", status: "AVAILABLE", number: 10, confirmationLikelihood: 100 },
          ],
        },
      ],
      facilities: [],
    },
  ],
};

describe("booking advisories", () => {
  it("always explains that quota selection is pending on search results", () => {
    const advisories = journeyAdvisories(journey, input);
    expect(advisories.some((item) => item.code === "QUOTA_PENDING")).toBe(true);
    expect(advisories.some((item) => item.code === "AVAILABLE")).toBe(true);
  });

  it("creates equivalent shared checkout state for assistant selection", () => {
    const context = createCheckoutContext({ journey, input });
    expect(context.journey.id).toBe(journey.id);
    expect(context.quota).toBe("GN");
    expect(context.journey.legs.every((leg) => Boolean(leg.travelClass))).toBe(true);
  });

  it("makes insufficient confirmed seats blocking", () => {
    const constrained: Journey = {
      ...journey,
      classAvailability: [
        { ...journey.classAvailability[0], number: 1 },
      ],
    };
    const advisories = journeyAdvisories(constrained, input);
    expect(advisories.find((item) => item.code === "INSUFFICIENT_SEATS")).toMatchObject({
      blocking: true,
      severity: "danger",
    });
  });

  it("surfaces waitlist risk without inventing confirmation", () => {
    const waitlisted: Journey = {
      ...journey,
      availability: "WAITLIST",
      classAvailability: [
        { ...journey.classAvailability[0], status: "WAITLIST", number: 12 },
      ],
    };
    expect(journeyAdvisories(waitlisted, input).some((item) => item.code === "WAITLIST")).toBe(true);
  });

  it("reports final quota selection after passengers are known", () => {
    const advisories = quotaAdvisories({
      passengers: [
        {
          id: "passenger-1",
          name: "Test Passenger",
          age: 30,
          gender: "male",
          citizenship: "Indian",
          berth: "No preference",
        },
      ],
      mode: input.mode,
      availability: journey.classAvailability[0].quotas,
    });
    expect(
      advisories.some(
        (item) =>
          item.code === "QUOTA_RECOMMENDED" || item.code === "QUOTA_FALLBACK",
      ),
    ).toBe(true);
  });
});
