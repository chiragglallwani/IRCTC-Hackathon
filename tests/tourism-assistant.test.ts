import { describe, expect, it } from "vitest";
import {
  buildTourismPlannerUrl,
  normalizeTourismBookingReference,
  parseLocalTourismCommand,
  resolveTourismDestination,
} from "@/lib/assistant/tourism-command";
import { emptyTourismDraft } from "@/lib/assistant/schema";

describe("tourism assistant", () => {
  const now = new Date(2026, 8, 7, 10, 0, 0);

  it("extracts a complete natural-language holiday plan", () => {
    const result = parseLocalTourismCommand(
      "Plan a relaxed family trip to Manali from 12 October 2026 to 15 October 2026 for four travelers with two rooms and a budget of 50000 in a 4-star hotel with breakfast and dinner by train",
      emptyTourismDraft,
      now,
    );
    expect(result?.action).toBe("plan_tourism");
    expect(result?.draft).toMatchObject({
      destinationQuery: "manali",
      startDate: "2026-10-12",
      endDate: "2026-10-15",
      travelers: 4,
      rooms: 2,
      budget: 50000,
      style: "Family",
      pace: "Relaxed",
      travelMode: "Train",
      accommodation: "4-star",
      mealPlan: "Breakfast + dinner",
    });
  });

  it("resolves project-owned destinations and builds the planner handoff", () => {
    const destination = resolveTourismDestination("Manali");
    expect(destination).toHaveLength(1);
    const url = buildTourismPlannerUrl(destination[0].destinationId, {
      ...emptyTourismDraft,
      destinationQuery: "Manali",
      startDate: "2026-10-12",
      endDate: "2026-10-15",
      travelers: 2,
    });
    expect(url).toContain("/tourism/plan?");
    expect(url).toContain("destination=destination_010");
    expect(url).toContain("startDate=2026-10-12");
    expect(url).toContain("travelers=2");
  });

  it("opens saved tourism bookings with a local command", () => {
    expect(parseLocalTourismCommand("Show my tourism bookings")?.action).toBe(
      "view_tourism_bookings",
    );
  });

  it("extracts a tourism cancellation reference and requires that action", () => {
    expect(
      normalizeTourismBookingReference("R T P hyphen 1 2 3 4 5 6 7 8"),
    ).toBe("RTP-12345678");
    expect(
      parseLocalTourismCommand(
        "Cancel my tourism package with reference RTP-12345678",
      ),
    ).toMatchObject({
      action: "cancel_tourism_booking",
      bookingReference: "RTP-12345678",
    });
  });
});
