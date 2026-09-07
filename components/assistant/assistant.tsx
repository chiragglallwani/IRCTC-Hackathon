"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  Send,
  TrainFront,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";
import { useAssistantContext } from "./assistant-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import {
  emptyTourismDraft,
  emptyVoiceSearchDraft,
  type ParsedAssistantIntent,
  type ParseResponse,
  type TourismDraft,
  type VoiceSearchDraft,
} from "@/lib/assistant/schema";
import {
  isAffirmative,
  isNegative,
  parseLocalCommand,
  parseSpokenDate,
} from "@/lib/assistant/local-command-parser";
import {
  normalizePnr,
  parsePnrCommand,
  type PnrAction,
} from "@/lib/assistant/pnr-command";
import {
  buildTourismPlannerUrl,
  normalizeTourismBookingReference,
  parseLocalTourismCommand,
  resolveTourismDestination,
} from "@/lib/assistant/tourism-command";
import { resolveStation } from "@/lib/assistant/station-resolver";
import {
  buildSearchUrl,
  todayDate,
  tomorrowDate,
  validateSearchInput,
} from "@/lib/search-navigation";
import type {
  Booking,
  Journey,
  Itinerary,
  SearchInput,
  Station,
  TourismDestination,
} from "@/lib/types";
import { createCheckoutContext, type CheckoutContext } from "@/lib/checkout-selection";
import { journeyAdvisories } from "@/lib/booking-advisories";
import {
  savedBookings,
  savedItineraries,
  saveStorage,
  storageKeys,
} from "@/lib/storage";

type Phase =
  | "welcome"
  | "collecting_details"
  | "confirming_search"
  | "searching"
  | "showing_results"
  | "confirming_journey"
  | "confirming_pnr_cancellation"
  | "confirming_tourism_cancellation"
  | "authenticating"
  | "error";

interface Message {
  id: number;
  role: "assistant" | "user";
  text: string;
  warning?: boolean;
}

type AwaitingField = "originQuery" | "destinationQuery" | "date" | null;
type AwaitingTourismField = "destinationQuery" | "startDate" | "endDate" | null;

const initialMessage =
  "Ask me to search for a train, plan a holiday, check a PNR, or cancel a booking. For example: Plan a relaxed four-day trip to Manali from 12 October 2026.";

const explanations: Record<string, string> = {
  rac: "RAC means Reservation Against Cancellation. You may travel, but a full berth is not guaranteed until the reservation is confirmed.",
  waitlist: "A waitlisted ticket is not confirmed. Its position can change before chart preparation, so review alternatives with confirmed seats.",
  quota: "RailEase first shows General quota as a baseline, then chooses the best eligible available quota after passenger criteria are verified.",
  tatkal: "Tatkal is a short-notice booking mode. In this prototype it is restricted to tomorrow's journey date.",
  class: "Classes differ in seating, berths, comfort, and fare. Availability is checked separately for every class and quota.",
  cancellation: "Cancellation conditions depend on timing and booking status. A failed payment never creates a confirmed RailEase booking.",
};

function passengerCount(input: SearchInput) {
  return Math.max(1, input.adults + input.children);
}

function resultSummary(journey: Journey, index: number) {
  const service = journey.legs.map((leg) => leg.serviceName).join(" plus ");
  return `${index + 1}. ${service}, ${journey.departure} to ${journey.arrival}, ${journey.transfers ? `${journey.transfers} transfer${journey.transfers === 1 ? "" : "s"}` : "direct"}, ${journey.availability}, ₹${journey.totalFare}.`;
}

function paidBookingTotal(booking: Booking) {
  return booking.fareBreakdown?.total ?? booking.fare;
}

