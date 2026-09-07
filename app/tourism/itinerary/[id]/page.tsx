"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Headphones,
  Hotel,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  QrCode,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cityById } from "@/lib/tourism-data";
import { saveStorage, savedItineraries, storageKeys } from "@/lib/storage";
import type { Itinerary, TourismPassenger } from "@/lib/types";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function destinationImage(destinationId: string) {
  const number = Number(destinationId.match(/\d+/)?.[0] ?? 1);
  return `/images/destination-${((number - 1) % 4) + 1}.webp`;
}

function visitDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""]
    .filter(Boolean)
    .join(" ");
}

function makePassenger(index: number): TourismPassenger {
  return {
    id: `tourist-${Date.now()}-${index}`,
    name: "",
    age: 18,
    gender: "other",
    idType: "aadhaar",
    idNumber: "",
  };
}

export default function ItineraryPage() {
  const { locale, t, user } = useApp();
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookedNow, setBookedNow] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [passengers, setPassengers] = useState<TourismPassenger[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "netbanking"
  >("upi");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [qrPayment, setQrPayment] = useState<{
    id: string;
    imageUrl: string;
    closeBy: number;
    mock: boolean;
    amount?: number;
    signature?: string;
    fallbackReason?: string;
  } | null>(null);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCompletionRef = useRef(false);

  useEffect(() => {
    const saved = savedItineraries().find((item) => item.id === id) ?? null;
    setItinerary(saved);
    if (saved) {
      setPassengers(
        saved.passengers?.length === (saved.travelers ?? 1)
          ? saved.passengers
          : Array.from({ length: saved.travelers ?? 1 }, (_, index) =>
              makePassenger(index),
            ),
      );
      setName(saved.contact?.name ?? user?.name ?? "");
      setEmail(saved.contact?.email ?? user?.email ?? "");
      setPhone(saved.contact?.phone ?? "");
    }
  }, [id, user?.email, user?.name]);

  useEffect(
    () => () => {
      if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    },
    [],
  );

  const saveItinerary = (next: Itinerary) => {
    setItinerary(next);
    const stored = savedItineraries();
    saveStorage(
      storageKeys.itineraries,
      stored.some((item) => item.id === next.id)
        ? stored.map((item) => (item.id === next.id ? next : item))
        : [next, ...stored],
    );
  };

  if (!itinerary)
    return (
      <div className="page">
        <div className="card empty-state">
          <MapPin />
          <h2>{t("pages.tourism.itinerary.notFound")}</h2>
          <Button asChild>
            <Link href="/tourism/plan">
              {t("pages.tourism.itinerary.create")}
            </Link>
          </Button>
        </div>
      </div>
    );

  const city = cityById.get(itinerary.destination.cityId);
  const sourceName = itinerary.source?.name ?? "Your city";
  const destinationName = city?.name ?? itinerary.destination.title;
  const travelers = itinerary.travelers ?? 1;
  const rooms = itinerary.rooms ?? 1;
  const booked = itinerary.confirmed;
  const cancelled = itinerary.bookingStatus === "cancelled";
  const heroImage =
    itinerary.destination.heroImage ??
    itinerary.days[0]?.activities[0]?.imageUrl ??
    destinationImage(itinerary.destination.destinationId);
  const costRows = [
    [t("pages.tourism.itinerary.transport"), itinerary.costs.transport],
    [t("pages.tourism.itinerary.accommodation"), itinerary.costs.accommodation],
    [t("pages.tourism.itinerary.activities"), itinerary.costs.activities],
    [t("pages.tourism.itinerary.meals"), itinerary.costs.meals],
    [t("pages.tourism.itinerary.serviceFee"), itinerary.costs.serviceFee],
  ] as const;

  const recalc = (next: Itinerary) => {
    const activityCost =
      next.days
        .flatMap((day) => day.activities)
        .reduce((total, activity) => total + activity.fromPrice, 0) * travelers;
    const serviceFee = Math.round(
      (next.costs.transport +
        next.costs.accommodation +
        activityCost +
        next.costs.meals) *
        0.03,
    );
    saveItinerary({
      ...next,
      costs: {
        ...next.costs,
        activities: activityCost,
        serviceFee,
        total:
          next.costs.transport +
          next.costs.accommodation +
          activityCost +
          next.costs.meals +
          serviceFee,
      },
    });
  };

  const editActivity = (
    dayIndex: number,
    activityIndex: number,
    type: "remove" | "up" | "down" | "replace",
  ) => {
    if (booked) return;
    const days = structuredClone(itinerary.days);
    const activities = days[dayIndex].activities;
    if (type === "remove") activities.splice(activityIndex, 1);
    else if (type === "replace")
      activities[activityIndex] = {
        ...activities[activityIndex],
        name: t("pages.tourism.itinerary.alternative", {
          category: activities[activityIndex].category,
        }),
        fromPrice: Math.max(100, activities[activityIndex].fromPrice - 150),
      };
    else {
      const target = type === "up" ? activityIndex - 1 : activityIndex + 1;
      if (target >= 0 && target < activities.length)
        [activities[activityIndex], activities[target]] = [
          activities[target],
          activities[activityIndex],
        ];
    }
    recalc({ ...itinerary, days });
  };

  const openBooking = () => {
    setBookingStep(1);
    setBookingError("");
    setBookingOpen(true);
  };
  const continueBooking = () => {
    setBookingError("");
    if (bookingStep === 1) {
      if (
        name.trim().length < 2 ||
        !email.includes("@") ||
        phone.replace(/\D/g, "").length < 10
      )
        return setBookingError(
          "Enter a valid lead traveler name, email and 10-digit phone number.",
        );
      setBookingStep(2);
      return;
    }
    if (
      passengers.some(
        (passenger) =>
          passenger.name.trim().length < 2 ||
          passenger.age < 1 ||
          passenger.age > 120 ||
          passenger.idNumber.trim().length < 4,
      )
    )
      return setBookingError(
        "Complete the name, age and valid ID details for every passenger.",
      );
    setBookingStep(3);
  };
  const updatePassenger = (
    index: number,
    field: keyof TourismPassenger,
    value: string | number,
  ) =>
    setPassengers((current) =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index ? { ...passenger, [field]: value } : passenger,
      ),
    );

  const completeBooking = (orderId: string) => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = null;
    const next: Itinerary = {
      ...itinerary,
      confirmed: true,
      bookingStatus: "confirmed",
      bookingReference:
        itinerary.bookingReference ?? `RTP-${Date.now().toString().slice(-8)}`,
      bookedAt: new Date().toISOString(),
      paymentMethod,
      paymentOrderId: orderId,
      passengers,
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() },
    };
    saveItinerary(next);
    setPaymentBusy(false);
    setBookingOpen(false);
    setBookedNow(true);
  };

  async function checkQrStatus(paymentSession = qrPayment, silent = false) {
    if (
      !paymentSession ||
      paymentSession.mock ||
      !paymentSession.amount ||
      !paymentSession.signature
    )
      return;
    if (!silent) {
      setPaymentBusy(true);
      setBookingError("");
    }
    try {
      const response = await fetch("/api/razorpay/qr/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: paymentSession.id,
          amount: paymentSession.amount,
          closeBy: paymentSession.closeBy,
          signature: paymentSession.signature,
        }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        paid?: boolean;
        expired?: boolean;
        error?: string;
      };
      if (result.expired) {
        if (qrPollingRef.current) clearInterval(qrPollingRef.current);
        qrPollingRef.current = null;
        setQrPayment(null);
        setBookingError("This QR code has expired. Generate a new one.");
        return;
      }
      if (!response.ok)
        throw new Error(result.error ?? "Unable to check QR payment status.");
      if (result.paid && !qrCompletionRef.current) {
        qrCompletionRef.current = true;
        completeBooking(paymentSession.id);
        return;
      }
      if (!silent)
        setBookingError(
          "Payment has not been received yet. Scan the QR and try again.",
        );
    } catch (error) {
      if (!silent)
        setBookingError(
          error instanceof Error
            ? error.message
            : "Unable to check QR payment status.",
        );
    } finally {
      if (!silent) setPaymentBusy(false);
    }
  }

  function startQrPolling(paymentSession: NonNullable<typeof qrPayment>) {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = setInterval(() => {
      void checkQrStatus(paymentSession, true);
    }, 3000);
  }

  const createQrPayment = async () => {
    if (!termsAccepted)
      return setBookingError(t("pages.tourism.itinerary.termsError"));
    qrCompletionRef.current = false;
    setPaymentBusy(true);
    setBookingError("");
    try {
      const response = await fetch("/api/razorpay/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: itinerary.costs.total,
          currency: "INR",
          receipt: `tour-${Date.now()}`,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        imageUrl?: string;
        closeBy?: number;
        mock?: boolean;
        amount?: number;
        signature?: string;
        fallbackReason?: string;
        error?: string;
      };
      if (
        !response.ok ||
        !result.id ||
        !result.imageUrl ||
        !result.closeBy ||
        (!result.mock && (!result.amount || !result.signature))
      )
        throw new Error(result.error ?? "Unable to generate a UPI QR code.");
      const paymentSession = {
        id: result.id,
        imageUrl: result.imageUrl,
        closeBy: result.closeBy,
        mock: Boolean(result.mock),
        amount: result.amount,
        signature: result.signature,
        fallbackReason: result.fallbackReason,
      };
      setQrPayment(paymentSession);
      if (!paymentSession.mock) startQrPolling(paymentSession);
    } catch (error) {
      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to generate a UPI QR code.",
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  const selectPaymentMethod = (method: typeof paymentMethod) => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = null;
    qrCompletionRef.current = false;
    setPaymentMethod(method);
    setBookingError("");
    setQrPayment(null);
  };

  const payWithRazorpay = async () => {
    if (!termsAccepted)
      return setBookingError(t("pages.tourism.itinerary.termsError"));
    setPaymentBusy(true);
    setBookingError("");
    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: itinerary.costs.total,
          currency: "INR",
          receipt: `tour-${Date.now()}`,
        }),
      });
      const order = (await response.json()) as {
        id?: string;
        mock?: boolean;
        error?: string;
      };
      if (!response.ok || !order.id)
        throw new Error(order.error ?? "Unable to create payment order.");
      if (order.mock) return completeBooking(order.id);
      const restoreReviewStep = (message: string) => {
        setPaymentBusy(false);
        setBookingStep(3);
        setBookingError(message);
        window.setTimeout(() => setBookingOpen(true), 250);
      };
      const launchCheckout = () => {
        const checkout = new window.Razorpay!({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: itinerary.costs.total * 100,
          currency: "INR",
          order_id: order.id,
          name: "RailEase Tourism",
          description: `${destinationName} package for ${travelers} travelers`,
          prefill: { email, method: paymentMethod },
          config: {
            display: {
              sequence: [paymentMethod],
              preferences: { show_default_blocks: false },
            },
          },
          theme: { color: "#0b6b63" },
          handler: async (paymentResponse: Record<string, string>) => {
            const verified = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentResponse),
            });
            if (!verified.ok) {
              restoreReviewStep(
                "Payment verification failed. No booking was created.",
              );
              return;
            }
            completeBooking(order.id!);
          },
          modal: {
            ondismiss: () => {
              restoreReviewStep(
                "Payment was cancelled. You can try again when ready.",
              );
            },
          },
        });
        // Radix and Razorpay both trap focus. Fully unmount our booking dialog
        // before opening Razorpay so only one modal owns focus at a time.
        setBookingOpen(false);
        window.setTimeout(() => checkout.open(), 0);
      };
      if (window.Razorpay) launchCheckout();
      else {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = launchCheckout;
        script.onerror = () => {
          setPaymentBusy(false);
          setBookingError(
            "Razorpay could not be loaded. Check your connection and try again.",
          );
        };
        document.body.appendChild(script);
      }
    } catch (error) {
      setPaymentBusy(false);
      setBookingError(
        error instanceof Error ? error.message : "Unable to start payment.",
      );
    }
  };

  const packageSummary = (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.1)] lg:sticky lg:top-28">
      <div className="border-b border-slate-100 p-6">
        <span className="text-sm text-slate-500">
          {booked ? "Total package value" : "Package estimate"}
        </span>
        <strong className="mt-1 block text-3xl">
          ₹{itinerary.costs.total.toLocaleString(locale)}
        </strong>
        <span className="text-sm text-slate-500">
          ₹
          {Math.round(itinerary.costs.total / travelers).toLocaleString(locale)}{" "}
          per person
        </span>
      </div>
      <div className="p-6">
        <div className="grid gap-3 text-sm">
          {costRows.map(([label, amount]) => (
            <div className="flex justify-between gap-4" key={label}>
              <span className="text-slate-500">{label}</span>
              <strong>₹{amount.toLocaleString(locale)}</strong>
            </div>
          ))}
        </div>
        <div className="my-5 rounded-xl bg-[#f3faf8] p-4 text-sm">
          <strong>Included in your package</strong>
          <div className="mt-3 grid gap-2 text-slate-600">
            <span className="flex gap-2">
              <Check className="size-4 text-[#0b6b63]" />{" "}
              {itinerary.hotel?.name ?? itinerary.accommodationType}
            </span>
            <span className="flex gap-2">
              <Check className="size-4 text-[#0b6b63]" /> Return{" "}
              {itinerary.travelMode ?? "Train"} travel
            </span>
            <span className="flex gap-2">
              <Check className="size-4 text-[#0b6b63]" />{" "}
              {itinerary.mealPlan ?? "Breakfast"}
            </span>
          </div>
        </div>
        {booked ? (
          <Button className="w-full" variant="secondary" asChild>
            <Link href="/tourism/bookings">
              View booked packages <ArrowRight />
            </Link>
          </Button>
        ) : (
          <Button
            className="w-full bg-[#0b6b63] hover:bg-[#075b55]"
            onClick={openBooking}
          >
            Continue to booking <ArrowRight />
          </Button>
        )}
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck className="size-4" /> Secure checkout with Razorpay
        </p>
      </div>
    </aside>
  );

  return (
    <div className="page">
      <Link
        href="/tourism/plan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]"
      >
        <ArrowLeft className="size-4" /> {t("pages.tourism.itinerary.back")}
      </Link>
      <section className="relative mt-5 min-h-[440px] overflow-hidden rounded-[28px] bg-[#073f3a] text-white shadow-[0_24px_70px_rgba(7,63,58,.22)]">
        <Image
          src={heroImage}
          alt={destinationName}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#052f2c] via-[#052f2c]/65 to-black/15" />
        <div className="relative flex min-h-[440px] flex-col justify-end p-6 sm:p-9 lg:p-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-4 border-white/15 bg-white/10 text-white">
                <Sparkles />{" "}
                {booked
                  ? cancelled
                    ? "Cancelled package"
                    : "Booked package"
                  : "Your curated itinerary"}
              </Badge>
              <h1 className="text-white">
                {sourceName} to {destinationName}
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-7 text-white/85">
                {itinerary.destination.summary}
              </p>
              <p className="mt-3 text-sm text-white/75">
                {itinerary.startDate} → {itinerary.endDate} ·{" "}
                {itinerary.days.length} days · {itinerary.style} ·{" "}
                {itinerary.pace}
              </p>
            </div>
            {booked ? (
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <span className="text-xs uppercase tracking-wider text-white/60">
                  Booking reference
                </span>
                <strong className="mt-1 block text-xl">
                  {itinerary.bookingReference}
                </strong>
              </div>
            ) : (
              <Badge className="bg-[#ffcb66] px-4 py-2 text-[#17202a]">
                Draft · editable
              </Badge>
            )}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/20 pt-6 text-sm sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[#9ee6dd]" /> {travelers} travelers
            </div>
            <div className="flex items-center gap-2">
              <BedDouble className="size-4 text-[#9ee6dd]" /> {rooms} rooms
            </div>
            <div className="flex items-center gap-2">
              <TrainFront className="size-4 text-[#9ee6dd]" />{" "}
              {itinerary.travelMode}
            </div>
            <div className="flex items-center gap-2">
              <Utensils className="size-4 text-[#9ee6dd]" />{" "}
              {itinerary.mealPlan}
            </div>
          </div>
        </div>
      </section>
      {bookedNow && (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 text-emerald-700" />
            <div>
              <strong className="text-emerald-950">Booking confirmed</strong>
              <p className="mt-1 text-sm text-emerald-800">
                Your payment was recorded under {itinerary.bookingReference}.
              </p>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/tourism/bookings">
              View bookings <ArrowRight />
            </Link>
          </Button>
        </section>
      )}

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4">
          {[
            ["overview", "Overview"],
            ["itinerary", "Itinerary"],
            ["terms", "Terms & conditions"],
            ["contact", "Contact us"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-[#0b6b63] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <main className="grid gap-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <Badge className="bg-[#e5f7f4] text-[#075b55]">
                  <Route /> Complete route
                </Badge>
                <h2 className="mt-4">Your trip at a glance</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-xl bg-slate-50 p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Source
                    </span>
                    <strong className="mt-1 block text-xl">{sourceName}</strong>
                    <span className="text-sm text-slate-500">
                      {itinerary.source?.state ?? "Departure city"}
                    </span>
                  </div>
                  <ArrowRight className="mx-auto size-6 text-[#0b6b63] max-sm:rotate-90" />
                  <div className="rounded-xl bg-[#f3faf8] p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0b6b63]">
                      Destination
                    </span>
                    <strong className="mt-1 block text-xl">
                      {destinationName}
                    </strong>
                    <span className="text-sm text-slate-500">
                      Nearest station included in planning
                    </span>
                  </div>
                </div>
                <p className="mt-5 text-slate-600">
                  Return travel from {sourceName} to {destinationName} is
                  included in the transport estimate, together with the selected
                  local travel mode.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2>Tourism details</h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {itinerary.destination.summary}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <CalendarDays className="size-5 text-[#0b6b63]" />
                    <strong className="mt-2 block">Best months</strong>
                    <span className="text-sm text-slate-500">
                      {itinerary.destination.bestMonths.join(", ")}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <Sparkles className="size-5 text-[#0b6b63]" />
                    <strong className="mt-2 block">Trip themes</strong>
                    <span className="text-sm text-slate-500">
                      {itinerary.destination.themes.join(" · ")}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <Hotel className="size-5 text-[#0b6b63]" />
                    <strong className="mt-2 block">Stay</strong>
                    <span className="text-sm text-slate-500">
                      {itinerary.hotel?.name ?? itinerary.accommodationType} ·{" "}
                      {rooms} room{rooms === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <Users className="size-5 text-[#0b6b63]" />
                    <strong className="mt-2 block">Travel profile</strong>
                    <span className="text-sm text-slate-500">
                      {itinerary.style} · {itinerary.pace} pace · {travelers}{" "}
                      traveler{travelers === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </section>
            </main>
            {packageSummary}
          </div>
        </TabsContent>

        <TabsContent value="itinerary" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <main className="grid gap-5">
              <div>
                <span className="eyebrow text-[#0b6b63]">Day by day</span>
                <h2 className="mt-2">Your complete trip plan</h2>
                {!booked && (
                  <p className="mt-1 text-sm text-slate-500">
                    Reorder, replace or remove any experience.
                  </p>
                )}
              </div>
              {itinerary.days.map((day, dayIndex) => {
                const totalMinutes = day.activities.reduce(
                  (total, activity) =>
                    total + activity.durationMinutes + activity.travelMinutes,
                  0,
                );
                return (
                  <section
                    className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,.06)]"
                    key={day.day}
                  >
                    <div className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,#f3faf8,#f7f9ff)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0b6b63] font-bold text-white">
                          {day.day}
                        </span>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#0b6b63]">
                            Day {day.day}
                          </span>
                          <h2 className="text-xl">{day.title}</h2>
                        </div>
                      </div>
                      {!!day.activities.length && (
                        <span className="text-xs font-semibold text-slate-600">
                          {day.activities.length} experiences ·{" "}
                          {visitDuration(totalMinutes)} planned
                        </span>
                      )}
                    </div>
                    <div className="grid gap-5 p-4 sm:p-5">
                      {day.activities.length ? (
                        day.activities.map((activity, activityIndex) => (
                          <article
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid lg:grid-cols-[220px_1fr]"
                            key={`${activity.attractionId}-${activityIndex}`}
                          >
                            <div className="relative min-h-48 bg-slate-100">
                              <Image
                                src={activity.imageUrl ?? heroImage}
                                alt={activity.name}
                                fill
                                sizes="(max-width: 1024px) 100vw, 220px"
                                className="object-cover"
                              />
                              <strong className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm text-[#075b55]">
                                <Clock3 className="size-4" /> {activity.time}
                              </strong>
                            </div>
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#0b6b63]">
                                    {activity.category}
                                  </span>
                                  <h3 className="mt-1">{activity.name}</h3>
                                </div>
                                {!booked && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        editActivity(
                                          dayIndex,
                                          activityIndex,
                                          "up",
                                        )
                                      }
                                      aria-label="Move up"
                                    >
                                      <ArrowUp />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        editActivity(
                                          dayIndex,
                                          activityIndex,
                                          "down",
                                        )
                                      }
                                      aria-label="Move down"
                                    >
                                      <ArrowDown />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        editActivity(
                                          dayIndex,
                                          activityIndex,
                                          "remove",
                                        )
                                      }
                                      aria-label="Remove"
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {activity.description ?? activity.whyPopular}
                              </p>
                              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <Badge variant="secondary">
                                  {visitDuration(activity.durationMinutes)}
                                </Badge>
                                <Badge variant="outline">
                                  ₹{activity.fromPrice.toLocaleString(locale)}
                                </Badge>
                                <span>
                                  {activity.travelMinutes} min by{" "}
                                  {activity.transportation}
                                </span>
                                {!booked && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      editActivity(
                                        dayIndex,
                                        activityIndex,
                                        "replace",
                                      )
                                    }
                                  >
                                    <RefreshCw /> Replace
                                  </Button>
                                )}
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="py-5 text-center text-slate-500">
                          A free day to explore at your own pace.
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </main>
            {packageSummary}
          </div>
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-9">
            <Badge className="bg-[#e5f7f4] text-[#075b55]">
              <ShieldCheck /> Package policies
            </Badge>
            <h2 className="mt-4">Terms & conditions</h2>
            <div className="mt-6 grid gap-7 text-sm leading-7 text-slate-600">
              <div>
                <h3 className="text-base text-slate-900">
                  Booking and payment
                </h3>
                <p className="mt-2">
                  A package is confirmed only after successful payment and
                  issuance of a RailEase Tourism booking reference. Prices shown
                  are estimates until checkout and may change if taxes, rail
                  fares, hotel inventory or selected services change.
                </p>
              </div>
              <div>
                <h3 className="text-base text-slate-900">
                  Changes and cancellation
                </h3>
                <p className="mt-2">
                  Change and cancellation charges depend on the notice period
                  and individual supplier rules. Rail tickets, promotional hotel
                  rates and time-bound activities may be non-refundable. Any
                  eligible refund is returned to the original payment method
                  after supplier deductions.
                </p>
              </div>
              <div>
                <h3 className="text-base text-slate-900">Traveler documents</h3>
                <p className="mt-2">
                  Every traveler must carry an original, valid government-issued
                  photo ID matching the passenger details supplied during
                  booking. Travelers are responsible for permits, health
                  requirements and any destination-specific documentation.
                </p>
              </div>
              <div>
                <h3 className="text-base text-slate-900">
                  Itinerary and service changes
                </h3>
                <p className="mt-2">
                  Timings are indicative and can change because of weather,
                  operational restrictions, transport delays or local
                  conditions. We may provide a comparable hotel, activity or
                  transfer when a listed service becomes unavailable.
                </p>
              </div>
              <div>
                <h3 className="text-base text-slate-900">Responsibility</h3>
                <p className="mt-2">
                  RailEase coordinates services delivered by independent rail,
                  hotel, transport and activity providers. Personal expenses,
                  meals or transfers not expressly listed as included, travel
                  insurance and losses caused by missed departures remain the
                  traveler’s responsibility.
                </p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-9">
            <Badge className="bg-[#e5f7f4] text-[#075b55]">
              <Headphones /> We’re here to help
            </Badge>
            <h2 className="mt-4">Contact RailEase Tourism</h2>
            <p className="mt-2 text-slate-600">
              Keep your booking reference ready for faster assistance.
            </p>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[
                [
                  Phone,
                  "New bookings",
                  "+91 1800 120 8747",
                  "tel:+9118001208747",
                ],
                [
                  Phone,
                  "Existing booking support",
                  "+91 11 4303 0303",
                  "tel:+911143030303",
                ],
                [
                  Mail,
                  "Package enquiries",
                  "holidays@railease.in",
                  "mailto:holidays@railease.in",
                ],
                [
                  Mail,
                  "Changes & refunds",
                  "support@railease.in",
                  "mailto:support@railease.in",
                ],
                [
                  Headphones,
                  "Emergency trip support",
                  "+91 99999 87470",
                  "tel:+919999987470",
                ],
                [
                  Mail,
                  "Escalations",
                  "care@railease.in",
                  "mailto:care@railease.in",
                ],
              ].map(([Icon, title, detail, href]) => (
                <a
                  key={String(title)}
                  href={String(href)}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-[#0b6b63] hover:bg-[#f3faf8]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e5f7f4] text-[#075b55]">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <strong className="block">{String(title)}</strong>
                    <span className="mt-1 block text-sm text-slate-500">
                      {String(detail)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open && qrPollingRef.current) {
            clearInterval(qrPollingRef.current);
            qrPollingRef.current = null;
          }
        }}
      >
        <DialogContent
          className="max-h-[94vh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto p-0"
          closeLabel={t("common.actions.close")}
        >
          <div className="bg-[#073f3a] p-6 text-white sm:p-8">
            <Badge className="bg-white/10 text-white">
              <ShieldCheck /> Secure package checkout
            </Badge>
            <DialogTitle className="mt-4 text-2xl text-white">
              Complete your booking
            </DialogTitle>
            <DialogDescription className="mt-2 text-white/70">
              {sourceName} → {destinationName} · {itinerary.days.length} days ·
              ₹{itinerary.costs.total.toLocaleString(locale)}
            </DialogDescription>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Basic details", "Passengers", "Review & pay"].map(
                (label, index) => {
                  const step = index + 1;
                  return (
                    <div
                      key={label}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-center text-xs font-semibold",
                        bookingStep === step
                          ? "border-white bg-white text-[#073f3a]"
                          : bookingStep > step
                            ? "border-emerald-300/50 bg-emerald-300/15 text-white"
                            : "border-white/20 text-white/55",
                      )}
                    >
                      {bookingStep > step ? "✓ " : `${step}. `}
                      {label}
                    </div>
                  );
                },
              )}
            </div>
          </div>
          <div className="grid gap-6 p-6 sm:p-8">
            {bookingStep === 1 && (
              <section>
                <h3>Basic trip & contact details</h3>
                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <span>
                    <strong className="block text-slate-900">Route</strong>
                    {sourceName} → {destinationName}
                  </span>
                  <span>
                    <strong className="block text-slate-900">
                      Travel dates
                    </strong>
                    {itinerary.startDate} → {itinerary.endDate}
                  </span>
                  <span>
                    <strong className="block text-slate-900">Travelers</strong>
                    {travelers} passenger{travelers === 1 ? "" : "s"}
                  </span>
                  <span>
                    <strong className="block text-slate-900">Package</strong>
                    {rooms} room{rooms === 1 ? "" : "s"} · {itinerary.mealPlan}
                  </span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    Lead traveler name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Full name"
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="10-digit mobile number"
                    />
                  </label>
                </div>
              </section>
            )}

            {bookingStep === 2 && (
              <section>
                <h3>Passenger details</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter details exactly as they appear on each traveler’s
                  government ID.
                </p>
                <div className="mt-5 grid gap-4">
                  {passengers.map((passenger, index) => (
                    <div
                      key={passenger.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <strong>Passenger {index + 1}</strong>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="sm:col-span-2 lg:col-span-1">
                          Full name
                          <input
                            value={passenger.name}
                            onChange={(event) =>
                              updatePassenger(index, "name", event.target.value)
                            }
                            placeholder="As on ID"
                          />
                        </label>
                        <label>
                          Age
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={passenger.age}
                            onChange={(event) =>
                              updatePassenger(
                                index,
                                "age",
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                        <label>
                          Gender
                          <select
                            value={passenger.gender}
                            onChange={(event) =>
                              updatePassenger(
                                index,
                                "gender",
                                event.target.value,
                              )
                            }
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label>
                          ID type
                          <select
                            value={passenger.idType}
                            onChange={(event) =>
                              updatePassenger(
                                index,
                                "idType",
                                event.target.value,
                              )
                            }
                          >
                            <option value="aadhaar">Aadhaar</option>
                            <option value="passport">Passport</option>
                            <option value="driving_license">
                              Driving licence
                            </option>
                          </select>
                        </label>
                        <label className="sm:col-span-2">
                          ID number
                          <input
                            value={passenger.idNumber}
                            onChange={(event) =>
                              updatePassenger(
                                index,
                                "idNumber",
                                event.target.value,
                              )
                            }
                            placeholder="Government ID number"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {bookingStep === 3 && (
              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <h3>Review your booking</h3>
                  <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm">
                    <strong>
                      {sourceName} → {destinationName}
                    </strong>
                    <p className="mt-1 text-slate-500">
                      {itinerary.startDate} to {itinerary.endDate} · {travelers}{" "}
                      travelers
                    </p>
                    <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
                      {passengers.map((passenger, index) => (
                        <div
                          className="flex justify-between gap-4"
                          key={passenger.id}
                        >
                          <span className="text-slate-500">
                            Passenger {index + 1}
                          </span>
                          <strong className="text-right">
                            {passenger.name} · {passenger.age}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="mt-6">Pay securely with Razorpay</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      ["upi", "UPI QR code"],
                      ["card", "Credit / debit card"],
                      ["netbanking", "Netbanking"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={cn(
                          "rounded-xl border p-4 text-start",
                          paymentMethod === value
                            ? "border-2 border-[#0b6b63] bg-[#f3faf8]"
                            : "border-slate-200",
                        )}
                        onClick={() =>
                          selectPaymentMethod(value as typeof paymentMethod)
                        }
                      >
                        {value === "upi" ? (
                          <QrCode className="size-5 text-[#0b6b63]" />
                        ) : (
                          <CreditCard className="size-5 text-[#0b6b63]" />
                        )}
                        <strong className="mt-2 block text-sm">{label}</strong>
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "upi" && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {qrPayment ? (
                        <div className="grid gap-5 p-5 sm:grid-cols-[190px_1fr] sm:items-center">
                          <div className="mx-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:mx-0">
                            <Image
                              src={qrPayment.imageUrl}
                              alt="Razorpay UPI payment QR code"
                              width={176}
                              height={176}
                              unoptimized
                              className="size-44 object-contain"
                            />
                          </div>
                          <div className="text-center sm:text-left">
                            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                              <Badge variant="outline">
                                {qrPayment.mock
                                  ? "Demo QR"
                                  : "Razorpay secure QR"}
                              </Badge>
                              <Badge variant="outline">Single use</Badge>
                            </div>
                            <strong className="mt-4 block">
                              Scan with any UPI app
                            </strong>
                            <p className="mt-1 text-sm text-slate-500">
                              Pay exactly ₹
                              {itinerary.costs.total.toLocaleString(locale)}.
                              This QR expires at{" "}
                              {new Intl.DateTimeFormat(locale, {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }).format(new Date(qrPayment.closeBy * 1000))}
                              .
                            </p>
                            {qrPayment.fallbackReason && (
                              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                                Razorpay test mode: the merchant QR capability
                                is unavailable, so this is a safe demo QR. Use
                                the simulation button to complete the prototype
                                payment.
                              </p>
                            )}
                            {qrPayment.mock ? (
                              <Button
                                className="mt-4"
                                size="sm"
                                onClick={() => completeBooking(qrPayment.id)}
                              >
                                Simulate successful payment
                              </Button>
                            ) : (
                              <Button
                                className="mt-4"
                                size="sm"
                                variant="secondary"
                                disabled={paymentBusy}
                                onClick={() => void checkQrStatus()}
                              >
                                {paymentBusy && (
                                  <LoaderCircle className="animate-spin" />
                                )}
                                Check payment status
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4 p-5">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e5f7f4] text-[#075b55]">
                            <QrCode />
                          </span>
                          <div>
                            <strong>Scan and pay from your phone</strong>
                            <p className="mt-1 text-sm text-slate-500">
                              Accept the package terms, then generate a secure,
                              single-use Razorpay QR code.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {paymentMethod === "card" &&
                    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith(
                      "rzp_test_",
                    ) && (
                      <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                        Razorpay test mode is active. Use a supported Razorpay
                        test card, any future expiry date and any valid CVV; no
                        real charge will be made.
                      </p>
                    )}
                  <label className="mt-5 flex cursor-pointer grid-cols-none items-start gap-3 rounded-xl bg-slate-50 p-4 font-normal">
                    <Checkbox
                      checked={termsAccepted}
                      onCheckedChange={(checked) =>
                        setTermsAccepted(checked === true)
                      }
                    />
                    <span>
                      I confirm the passenger details and accept the package
                      terms, cancellation and refund policies.
                    </span>
                  </label>
                </div>
                <div className="rounded-xl bg-[#073f3a] p-5 text-white">
                  <span className="text-sm text-white/65">
                    Package breakdown
                  </span>
                  <div className="mt-4 grid gap-3 text-sm">
                    {costRows.map(([label, amount]) => (
                      <div className="flex justify-between gap-4" key={label}>
                        <span className="text-white/70">{label}</span>
                        <strong>₹{amount.toLocaleString(locale)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-between border-t border-white/20 pt-5">
                    <strong>Total payable</strong>
                    <strong className="text-xl">
                      ₹{itinerary.costs.total.toLocaleString(locale)}
                    </strong>
                  </div>
                </div>
              </section>
            )}

            {bookingError && <p className="form-error">{bookingError}</p>}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  if (bookingStep === 1) setBookingOpen(false);
                  else {
                    if (bookingStep === 3) {
                      if (qrPollingRef.current)
                        clearInterval(qrPollingRef.current);
                      qrPollingRef.current = null;
                      setQrPayment(null);
                    }
                    setBookingError("");
                    setBookingStep((step) => step - 1);
                  }
                }}
              >
                {bookingStep === 1 ? "Cancel" : "Back"}
              </Button>
              {bookingStep < 3 ? (
                <Button
                  className="bg-[#0b6b63] hover:bg-[#075b55]"
                  onClick={continueBooking}
                >
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button
                  className="bg-[#0b6b63] hover:bg-[#075b55]"
                  disabled={
                    paymentBusy ||
                    (paymentMethod === "upi" && Boolean(qrPayment?.mock))
                  }
                  onClick={() => {
                    if (paymentMethod !== "upi") {
                      void payWithRazorpay();
                      return;
                    }
                    if (qrPayment) void checkQrStatus();
                    else void createQrPayment();
                  }}
                >
                  {paymentBusy ? (
                    <LoaderCircle className="animate-spin" />
                  ) : paymentMethod === "upi" ? (
                    <QrCode />
                  ) : (
                    <ShieldCheck />
                  )}{" "}
                  {paymentBusy
                    ? paymentMethod === "upi"
                      ? "Preparing QR…"
                      : "Opening Razorpay…"
                    : paymentMethod === "upi"
                      ? qrPayment
                        ? qrPayment.mock
                          ? "Demo QR generated"
                          : "Check payment status"
                        : `Generate QR for ₹${itinerary.costs.total.toLocaleString(locale)}`
                      : `Pay ₹${itinerary.costs.total.toLocaleString(locale)}`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
