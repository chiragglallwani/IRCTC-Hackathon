import { describe, expect, it } from "vitest";
import {
  reservationStatusForPassenger,
  selectedLegAvailability,
} from "@/lib/journey-utils";
import type { Journey, JourneyLeg } from "@/lib/types";

function leg(
  id: string,
  status: "AVAILABLE" | "RAC" | "WAITLIST",
  number: number,
) {
  return {
    id,
    travelClass: "2A",
    ticketOptions: [
      {
        travelClass: "2A",
        fare: 500,
        status,
        number,
        quotas: [
          {
            quotaId: "GN",
            status,
            number,
            confirmationLikelihood: status === "AVAILABLE" ? 0.96 : 0.6,
          },
        ],
      },
    ],
  } as JourneyLeg;
}

describe("printable ticket reservation statuses", () => {
  it("uses the selected class and quota for each leg", () => {
    const journeyLeg = leg("leg-1", "AVAILABLE", 12);
    expect(selectedLegAvailability(journeyLeg, "GN")).toMatchObject({
      status: "AVAILABLE",
      number: 12,
    });
  });

  it("uses the limiting leg and assigns passenger queue positions", () => {
    const journey = {
      legs: [leg("leg-1", "AVAILABLE", 12), leg("leg-2", "RAC", 7)],
    } as Journey;

    expect(reservationStatusForPassenger(journey, "GN", 0)).toEqual({
      status: "RAC",
      position: 7,
    });
    expect(reservationStatusForPassenger(journey, "GN", 1)).toEqual({
      status: "RAC",
      position: 8,
    });
  });
});