function pnrStatusSummary(booking: Booking, locale: string) {
  const date = new Date(`${booking.date}T00:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const reservationCounts = booking.passengers.reduce<Record<string, number>>(
    (counts, passenger) => {
      const status =
        passenger.reservationStatus?.status ??
        (booking.journey.availability === "AVAILABLE"
          ? "CONFIRMED"
          : booking.journey.availability);
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const reservations = Object.entries(reservationCounts)
    .map(([status, count]) => `${count} ${status.toLowerCase()}`)
    .join(", ");
  const bookingStatus =
    booking.bookingStatus === "upcoming"
      ? "upcoming and active"
      : booking.bookingStatus;
  return `PNR ${booking.pnr} is ${bookingStatus}. ${booking.journey.origin.name} to ${booking.journey.destination.name} on ${date}, ${booking.passengers.length} passenger${booking.passengers.length === 1 ? "" : "s"}, class ${booking.travelClass}, ${booking.quota} quota. Reservation status: ${reservations || booking.journey.availability.toLowerCase()}. Payment is ${booking.paymentStatus}.`;
}

export function AIAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, user, setAuthOpen, t } = useApp();
  const { searchPage } = useAssistantContext();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<VoiceSearchDraft>(emptyVoiceSearchDraft);
  const [tourismDraft, setTourismDraft] =
    useState<TourismDraft>(emptyTourismDraft);
  const [pendingSearch, setPendingSearch] = useState<SearchInput | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<CheckoutContext | null>(null);
  const [pendingPnrCancellation, setPendingPnrCancellation] =
    useState<Booking | null>(null);
  const [pendingTourismCancellation, setPendingTourismCancellation] =
    useState<Itinerary | null>(null);
  const [awaitingTourismCancellationReference, setAwaitingTourismCancellationReference] =
    useState(false);
  const [awaitingPnrAction, setAwaitingPnrAction] =
    useState<PnrAction | null>(null);
  const [awaitingField, setAwaitingField] = useState<AwaitingField>(null);
  const [stationChoices, setStationChoices] = useState<Station[]>([]);
  const [tourismChoices, setTourismChoices] = useState<TourismDestination[]>([]);
  const [awaitingTourismField, setAwaitingTourismField] =
    useState<AwaitingTourismField>(null);
  const [parsing, setParsing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: initialMessage,
    },
  ]);
  const messageId = useRef(2);
  const announcedResults = useRef("");
  const autoSearchAfterClarification = useRef(false);
  const checkoutRequested = useRef(false);
  const autoCheckoutInput = useRef<SearchInput | null>(null);
  const observedAutoCheckoutLoading = useRef(false);
  const parseAbortRef = useRef<AbortController | null>(null);
  const conversationActive = useRef(false);
  const {
    speaking,
    error: speechOutputError,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis(locale);

  const addMessage = (role: Message["role"], text: string, warning = false) => {
    setMessages((current) => [
      ...current.slice(-11),
      { id: messageId.current++, role, text, warning },
    ]);
  };

  const clearConversation = (preserveSearchAutomation = false) => {
    parseAbortRef.current?.abort();
    parseAbortRef.current = null;
    setPhase("welcome");
    setQuery("");
    setDraft(emptyVoiceSearchDraft);
    setTourismDraft(emptyTourismDraft);
    setPendingSearch(null);
    setPendingCheckout(null);
    setPendingPnrCancellation(null);
    setPendingTourismCancellation(null);
    setAwaitingTourismCancellationReference(false);
    setAwaitingField(null);
    setAwaitingPnrAction(null);
    setStationChoices([]);
    setTourismChoices([]);
    setAwaitingTourismField(null);
    setParsing(false);
    setMessages([{ id: 1, role: "assistant", text: initialMessage }]);
    messageId.current = 2;
    announcedResults.current = "";
    autoSearchAfterClarification.current = false;
    checkoutRequested.current = false;
    conversationActive.current = false;
    if (!preserveSearchAutomation) {
      autoCheckoutInput.current = null;
      observedAutoCheckoutLoading.current = false;
    }
  };

  const handlePnrRequest = (action: PnrAction, pnr: string | null) => {
    if (!pnr) {
      setAwaitingPnrAction(action);
      setPhase("collecting_details");
      addMessage(
        "assistant",
        `Please provide the 10-digit PNR for the booking you want to ${action === "cancel" ? "cancel" : "check"}.`,
      );
      return;
    }
    setAwaitingPnrAction(null);
    const booking = savedBookings().find(
      (item) => normalizePnr(item.pnr) === pnr,
    );
    if (!booking) {
      setPhase("error");
      addMessage(
        "assistant",
        `I could not find a RailEase booking for PNR ${pnr}. Check the number and try again.`,
        true,
      );
      return;
    }
    if (action === "status") {
      setPhase("welcome");
      const summary = pnrStatusSummary(booking, locale);
      addMessage("assistant", summary, booking.bookingStatus === "cancelled");
      speak(summary);
      return;
    }
    if (booking.bookingStatus === "cancelled") {
      setPhase("welcome");
      addMessage(
        "assistant",
        `PNR ${booking.pnr} is already cancelled. Its recorded refund is ₹${(booking.refundAmount ?? 0).toLocaleString(locale)}.`,
        true,
      );
      return;
    }
    if (booking.bookingStatus !== "upcoming") {
      setPhase("welcome");
      addMessage(
        "assistant",
        `PNR ${booking.pnr} cannot be cancelled because the journey is already completed.`,
        true,
      );
      return;
    }
    const refund = Math.round(paidBookingTotal(booking) * 0.85);
    setPendingPnrCancellation(booking);
    setPhase("confirming_pnr_cancellation");
    addMessage(
      "assistant",
      `Cancel PNR ${booking.pnr} for ${booking.journey.origin.name} to ${booking.journey.destination.name}? The estimated refund is ₹${refund.toLocaleString(locale)}. This action requires your confirmation.`,
      true,
    );
  };

  const handleTourismCancellation = (reference: string | null) => {
    if (!reference) {
      setAwaitingTourismCancellationReference(true);
      setPhase("collecting_details");
      addMessage(
        "assistant",
        "Please provide the tourism booking reference in the format RTP-12345678.",
      );
      return;
    }
    setAwaitingTourismCancellationReference(false);
    const itinerary = savedItineraries().find(
      (item) =>
        item.confirmed &&
        item.bookingReference?.toUpperCase() === reference.toUpperCase(),
    );
    if (!itinerary) {
      setPhase("error");
      addMessage(
        "assistant",
        `I could not find a confirmed tourism booking for reference ${reference}. Check the reference and try again.`,
        true,
      );
      return;
    }
    if (itinerary.bookingStatus === "cancelled") {
      setPhase("welcome");
      addMessage(
        "assistant",
        `Tourism booking ${reference} is already cancelled.`,
        true,
      );
      return;
    }
    setPendingTourismCancellation(itinerary);
    setPhase("confirming_tourism_cancellation");
    addMessage(
      "assistant",
      `Cancel tourism booking ${reference} for ${itinerary.destination.title}, from ${itinerary.startDate} to ${itinerary.endDate}? This action requires your confirmation.`,
      true,
    );
  };

  const prepareTourism = (requested: TourismDraft) => {
    setTourismDraft(requested);
    if (!requested.destinationQuery) {
      setAwaitingTourismField("destinationQuery");
      addMessage("assistant", "Which destination would you like to visit?");
      return;
    }
    const destinations = resolveTourismDestination(requested.destinationQuery);
    if (destinations.length !== 1) {
      setTourismChoices(destinations.slice(0, 5));
      setAwaitingTourismField("destinationQuery");
      addMessage(
        "assistant",
        destinations.length
          ? `I found more than one match for ${requested.destinationQuery}. Please choose a destination.`
          : `I could not find a tourism destination named “${requested.destinationQuery}”. Try a city such as Manali, Udaipur, Tirupati, or Munnar.`,
        true,
      );
      return;
    }
    if (!requested.startDate) {
      setAwaitingTourismField("startDate");
      addMessage("assistant", "What date should the holiday start?");
      return;
    }
    if (!requested.endDate) {
      setAwaitingTourismField("endDate");
      addMessage("assistant", "What date should the holiday end?");
      return;
    }
    if (requested.startDate < todayDate() || requested.endDate < requested.startDate) {
      setAwaitingTourismField("startDate");
      addMessage(
        "assistant",
        "The tourism dates must be in the future and the end date must be on or after the start date. Please provide new dates.",
        true,
      );
      return;
    }
    setAwaitingTourismField(null);
    setTourismChoices([]);
    setOpen(false);
    stopSpeaking();
    router.push(buildTourismPlannerUrl(destinations[0].destinationId, requested));
    clearConversation(true);
  };

  const chooseTourismDestination = (destination: TourismDestination) => {
    setTourismChoices([]);
    prepareTourism({ ...tourismDraft, destinationQuery: destination.destinationId });
  };

  const initiateSearch = (input: SearchInput) => {
    autoSearchAfterClarification.current = false;
    if (checkoutRequested.current) {
      autoCheckoutInput.current = input;
      observedAutoCheckoutLoading.current = false;
    }
    setPhase("searching");
    addMessage(
      "assistant",
      "Generating train results and checking availability, quotas, and journey warnings…",
    );
    setOpen(false);
    stopSpeaking();
    router.push(buildSearchUrl(input));
    clearConversation(true);
  };

  const prepareSearch = (next: VoiceSearchDraft, autoSearch = false) => {
    const shouldAutoSearch =
      autoSearch ||
      autoSearchAfterClarification.current ||
      checkoutRequested.current;
    setDraft(next);
    if (!next.originQuery) {
      autoSearchAfterClarification.current = shouldAutoSearch;
      setAwaitingField("originQuery");
      setPhase("collecting_details");
      addMessage("assistant", "Where are you travelling from?");
      return;
    }
    if (!next.destinationQuery) {
      autoSearchAfterClarification.current = shouldAutoSearch;
      setAwaitingField("destinationQuery");
      setPhase("collecting_details");
      addMessage("assistant", "Where would you like to go?");
      return;
    }
    if (!next.date) {
      if (next.mode === "tatkal") {
        prepareSearch({ ...next, date: tomorrowDate() }, autoSearch);
        return;
      }
      autoSearchAfterClarification.current = shouldAutoSearch;
      setAwaitingField("date");
      setPhase("collecting_details");
      addMessage("assistant", "What date would you like to travel?");
      return;
    }
    const origin = resolveStation(next.originQuery);
    if (origin.status !== "resolved" || !origin.station) {
      autoSearchAfterClarification.current = shouldAutoSearch;
      setAwaitingField("originQuery");
      setStationChoices(origin.candidates);
      setPhase("collecting_details");
      addMessage(
        "assistant",
        origin.status === "not_found"
          ? `I could not find “${next.originQuery}”. Please enter a city, station, or station code.`
          : `Which departure station did you mean by “${next.originQuery}”?`,
        true,
      );
      return;
    }
    const destination = resolveStation(next.destinationQuery);
    if (destination.status !== "resolved" || !destination.station) {
      autoSearchAfterClarification.current = shouldAutoSearch;
      setAwaitingField("destinationQuery");
      setStationChoices(destination.candidates);
      setPhase("collecting_details");
      addMessage(
        "assistant",
        destination.status === "not_found"
          ? `I could not find “${next.destinationQuery}”. Please enter a city, station, or station code.`
          : `Which destination station did you mean by “${next.destinationQuery}”?`,
        true,
      );
      return;
    }
    const input: SearchInput = {
      origin: origin.station.stationId,
      destination: destination.station.stationId,
      date: next.date,
      adults: next.adults ?? 1,
      children: next.children ?? 0,
      infants: next.infants ?? 0,
      travelClass: next.travelClass ?? "ANY",
      mode: next.mode ?? "quick",
    };
    const validation = validateSearchInput(input);
    if (validation) {
      autoSearchAfterClarification.current = shouldAutoSearch;
      setPhase("collecting_details");
      if (validation === "PAST_DATE") setAwaitingField("date");
      addMessage(
        "assistant",
        validation === "SAME_PLACE"
          ? "Origin and destination must be different. Please change one station."
          : validation === "TATKAL_DATE"
            ? "Tatkal searches in this prototype are available only for tomorrow. Please change the date or booking mode."
            : validation === "PAST_DATE"
              ? "That date is in the past. What future date would you like?"
              : "Please check the passenger counts and journey details.",
        true,
      );
      return;
    }
    setAwaitingField(null);
    setStationChoices([]);
    setPendingSearch(input);
    autoSearchAfterClarification.current = false;
    if (shouldAutoSearch) {
      initiateSearch(input);
      return;
    }
    setPhase("confirming_search");
    addMessage(
      "assistant",
      `Search ${origin.station.name} to ${destination.station.name} on ${new Date(`${input.date}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" })} for ${passengerCount(input)} passenger${passengerCount(input) === 1 ? "" : "s"} in ${input.travelClass === "ANY" ? "any class" : input.travelClass}?`,
    );
  };

  const chooseStation = (station: Station) => {
    if (!awaitingField || awaitingField === "date") return;
    const next = { ...draft, [awaitingField]: station.code };
    setStationChoices([]);
    prepareSearch(next, autoSearchAfterClarification.current);
  };

  const applyIntent = (intent: ParsedAssistantIntent, autoSearch = false) => {
    const next = { ...draft, ...intent.draft };
    if (intent.action === "cancel_tourism_booking") {
      handleTourismCancellation(
        intent.tourismBookingReference
          ? normalizeTourismBookingReference(intent.tourismBookingReference)
          : null,
      );
      return;
    }
    if (intent.action === "plan_tourism") {
      if (!intent.tourismDraft) {
        addMessage("assistant", "Tell me the destination and travel dates for your holiday.", true);
        return;
      }
      prepareTourism({ ...tourismDraft, ...intent.tourismDraft });
      return;
    }
    if (intent.action === "view_tourism_bookings") {
      setOpen(false);
      stopSpeaking();
      router.push("/tourism/bookings");
      clearConversation(true);
      return;
    }
    if (intent.action === "cancel") {
      setDraft(emptyVoiceSearchDraft);
      setTourismDraft(emptyTourismDraft);
      setPendingSearch(null);
      setPendingCheckout(null);
      setPendingPnrCancellation(null);
      setPendingTourismCancellation(null);
      setAwaitingTourismCancellationReference(false);
      setAwaitingField(null);
      setAwaitingPnrAction(null);
      setStationChoices([]);
      setTourismChoices([]);
      setAwaitingTourismField(null);
      autoSearchAfterClarification.current = false;
      checkoutRequested.current = false;
      autoCheckoutInput.current = null;
      setPhase("welcome");
      addMessage("assistant", "I cleared the current request. Where would you like to travel?");
      return;
    }
    if (intent.action === "explain_term") {
      addMessage(
        "assistant",
        explanations[intent.explanationTopic ?? ""] ?? intent.assistantMessage,
      );
      return;
    }
    if (intent.action === "filter_results") {
      if (!searchPage) {
        addMessage("assistant", "Search for a journey first, then I can filter the displayed results.", true);
        return;
      }
      if (next.sort) searchPage.setSort(next.sort);
      if (next.onlyAvailable !== null)
        searchPage.setOnlyAvailable(next.onlyAvailable);
      if (next.maxTransfers !== null)
        searchPage.setMaxTransfers(next.maxTransfers);
      if (next.maxFare !== null) searchPage.setMaxFare(next.maxFare);
      if (next.departurePeriod !== null)
        searchPage.setDeparturePeriod(next.departurePeriod);
      setDraft(next);
      addMessage("assistant", intent.assistantMessage);
      return;
    }
    if (intent.action === "describe_results") {
      if (!searchPage?.journeys.length) {
        addMessage("assistant", "There are no displayed journeys to describe yet.", true);
        return;
      }
      const text = searchPage.journeys
        .slice(0, 3)
        .map(resultSummary)
        .join(" ");
      addMessage("assistant", text);
      speak(text);
      return;
    }
    if (intent.action === "select_journey") {
      const ordinal = intent.resultReference?.ordinal;
      const selectedIndex = ordinal ? ordinal - 1 : -1;
      const journey = selectedIndex >= 0 ? searchPage?.journeys[selectedIndex] : undefined;
      if (!journey || !searchPage) {
        addMessage("assistant", "That option is not currently displayed. Choose a visible journey number.", true);
        return;
      }
      const checkout = createCheckoutContext({
        journey,
        input: searchPage.input,
      });
      setPendingCheckout(checkout);
      setPhase("confirming_journey");
      const warnings = journeyAdvisories(journey, searchPage.input)
        .filter((item) => item.spokenPriority > 0)
        .map((item) => `${item.title}: ${item.message}`)
        .join(" ");
      addMessage(
        "assistant",
        `${resultSummary(journey, selectedIndex)} ${warnings} Continue to booking?`,
        journey.availability !== "AVAILABLE",
      );
      return;
    }
    if (intent.action === "search_trains" || intent.action === "modify_search" || intent.action === "clarify") {
      prepareSearch(next, autoSearch);
      return;
    }
    addMessage("assistant", intent.assistantMessage || "I can help search, filter, and select RailEase journeys.");
  };

  async function submitUtterance(value = query, fromVoice = false) {
    const utterance = value.trim().slice(0, 500);
    if (!utterance || parsing) return;
    setQuery("");
    addMessage("user", utterance);
    if (
      phase === "confirming_tourism_cancellation" &&
      pendingTourismCancellation
    ) {
      if (isAffirmative(utterance)) {
        const updated = savedItineraries().map((item) =>
          item.id === pendingTourismCancellation.id
            ? { ...item, bookingStatus: "cancelled" as const }
            : item,
        );
        saveStorage(storageKeys.itineraries, updated);
        stopSpeaking();
        setOpen(false);
        clearConversation();
        window.setTimeout(() => window.location.reload(), 150);
        return;
      }
      if (isNegative(utterance)) {
        addMessage(
          "assistant",
          `Cancellation stopped. Tourism booking ${pendingTourismCancellation.bookingReference} remains confirmed.`,
        );
        setPendingTourismCancellation(null);
        setPhase("welcome");
        return;
      }
      addMessage(
        "assistant",
        "Please say yes to cancel the tourism booking or no to keep it.",
        true,
      );
      return;
    }
    if (phase === "confirming_pnr_cancellation" && pendingPnrCancellation) {
      if (isAffirmative(utterance)) {
        const refund = Math.round(
          paidBookingTotal(pendingPnrCancellation) * 0.85,
        );
        const cancellationTime = new Date().toISOString();
        const updated = savedBookings().map((booking) =>
          booking.bookingId === pendingPnrCancellation.bookingId
            ? {
                ...booking,
                bookingStatus: "cancelled" as const,
                cancelledAt: cancellationTime,
                paymentStatus: "refunded" as const,
                refundAmount: refund,
              }
            : booking,
        );
        saveStorage(storageKeys.bookings, updated);
        stopSpeaking();
        setOpen(false);
        clearConversation();
        window.setTimeout(() => window.location.reload(), 150);
        return;
      }
      if (isNegative(utterance)) {
        addMessage(
          "assistant",
          `Cancellation stopped. PNR ${pendingPnrCancellation.pnr} remains active.`,
        );
        setPendingPnrCancellation(null);
        setPhase("welcome");
        return;
      }
      addMessage(
        "assistant",
        "Please say yes to cancel the booking or no to keep it.",
        true,
      );
      return;
    }
    const pnrCommand = parsePnrCommand(utterance);
    if (pnrCommand) {
      handlePnrRequest(pnrCommand.action, pnrCommand.pnr);
      return;
    }
    if (awaitingPnrAction) {
      const pnr = normalizePnr(utterance);
      if (!pnr) {
        addMessage(
          "assistant",
          "That does not look like a 10-digit PNR. Please check it and try again.",
          true,
        );
        return;
      }
      handlePnrRequest(awaitingPnrAction, pnr);
      return;
    }
    if (awaitingTourismCancellationReference) {
      const reference = normalizeTourismBookingReference(utterance);
      if (!reference) {
        addMessage(
          "assistant",
          "That reference is not valid. Please use the format RTP-12345678.",
          true,
        );
        return;
      }
      handleTourismCancellation(reference);
      return;
    }
    if (awaitingTourismField) {
      if (awaitingTourismField === "destinationQuery") {
        prepareTourism({ ...tourismDraft, destinationQuery: utterance });
        return;
      }
      const date = parseSpokenDate(utterance.toLowerCase());
      if (!date) {
        addMessage(
          "assistant",
          "Please say a date such as 12 October 2026.",
          true,
        );
        return;
      }
      prepareTourism({ ...tourismDraft, [awaitingTourismField]: date });
      return;
    }
    const localTourism = parseLocalTourismCommand(utterance, tourismDraft);
    if (localTourism?.action === "view_tourism_bookings") {
      setOpen(false);
      stopSpeaking();
      router.push("/tourism/bookings");
      clearConversation(true);
      return;
    }
    if (localTourism?.action === "cancel_tourism_booking") {
      handleTourismCancellation(localTourism.bookingReference);
      return;
    }
    if (localTourism?.action === "plan_tourism") {
      prepareTourism(localTourism.draft);
      return;
    }
    if (/\bcheck\s*out\b/i.test(utterance)) checkoutRequested.current = true;
    if (phase === "confirming_search" && pendingSearch) {
      if (isAffirmative(utterance)) {
        initiateSearch(pendingSearch);
        return;
      }
      if (isNegative(utterance)) {
        setPendingSearch(null);
        setPhase("collecting_details");
        addMessage("assistant", "Okay. Tell me what you would like to change.");
        return;
      }
    }
    if (phase === "confirming_journey" && pendingCheckout) {
      if (isAffirmative(utterance)) {
        saveStorage(storageKeys.checkout, pendingCheckout);
        if (!user) {
          setPhase("authenticating");
          setAuthOpen(true);
          addMessage("assistant", "Please sign in. Your selected journey has been preserved.");
        } else router.push("/checkout");
        return;
      }
      if (isNegative(utterance)) {
        setPendingCheckout(null);
        setPhase("showing_results");
        addMessage("assistant", "Selection cancelled. Choose another displayed journey.");
        return;
      }
    }
    const local = parseLocalCommand(utterance, draft);
    if (local) {
      applyIntent(local, fromVoice);
      return;
    }
    if (awaitingField) {
      if (awaitingField === "date") {
        addMessage("assistant", "Please say a date such as 6 October 2026.", true);
        return;
      } else {
        prepareSearch({ ...draft, [awaitingField]: utterance }, fromVoice);
        return;
      }
    }
    setParsing(true);
    const controller = new AbortController();
    parseAbortRef.current?.abort();
    parseAbortRef.current = controller;
    try {
      const response = await fetch("/api/assistant/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utterance,
          locale,
          timezone: "Asia/Kolkata",
          currentDate: todayDate(),
          phase,
          pathname,
          draft,
          tourismDraft,
          displayedResults: (searchPage?.journeys ?? []).slice(0, 5).map((journey, index) => ({
            index: index + 1,
            id: journey.id,
            departure: journey.departure,
            arrival: journey.arrival,
            fare: journey.totalFare,
            transfers: journey.transfers,
            status: journey.availability,
          })),
        }),
        signal: controller.signal,
      });
      const result = (await response.json()) as ParseResponse;
      if (result.ok) applyIntent(result.intent, fromVoice);
      else
        addMessage(
          "assistant",
          result.code === "NOT_CONFIGURED"
            ? "Natural-language AI is not configured yet. Try: ‘From Ahmedabad to Mumbai tomorrow in sleeper.’"
            : "I could not interpret that safely. Please provide origin, destination, and date in a short sentence.",
          true,
        );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      addMessage("assistant", "The assistant service is unavailable. The regular search form still works.", true);
    } finally {
      if (parseAbortRef.current === controller) parseAbortRef.current = null;
      setParsing(false);
    }
  }

  const speech = useSpeechRecognition({
    locale,
    onFinal: (value) => void submitUtterance(value, true),
  });
  const stopListening = speech.stop;

  useEffect(() => {
    if (phase === "authenticating" && user && pendingCheckout) {
      saveStorage(storageKeys.checkout, pendingCheckout);
      router.push("/checkout");
    }
  }, [phase, user, pendingCheckout, router]);

  useEffect(() => {
    if (!searchPage || searchPage.loading) return;
    const expectedCheckout = autoCheckoutInput.current;
    const matchesCheckoutSearch = Boolean(
      expectedCheckout &&
      searchPage.input.origin === expectedCheckout.origin &&
      searchPage.input.destination === expectedCheckout.destination &&
      searchPage.input.date === expectedCheckout.date,
    );
    if (expectedCheckout && matchesCheckoutSearch) {
      if (!observedAutoCheckoutLoading.current) return;
      autoCheckoutInput.current = null;
      checkoutRequested.current = false;
      observedAutoCheckoutLoading.current = false;
      const recommended = searchPage.journeys[0];
      if (!recommended) {
        setPhase("error");
        conversationActive.current = true;
        setOpen(true);
        addMessage(
          "assistant",
          "I could not find a journey to continue with. Please change the date, class, or route.",
          true,
        );
        return;
      }
      const checkout = createCheckoutContext({
        journey: recommended,
        input: searchPage.input,
      });
      setPendingCheckout(checkout);
      saveStorage(storageKeys.checkout, checkout);
      if (!user) {
        setPhase("authenticating");
        setAuthOpen(true);
      } else {
        router.push("/checkout");
      }
      return;
    }
    if (!conversationActive.current) return;
    const key = `${searchPage.input.origin}:${searchPage.input.destination}:${searchPage.input.date}:${searchPage.journeys.length}`;
    if (announcedResults.current === key) return;
    announcedResults.current = key;
    setPhase("showing_results");
    addMessage(
      "assistant",
      searchPage.journeys.length
        ? `I found ${searchPage.journeys.length} displayed journey options. You can say “read the results,” “cheapest first,” “confirmed only,” or “select option one.”`
        : "No journeys match the current filters. Try another date, class, or remove a filter.",
      !searchPage.journeys.length,
    );
  }, [router, searchPage, setAuthOpen, user]);

  useEffect(() => {
    const expectedCheckout = autoCheckoutInput.current;
    if (
      expectedCheckout &&
      searchPage?.loading &&
      searchPage.input.origin === expectedCheckout.origin &&
      searchPage.input.destination === expectedCheckout.destination &&
      searchPage.input.date === expectedCheckout.date
    )
      observedAutoCheckoutLoading.current = true;
  }, [searchPage]);

  useEffect(() => {
    if (pathname.startsWith("/checkout/payment")) {
      stopListening();
      stopSpeaking();
    }
  }, [pathname, stopListening, stopSpeaking]);

  const visibleChoices = useMemo(() => stationChoices.slice(0, 5), [stationChoices]);

  const closeAssistant = () => {
    speech.cancel();
    stopSpeaking();
    clearConversation();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          conversationActive.current = true;
          setOpen(true);
        } else closeAssistant();
      }}
    >
      <div className="group fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] end-3 z-[60] sm:end-4 lg:bottom-7 lg:end-7">
        <span
          role="tooltip"
          className="pointer-events-none absolute end-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#153f3a] px-3 py-2 text-sm font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:block"
        >
          I am Disha, your AI assistant
        </span>
        <button
          type="button"
          className="relative grid h-16 w-16 overflow-hidden rounded-full border-[3px] border-white bg-[#e9f8f5] shadow-[0_8px_28px_#0003] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7cb7ad] lg:h-[72px] lg:w-[72px] lg:border-4"
          aria-label="Open Disha, your AI assistant"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            conversationActive.current = true;
            setOpen(true);
          }}
        >
          <Image
            src="/images/disha-ai-assistant.png"
            alt=""
            fill
            sizes="72px"
            className="pointer-events-none object-cover object-top"
            priority
          />
        </button>
      </div>
      <DialogContent
        className="flex h-[min(680px,calc(100dvh-24px))] w-[min(560px,calc(100vw-24px))] flex-col gap-0 overflow-hidden rounded-2xl p-0"
        showClose={false}
        aria-label={t("components.assistant.label")}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 font-extrabold text-[var(--primary-dark)]">
          <DialogTitle className="flex items-center gap-3 text-base font-extrabold">
            <span className="relative size-10 overflow-hidden rounded-full border-2 border-white bg-[#e9f8f5] shadow-sm">
              <Image src="/images/disha-ai-assistant.png" alt="" fill sizes="40px" className="object-cover object-top" />
            </span>
            Disha · AI travel assistant
          </DialogTitle>
          <button className="grid size-9 place-items-center rounded-full hover:bg-[#eef1f5]" onClick={closeAssistant}>
            <X /><span className="sr-only">{t("common.actions.close")}</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8faff] p-4" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ms-auto bg-[var(--primary)] text-white" : message.warning ? "border border-[#e8a23a] bg-[#fff7e6] text-[#5f4100]" : "border border-[var(--line)] bg-white"}`}
            >
              {message.warning && <AlertTriangle className="me-1 inline size-4" />}
              {message.text}
            </div>
          ))}
          {parsing && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 className="size-4 animate-spin" /> Understanding your request…</div>
          )}
          {phase === "searching" && !parsing && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Loader2 className="size-4 animate-spin" /> Generating results and checking availability…</div>
          )}
          {speech.listening && (
            <div className="rounded-xl border border-[#7cb7ad] bg-[#e9f8f5] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <strong>Listening — pauses are okay.</strong>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-[#ba1a1a] bg-white px-2 py-1 text-xs font-bold text-[#ba1a1a]"
                  onClick={speech.stop}
                >
                  Stop &amp; send
                </button>
              </div>
              <p className="mt-2 text-[var(--ink)]">{speech.transcript || "Speak your complete request, then tap Stop & send."}</p>
            </div>
          )}
          {speech.error && <p className="form-error">{speech.error}</p>}
          {speechOutputError && <p className="form-error">{speechOutputError}</p>}
          {visibleChoices.length > 0 && (
            <div className="grid gap-2">
              {visibleChoices.map((station) => (
                <button key={station.stationId} className="rounded-lg border border-[var(--line)] bg-white p-2 text-start text-sm hover:border-[var(--primary)]" onClick={() => chooseStation(station)}>
                  <strong>{station.name}</strong> · {station.code}<span className="block text-xs text-[var(--muted)]">{station.state}</span>
                </button>
              ))}
            </div>
          )}
          {tourismChoices.length > 0 && (
            <div className="grid gap-2">
              {tourismChoices.map((destination) => (
                <button
                  key={destination.destinationId}
                  className="rounded-lg border border-[var(--line)] bg-white p-2 text-start text-sm hover:border-[var(--primary)]"
                  onClick={() => chooseTourismDestination(destination)}
                >
                  <strong>{destination.title}</strong>
                  <span className="block text-xs text-[var(--muted)]">
                    {destination.themes.join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
          {phase === "confirming_search" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void submitUtterance("yes, search")}>Search trains</Button>
              <Button size="sm" variant="secondary" onClick={() => void submitUtterance("no")}>Change</Button>
            </div>
          )}
          {phase === "confirming_journey" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void submitUtterance("yes, continue")}>Continue to booking</Button>
              <Button size="sm" variant="secondary" onClick={() => void submitUtterance("no")}>Choose another</Button>
            </div>
          )}
          {phase === "confirming_pnr_cancellation" && pendingPnrCancellation && (
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => void submitUtterance("yes, cancel booking")}>Cancel booking</Button>
              <Button size="sm" variant="secondary" onClick={() => void submitUtterance("no, keep booking")}>Keep booking</Button>
            </div>
          )}
          {phase === "confirming_tourism_cancellation" && pendingTourismCancellation && (
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => void submitUtterance("yes, cancel tourism booking")}>Cancel package</Button>
              <Button size="sm" variant="secondary" onClick={() => void submitUtterance("no, keep tourism booking")}>Keep package</Button>
            </div>
          )}
        </div>
        <div className="border-t border-[var(--line)] bg-white p-3">
          <div className="flex gap-2">
            <button
              type="button"
              className={`grid size-11 shrink-0 place-items-center rounded-lg border ${speech.listening ? "border-[#ba1a1a] bg-[#fff0ee] text-[#ba1a1a]" : "border-[var(--line)] text-[var(--primary)]"}`}
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={!speech.supported || parsing || pathname.startsWith("/checkout/payment")}
              aria-label={speech.listening ? "Stop listening" : "Start voice search"}
              title={speech.supported ? (speech.listening ? "Stop and send voice request" : "Start voice search") : "Voice recognition is not supported in this browser"}
            >
              {speech.listening ? <MicOff /> : <Mic />}
            </button>
            <input
              className="min-h-11 min-w-0 flex-1 rounded-lg"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submitUtterance()}
              placeholder="Describe a journey or command…"
              maxLength={500}
            />
            <button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white disabled:opacity-60" onClick={() => void submitUtterance()} disabled={!query.trim() || parsing} aria-label="Send">
              {parsing ? <Loader2 className="animate-spin" /> : <Send />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span><TrainFront className="me-1 inline size-3.5" />AI interprets; RailEase verifies results and warnings.</span>
            <button onClick={speaking ? stopSpeaking : () => {
              const last = [...messages].reverse().find((message) => message.role === "assistant");
              if (last) speak(last.text);
            }} aria-label={speaking ? "Stop speaking" : "Read last reply"}>
              {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
