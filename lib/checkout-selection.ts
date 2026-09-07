import type { Journey, SearchInput } from "./types";

export interface CheckoutContext {
  journey: Journey;
  input: SearchInput;
  quota: string;
}

export function createCheckoutContext({
  journey,
  input,
  selectedClass,
  selectedLegClasses = {},
}: {
  journey: Journey;
  input: SearchInput;
  selectedClass?: string | null;
  selectedLegClasses?: Record<string, string>;
}): CheckoutContext {
  const selectedAvailability = journey.classAvailability.find(
    (item) => item.travelClass === selectedClass,
  );
  const checkoutAvailability =
    selectedAvailability ??
    (input.travelClass !== "ANY"
      ? journey.classAvailability.find(
          (item) => item.travelClass === input.travelClass,
        )
      : undefined) ??
    journey.classAvailability.find((item) => item.status !== "REGRET") ??
    journey.classAvailability[0];

  const selectedTickets = journey.legs.map((leg) => {
    const explicit = leg.ticketOptions.find(
      (item) => item.travelClass === selectedLegClasses[leg.id],
    );
    if (explicit) return explicit;
    if (journey.legs.length === 1 && checkoutAvailability) {
      const matching = leg.ticketOptions.find(
        (item) => item.travelClass === checkoutAvailability.travelClass,
      );
      if (matching) return matching;
    }
    return (
      [...leg.ticketOptions]
        .filter((item) => item.status !== "REGRET")
        .sort((a, b) => a.fare - b.fare)[0] ??
      [...leg.ticketOptions].sort((a, b) => a.fare - b.fare)[0]
    );
  });

  const legs = journey.legs.map((leg, index) => {
    const ticket = selectedTickets[index];
    if (!ticket) return leg;
    return {
      ...leg,
      fare: ticket.fare,
      travelClass: ticket.travelClass,
      availability: {
        ...(leg.availability ?? {
          availabilityId: `${leg.id}-${ticket.travelClass}`,
          trainId: leg.serviceId,
          fromStation: leg.from.stationId,
          toStation: leg.to.stationId,
          travelDate: input.date,
          quota: "GN",
          confirmationLikelihood: 0,
          lastUpdated: new Date().toISOString(),
        }),
        class: ticket.travelClass,
        status: ticket.status,
        number: ticket.number,
      },
    };
  });

  const effectiveClass =
    journey.legs.length > 1
      ? legs.map((leg) => leg.travelClass).join(" + ")
      : (checkoutAvailability?.travelClass ?? legs[0]?.travelClass ?? "ANY");
  const totalFare =
    journey.legs.length > 1
      ? selectedTickets.reduce(
          (sum, ticket, index) =>
            sum + (ticket?.fare ?? journey.legs[index].fare),
          0,
        )
      : (checkoutAvailability?.fare ?? legs[0]?.fare ?? journey.totalFare);
  const status =
    selectedTickets.find((item) => item?.status === "REGRET")?.status ??
    selectedTickets.find((item) => item?.status === "WAITLIST")?.status ??
    selectedTickets.find((item) => item?.status === "RAC")?.status ??
    checkoutAvailability?.status ??
    "AVAILABLE";

  return {
    journey: { ...journey, totalFare, availability: status, legs },
    input: { ...input, travelClass: effectiveClass },
    quota: "GN",
  };
}
