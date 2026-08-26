"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  Check,
  CircleCheck,
  Clock3,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { quotas } from "@/lib/data";
import {
  calculateFareBreakdown,
  formatDuration,
  selectBestAvailableQuota,
  selectEligibleQuota,
} from "@/lib/search";
import {
  loadStorage,
  makePnr,
  saveStorage,
  savedBookings,
  savedPassengers,
  storageKeys,
} from "@/lib/storage";
import type {
  AvailabilityStatus,
  Booking,
  ClassSeatAvailability,
  Journey,
  Passenger,
  QuotaSeatAvailability,
  SearchInput,
} from "@/lib/types";
import type { TranslationVariables } from "@/lib/i18n";
import { useApp } from "./providers";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { getClassTranslationKey } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function availabilityKey(status: AvailabilityStatus) {
  return status === "AVAILABLE"
    ? "available"
    : status === "WAITLIST"
      ? "waitlist"
      : status.toLowerCase();
}

function availabilityVariant(status: AvailabilityStatus) {
  return status === "AVAILABLE"
    ? ("success" as const)
    : status === "RAC"
      ? ("warning" as const)
      : ("destructive" as const);
}

function seatAvailabilityText(
  t: (key: string, variables?: TranslationVariables) => string,
  availability: Pick<QuotaSeatAvailability, "status" | "number">,
) {
  if (availability.status === "AVAILABLE")
    return t("pages.checkout.confirm.seatsAvailable", {
      count: availability.number,
    });
  if (availability.status === "RAC")
    return t("pages.checkout.confirm.racPosition", {
      count: availability.number,
    });
  if (availability.status === "WAITLIST")
    return t("pages.checkout.confirm.waitlistPosition", {
      count: availability.number,
    });
  return t("components.journeyCard.notAvailable");
}

export interface CheckoutContext {
  journey: Journey;
  input: SearchInput;
  quota: string;
  passengers?: Passenger[];
}

function formatClockTime(value: string, locale: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function formatJourneyDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function hasValidQuotaClaims(passenger: Passenger) {
  return (
    (!passenger.claimForeignTourist ||
      Boolean(passenger.passportNumber?.trim())) &&
    (!passenger.claimDefence || Boolean(passenger.defenceServiceId?.trim())) &&
    (!passenger.claimDisability ||
      Boolean(passenger.disabilityCertificate?.trim())) &&
    (!passenger.claimRailwayEmployee ||
      Boolean(passenger.railwayEmployeeId?.trim()))
  );
}

function useCheckout() {
  const [context, setContext] = useState<CheckoutContext | null>(null);
  useEffect(
    () =>
      setContext(
        loadStorage<CheckoutContext | null>(storageKeys.checkout, null),
      ),
    [],
  );
  const update = (next: CheckoutContext) => {
    setContext(next);
    saveStorage(storageKeys.checkout, next);
  };
  return [context, update] as const;
}
export function CheckoutStepper({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useApp();
  const steps = [
    t("components.checkout.steps.confirm"),
    t("components.checkout.steps.passengers"),
    t("components.checkout.steps.payment"),
  ];
  const routes = ["/checkout", "/checkout/passengers", "/checkout/payment"];
  return (
    <div className="stepper" aria-label={t("components.checkout.progress")}>
      {steps.map((x, i) => (
        <div
          className={`step ${i + 1 === step ? "active" : i + 1 < step ? "done" : ""}`}
          key={x}
        >
          {i + 1 < step ? (
            <Link href={routes[i]} className="step-content">
              <span>
                <Check />
              </span>
              <strong>{x}</strong>
            </Link>
          ) : (
            <div className="step-content">
              <span>{i + 1}</span>
              <strong>{x}</strong>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function EmptyCheckout() {
  const { t } = useApp();
  return (
    <div className="card empty-state">
      <h2>{t("components.checkout.emptyTitle")}</h2>
      <p>{t("components.checkout.emptyText")}</p>
      <Button asChild>
        <Link href="/">{t("common.actions.startSearch")}</Link>
      </Button>
    </div>
  );
}
function Summary({
  context,
  action,
  label,
  quotaOverride,
  actionDisabled,
}: {
  context: CheckoutContext;
  action?: () => void;
  label?: string;
  quotaOverride?: string;
  actionDisabled?: boolean;
}) {
  const { locale: numberLocale, t } = useApp();
  const quotaId = quotaOverride ?? context.quota;
  const { discountRate, discount, serviceFee, gst, total } =
    calculateFareBreakdown(context.journey.totalFare, quotaId);
  return (
    <aside className="card summary-card">
      <h2>{t("components.checkout.summary")}</h2>
      <div className="route-line">
        <strong>{context.journey.origin.code}</strong>
        <span className="line" />
        <span>→</span>
        <span className="line" />
        <strong>{context.journey.destination.code}</strong>
      </div>
      <p>
        {context.journey.legs[0]?.serviceName} ·{" "}
        {context.input.travelClass === "ANY"
          ? context.journey.legs[0]?.travelClass
          : context.input.travelClass}
      </p>
      <div className="fare-lines">
        <div>
          <span>{t("components.checkout.ticketFare")}</span>
          <span>₹{context.journey.totalFare.toLocaleString(numberLocale)}</span>
        </div>
        {discount > 0 && (
          <div className="text-[#087a32]">
            <span>
              {t("components.checkout.quotaDiscount", {
                percent: Math.round(discountRate * 100),
              })}
            </span>
            <span>−₹{discount.toLocaleString(numberLocale)}</span>
          </div>
        )}
        <div>
          <span>{t("components.checkout.fee")}</span>
          <span>₹{serviceFee}</span>
        </div>
        <div>
          <span>{t("components.checkout.gst")}</span>
          <span>₹{gst}</span>
        </div>
        <div className="fare-total">
          <span>{t("components.checkout.total")}</span>
          <span>₹{total.toLocaleString(numberLocale)}</span>
        </div>
      </div>
      {action && (
        <Button className="w-full" disabled={actionDisabled} onClick={action}>
          {label}
        </Button>
      )}
      <p className="mt-2 ms-1 flex items-center gap-2 text-xs">
        <LockKeyhole size={14} /> {t("components.checkout.secure")}
      </p>
    </aside>
  );
}

export function ConfirmJourney() {
  const router = useRouter();
  const { locale, t } = useApp();
  const [context, update] = useCheckout();
  const [error, setError] = useState("");
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={1} />
        <EmptyCheckout />
      </div>
    );
  const classAvailability: ClassSeatAvailability[] = context.journey
    .classAvailability ?? [
    {
      travelClass:
        context.input.travelClass === "ANY"
          ? (context.journey.legs[0]?.travelClass ?? "SL")
          : context.input.travelClass,
      fare: context.journey.totalFare,
      status: context.journey.availability,
      number: context.journey.legs[0]?.availability?.number ?? 0,
      quotas: [],
    },
  ];
  const selectedAvailability =
    classAvailability.find(
      (item) => item.travelClass === context.input.travelClass,
    ) ?? classAvailability[0];
  const passengerCount = Math.max(
    1,
    context.input.adults + context.input.children,
  );
  const hasEnoughConfirmedSeats =
    selectedAvailability.status !== "AVAILABLE" ||
    selectedAvailability.number >= passengerCount;
  const updateClass = (travelClass: string) => {
    const availability = classAvailability.find(
      (item) => item.travelClass === travelClass,
    );
    if (!availability) return;
    setError("");
    update({
      ...context,
      input: { ...context.input, travelClass },
      journey: {
        ...context.journey,
        totalFare: availability.fare,
        availability: availability.status,
        legs: context.journey.legs.map((leg) => ({ ...leg, travelClass })),
      },
    });
  };
  const proceed = () => {
    if (selectedAvailability.status === "REGRET")
      return setError(t("pages.checkout.confirm.unavailable"));
    if (!hasEnoughConfirmedSeats)
      return setError(
        t("pages.checkout.confirm.insufficientSeats", {
          available: selectedAvailability.number,
          passengers: passengerCount,
        }),
      );
    router.push("/checkout/passengers");
  };
  return (
    <div className="page checkout-page">
      <CheckoutStepper step={1} />
      <div className="checkout-grid">
        <div className="checkout-main">
          <section className="card checkout-section">
            <div className="journey-top">
              <div>
                <h2>{context.journey.legs[0]?.serviceName}</h2>
                <p>
                  {formatJourneyDate(context.input.date, locale)} ·{" "}
                  {selectedAvailability.travelClass}
                </p>
              </div>
              <Badge
                variant={availabilityVariant(selectedAvailability.status)}
                className="justify-self-start self-start px-3 py-2 text-sm md:justify-self-end"
              >
                {selectedAvailability.status === "AVAILABLE" && <CircleCheck />}
                {selectedAvailability.status === "AVAILABLE"
                  ? t("pages.checkout.confirm.seatsAvailable", {
                      count: selectedAvailability.number,
                    })
                  : selectedAvailability.status === "RAC"
                    ? t("pages.checkout.confirm.racPosition", {
                        count: selectedAvailability.number,
                      })
                    : selectedAvailability.status === "WAITLIST"
                      ? t("pages.checkout.confirm.waitlistPosition", {
                          count: selectedAvailability.number,
                        })
                      : t(
                          `common.status.${availabilityKey(selectedAvailability.status)}`,
                        )}
              </Badge>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
              <div className="rounded-xl border border-[var(--line)] bg-[#f8faff] p-4">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                  <MapPin className="size-4" />
                  {t("components.journeyRoute.departure")}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3>{context.journey.origin.name}</h3>
                  <Badge variant="outline">{context.journey.origin.code}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <strong className="text-xl text-[var(--primary-dark)]">
                    {formatClockTime(context.journey.departure, locale)}
                  </strong>
                  <span className="text-sm text-[var(--muted)]">
                    {t("components.journeyRoute.platform", { platform: 1 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 px-1 text-center md:w-40">
                <span className="h-px flex-1 bg-[#b7c3dd]" />
                <Badge variant="secondary" className="whitespace-nowrap">
                  <Clock3 />
                  {formatDuration(context.journey.durationMinutes)}
                </Badge>
                <span className="h-px flex-1 bg-[#b7c3dd]" />
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[#f8faff] p-4 md:text-end">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)] md:justify-end">
                  <MapPin className="size-4" />
                  {t("components.journeyRoute.arrival")}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2 md:justify-end">
                  <h3>{context.journey.destination.name}</h3>
                  <Badge variant="outline">
                    {context.journey.destination.code}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 md:justify-end">
                  <strong className="text-xl text-[var(--primary-dark)]">
                    {formatClockTime(context.journey.arrival, locale)}
                  </strong>
                  <span className="text-sm text-[var(--muted)]">
                    {t("components.journeyRoute.platform", {
                      platform: 1 + context.journey.legs.length,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className="card checkout-section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3>{t("pages.checkout.confirm.travelClass")}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("pages.checkout.confirm.classAvailabilityNote", {
                    passengers: passengerCount,
                  })}
                </p>
              </div>
              <Badge variant="secondary">
                {t("pages.checkout.confirm.passengersSelected", {
                  count: passengerCount,
                })}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.3fr)] md:items-end">
              <label>
                {t("pages.checkout.confirm.changeClass")}
                <Select
                  value={selectedAvailability.travelClass}
                  onValueChange={updateClass}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classAvailability.map((item) => (
                      <SelectItem
                        key={item.travelClass}
                        value={item.travelClass}
                      >
                        {t(getClassTranslationKey(item.travelClass))} · ₹
                        {item.fare.toLocaleString(locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            {selectedAvailability.quotas.length > 0 && (
              <div className="mt-3 rounded-lg border border-[#cdd8ee] bg-[#f8faff] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">
                    {t("components.journeyCard.quotaAvailabilityFor", {
                      class: selectedAvailability.travelClass,
                    })}
                  </strong>
                  <span className="text-xs text-[var(--muted)]">
                    {t("components.journeyCard.quotaAvailabilityNote")}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
                  {selectedAvailability.quotas.map((quotaAvailability) => (
                    <div
                      className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-white px-2.5 py-2"
                      key={quotaAvailability.quotaId}
                    >
                      <span className="truncate text-xs font-semibold">
                        {t(
                          `common.quotas.${quotaAvailability.quotaId.toLowerCase()}.name`,
                        )}
                      </span>
                      <Badge
                        className="px-2 py-0.5 text-[11px]"
                        variant={availabilityVariant(quotaAvailability.status)}
                      >
                        {seatAvailabilityText(t, quotaAvailability)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("pages.checkout.confirm.autoQuotaNextStep")}
            </p>
          </section>
          <section className="card checkout-section">
            <h3>{t("pages.checkout.confirm.important")}</h3>
            <ul>
              <li>{t("pages.checkout.confirm.infoFare")}</li>
              <li>{t("pages.checkout.confirm.infoId")}</li>
              <li>{t("pages.checkout.confirm.infoFailure")}</li>
            </ul>
            {error && <p className="form-error">{error}</p>}
          </section>
        </div>
        <Summary
          context={context}
          action={proceed}
          actionDisabled={
            selectedAvailability.status === "REGRET" || !hasEnoughConfirmedSeats
          }
          label={t("pages.checkout.confirm.continue")}
        />
      </div>
    </div>
  );
}

const createPassengerSchema = (
  t: (key: string, variables?: TranslationVariables) => string,
) =>
  z
    .object({
      name: z.string().min(2, t("pages.checkout.passengers.nameError")),
      age: z.coerce
        .number()
        .int()
        .min(0, t("pages.checkout.passengers.ageNegative"))
        .max(120, t("pages.checkout.passengers.ageInvalid")),
      gender: z.enum(["female", "male", "other"]),
      citizenship: z
        .string()
        .min(2, t("pages.checkout.passengers.citizenshipError")),
      berth: z.string(),
      claimForeignTourist: z.boolean().optional(),
      passportNumber: z.string().optional(),
      claimDefence: z.boolean().optional(),
      defenceServiceId: z.string().optional(),
      claimDisability: z.boolean().optional(),
      disabilityCertificate: z.string().optional(),
      claimRailwayEmployee: z.boolean().optional(),
      railwayEmployeeId: z.string().optional(),
      saveForFuture: z.boolean().optional(),
    })
    .superRefine((values, refinement) => {
      const requiredClaims = [
        [
          values.claimForeignTourist,
          values.passportNumber,
          "passportNumber",
          "passportError",
        ],
        [
          values.claimDefence,
          values.defenceServiceId,
          "defenceServiceId",
          "defenceIdError",
        ],
        [
          values.claimDisability,
          values.disabilityCertificate,
          "disabilityCertificate",
          "disabilityCertificateError",
        ],
        [
          values.claimRailwayEmployee,
          values.railwayEmployeeId,
          "railwayEmployeeId",
          "employeeIdError",
        ],
      ] as const;

      requiredClaims.forEach(([claimed, detail, path, messageKey]) => {
        if (claimed && (!detail || detail.trim().length < 3)) {
          refinement.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: t(`pages.checkout.passengers.${messageKey}`),
          });
        }
      });

      if (values.claimForeignTourist && values.citizenship === "Indian") {
        refinement.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["passportNumber"],
          message: t("pages.checkout.passengers.foreignCitizenshipError"),
        });
      }
    });
type PassengerValues = z.infer<ReturnType<typeof createPassengerSchema>>;
const berthKeys: Record<string, string> = {
  "No preference": "none",
  Lower: "lower",
  Middle: "middle",
  Upper: "upper",
  "Side lower": "sideLower",
};
export function PassengerDetails() {
  const router = useRouter();
  const { t } = useApp();
  const { toast } = useToast();
  const schema = useMemo(() => createPassengerSchema(t), [t]);
  const [context, update] = useCheckout();
  const [saved, setSaved] = useState<Passenger[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PassengerValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      citizenship: "Indian",
      berth: "No preference",
      gender: "female",
      saveForFuture: true,
      claimForeignTourist: false,
      claimDefence: false,
      claimDisability: false,
      claimRailwayEmployee: false,
    },
  });

  const claimForeignTourist = watch("claimForeignTourist");
  const claimDefence = watch("claimDefence");
  const claimDisability = watch("claimDisability");
  const claimRailwayEmployee = watch("claimRailwayEmployee");
  useEffect(() => {
    const storedPassengers = savedPassengers();
    const checkoutPassengers = context?.passengers ?? [];
    const mergedPassengers = [
      ...storedPassengers,
      ...checkoutPassengers.filter(
        (passenger) =>
          !storedPassengers.some((stored) => stored.id === passenger.id),
      ),
    ];

    setSaved(mergedPassengers);
    if (checkoutPassengers.length)
      setSelected(checkoutPassengers.map((passenger) => passenger.id));
  }, [context?.passengers]);
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={2} />
        <EmptyCheckout />
      </div>
    );
  const capacity = context.input.adults + context.input.children;
  const selectedPeople = saved.filter((passenger) =>
    selected.includes(passenger.id),
  );
  const selectedClassAvailability = context.journey.classAvailability?.find(
    (item) => item.travelClass === context.input.travelClass,
  );
  const bestQuota = selectBestAvailableQuota(
    selectedPeople,
    context.input.mode,
    selectedClassAvailability?.quotas ?? [],
    selectedPeople.length,
  );
  const autoQuotaId = bestQuota.quotaId;
  const autoQuota = quotas.find((quota) => quota.quotaId === autoQuotaId);
  const preferredQuota = quotas.find(
    (quota) => quota.quotaId === bestQuota.preferredQuotaId,
  );
  const autoQuotaAvailability = selectedClassAvailability?.quotas.find(
    (item) => item.quotaId === autoQuotaId,
  );
  const selectedPassengersConfirmed = Boolean(
    selectedPeople.length > 0 &&
    autoQuotaAvailability?.status === "AVAILABLE" &&
    autoQuotaAvailability.number >= selectedPeople.length,
  );
  const passengerCountError = () =>
    toast({
      title: t("common.status.failure"),
      description: t("pages.checkout.passengers.selectExactly", {
        count: capacity,
      }),
      variant: "destructive",
      dismissLabel: t("common.actions.close"),
    });
  const togglePassenger = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((passengerId) => passengerId !== id));
      return;
    }
    if (selected.length >= capacity) {
      passengerCountError();
      return;
    }
    setSelected([...selected, id]);
  };
  const submit = (values: PassengerValues) => {
    const next: Passenger = {
      ...values,
      id: editing ?? `passenger-${Date.now()}`,
      saveForFuture: values.saveForFuture ?? false,
    };
    const all = editing
      ? saved.map((x) => (x.id === editing ? next : x))
      : [...saved, next];
    setSaved(all);
    if (next.saveForFuture) saveStorage(storageKeys.passengers, all);
    if (!selected.includes(next.id)) {
      if (selected.length >= capacity) passengerCountError();
      else setSelected([...selected, next.id]);
    }
    setEditing(null);
    reset({
      citizenship: "Indian",
      berth: "No preference",
      gender: "female",
      saveForFuture: true,
      claimForeignTourist: false,
      passportNumber: "",
      claimDefence: false,
      defenceServiceId: "",
      claimDisability: false,
      disabilityCertificate: "",
      claimRailwayEmployee: false,
      railwayEmployeeId: "",
      name: "",
      age: 18,
    });
  };
  const edit = (p: Passenger) => {
    setEditing(p.id);
    reset(p);
  };
  const remove = (id: string) => {
    const all = saved.filter((x) => x.id !== id);
    setSaved(all);
    setSelected(selected.filter((x) => x !== id));
    saveStorage(storageKeys.passengers, all);
  };
  const proceed = () => {
    const people = selectedPeople;
    if (people.length !== capacity) {
      passengerCountError();
      return;
    }
    const quota = selectBestAvailableQuota(
      people,
      context.input.mode,
      selectedClassAvailability?.quotas ?? [],
      people.length,
    ).quotaId;
    update({ ...context, quota, passengers: people });
    router.push("/checkout/payment");
  };
  return (
    <div className="page checkout-page">
      <CheckoutStepper step={2} />
      <div className="checkout-grid">
        <div className="checkout-main">
          <section className="card checkout-section">
            <Accordion type="single" collapsible>
              <AccordionItem value="saved-passengers" className="border-0">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <span className="flex items-center gap-2 text-2xl font-semibold">
                    {t("pages.checkout.passengers.saved")}
                    <Badge variant="outline">{saved.length}</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-5">
                  {saved.length ? (
                    <div className="passenger-cards">
                      {saved.map((p) => (
                        <div
                          className={`passenger-card ${selected.includes(p.id) ? "selected" : ""}`}
                          key={p.id}
                        >
                          <Checkbox
                            checked={selected.includes(p.id)}
                            onCheckedChange={() => togglePassenger(p.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <strong>{p.name}</strong>
                            <p className="muted">
                              {t("pages.checkout.passengers.passengerSummary", {
                                age: p.age,
                                gender: t(`common.gender.${p.gender}`),
                                berth: t(
                                  `common.berths.${berthKeys[p.berth] ?? "none"}`,
                                ),
                              })}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">
                                {t(
                                  `common.quotas.${selectEligibleQuota(
                                    [p],
                                    context.input.mode,
                                  ).toLowerCase()}.name`,
                                )}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => edit(p)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(p.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      {t("pages.checkout.passengers.noneSaved")}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {selectedPeople.length > 0 && autoQuota && (
              <div
                className={`mt-4 rounded-lg border p-3 ${
                  selectedPassengersConfirmed
                    ? "border-emerald-200 bg-emerald-50"
                    : autoQuotaAvailability?.status === "RAC"
                      ? "border-amber-200 bg-amber-50"
                      : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {t("pages.checkout.passengers.autoSelectedQuota")}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {t(
                          `common.quotas.${autoQuota.quotaId.toLowerCase()}.name`,
                        )}{" "}
                        · {autoQuota.shortName}
                      </Badge>
                      <span className="text-xs text-[var(--muted)]">
                        {selectedPeople.length}/{capacity}
                      </span>
                    </div>
                  </div>
                  {autoQuotaAvailability && (
                    <Badge
                      variant={availabilityVariant(
                        autoQuotaAvailability.status,
                      )}
                    >
                      {seatAvailabilityText(t, autoQuotaAvailability)}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm">
                  {bestQuota.usedFallback && preferredQuota
                    ? t("pages.checkout.passengers.quotaFallback", {
                        preferred: t(
                          `common.quotas.${preferredQuota.quotaId.toLowerCase()}.name`,
                        ),
                        selected: t(
                          `common.quotas.${autoQuota.quotaId.toLowerCase()}.name`,
                        ),
                      })
                    : !autoQuotaAvailability
                      ? t("pages.checkout.passengers.autoQuotaNote")
                      : selectedPassengersConfirmed
                        ? t("pages.checkout.confirm.enoughSeats", {
                            seats: autoQuotaAvailability.number,
                          })
                        : autoQuotaAvailability.status === "AVAILABLE"
                          ? t("pages.checkout.confirm.notEnoughSeats", {
                              seats: autoQuotaAvailability.number,
                              passengers: selectedPeople.length,
                            })
                          : t("pages.checkout.confirm.queueStatusNote")}
                </p>
                {bestQuota.usedFallback &&
                  autoQuotaAvailability &&
                  !selectedPassengersConfirmed && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {autoQuotaAvailability.status === "AVAILABLE"
                        ? t("pages.checkout.confirm.notEnoughSeats", {
                            seats: autoQuotaAvailability.number,
                            passengers: selectedPeople.length,
                          })
                        : t("pages.checkout.confirm.queueStatusNote")}
                    </p>
                  )}
              </div>
            )}
          </section>
          <section className="card checkout-section">
            <h2>
              {t(
                editing
                  ? "pages.checkout.passengers.edit"
                  : "pages.checkout.passengers.add",
              )}
            </h2>
            <form className="passenger-form" onSubmit={handleSubmit(submit)}>
              <label className="full">
                {t("common.fields.name")}
                <input
                  {...register("name")}
                  placeholder={t("pages.checkout.passengers.namePlaceholder")}
                />
                {errors.name && (
                  <span className="form-error">{errors.name.message}</span>
                )}
              </label>
              <label>
                {t("common.fields.age")}
                <input type="number" {...register("age")} />
                {errors.age && (
                  <span className="form-error">{errors.age.message}</span>
                )}
              </label>
              <label>
                {t("common.fields.gender")}
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">
                          {t("common.gender.female")}
                        </SelectItem>
                        <SelectItem value="male">
                          {t("common.gender.male")}
                        </SelectItem>
                        <SelectItem value="other">
                          {t("common.gender.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </label>
              <label>
                {t("common.fields.citizenship")}
                <Controller
                  control={control}
                  name="citizenship"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indian">
                          {t("pages.checkout.passengers.indian")}
                        </SelectItem>
                        <SelectItem value="Foreign national">
                          {t("pages.checkout.passengers.foreign")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </label>
              <label>
                {t("common.fields.berth")}
                <Controller
                  control={control}
                  name="berth"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No preference">
                          {t("common.berths.none")}
                        </SelectItem>
                        <SelectItem value="Lower">
                          {t("common.berths.lower")}
                        </SelectItem>
                        <SelectItem value="Middle">
                          {t("common.berths.middle")}
                        </SelectItem>
                        <SelectItem value="Upper">
                          {t("common.berths.upper")}
                        </SelectItem>
                        <SelectItem value="Side lower">
                          {t("common.berths.sideLower")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </label>
              <div className="full mt-2 grid gap-3 rounded-xl border border-[var(--line)] bg-[#f8faff] p-4">
                <div>
                  <h3>{t("pages.checkout.passengers.quotaClaims")}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("pages.checkout.passengers.quotaClaimsNote")}
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--line)] bg-white p-3">
                  <label className="check-row full m-0">
                    <Controller
                      control={control}
                      name="claimForeignTourist"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("pages.checkout.passengers.claimForeignTourist")}
                  </label>
                  {claimForeignTourist && (
                    <label className="mt-3">
                      {t("pages.checkout.passengers.passportNumber")}
                      <input {...register("passportNumber")} />
                      {errors.passportNumber && (
                        <span className="form-error">
                          {errors.passportNumber.message}
                        </span>
                      )}
                    </label>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--line)] bg-white p-3">
                  <label className="check-row full m-0">
                    <Controller
                      control={control}
                      name="claimDefence"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("pages.checkout.passengers.claimDefence")}
                  </label>
                  {claimDefence && (
                    <label className="mt-3">
                      {t("pages.checkout.passengers.defenceServiceId")}
                      <input {...register("defenceServiceId")} />
                      {errors.defenceServiceId && (
                        <span className="form-error">
                          {errors.defenceServiceId.message}
                        </span>
                      )}
                    </label>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--line)] bg-white p-3">
                  <label className="check-row full m-0">
                    <Controller
                      control={control}
                      name="claimDisability"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("pages.checkout.passengers.claimDisability")}
                  </label>
                  {claimDisability && (
                    <label className="mt-3">
                      {t("pages.checkout.passengers.disabilityCertificate")}
                      <input {...register("disabilityCertificate")} />
                      {errors.disabilityCertificate && (
                        <span className="form-error">
                          {errors.disabilityCertificate.message}
                        </span>
                      )}
                    </label>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--line)] bg-white p-3">
                  <label className="check-row full m-0">
                    <Controller
                      control={control}
                      name="claimRailwayEmployee"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("pages.checkout.passengers.claimRailwayEmployee")}
                  </label>
                  {claimRailwayEmployee && (
                    <label className="mt-3">
                      {t("pages.checkout.passengers.railwayEmployeeId")}
                      <input {...register("railwayEmployeeId")} />
                      {errors.railwayEmployeeId && (
                        <span className="form-error">
                          {errors.railwayEmployeeId.message}
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </div>
              <label className="check-row full">
                <Controller
                  control={control}
                  name="saveForFuture"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                {t("pages.checkout.passengers.saveFuture")}
              </label>
              <Button className="full" variant="secondary" type="submit">
                <Plus />
                {t(
                  editing
                    ? "pages.checkout.passengers.saveChanges"
                    : "pages.checkout.passengers.addPassenger",
                )}
              </Button>
            </form>
          </section>
        </div>
        <Summary
          context={context}
          action={proceed}
          label={t("pages.checkout.passengers.continue")}
          quotaOverride={autoQuotaId}
        />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
export function Payment() {
  const router = useRouter();
  const { locale: numberLocale, t, user } = useApp();
  const { toast } = useToast();
  const [context] = useCheckout();
  const [method, setMethod] = useState<"qr" | "upi" | "card">("qr");
  const [state, setState] = useState<
    | "idle"
    | "opening"
    | "processing"
    | "success"
    | "failure"
    | "cancelled"
    | "pending"
  >("idle");
  const [message, setMessage] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiIdTouched, setUpiIdTouched] = useState(false);
  const [qrPayment, setQrPayment] = useState<{
    id: string;
    imageUrl: string;
    closeBy: number;
    mock: boolean;
    amount?: number;
    signature?: string;
  } | null>(null);
  const [checkingQr, setCheckingQr] = useState(false);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCompletionRef = useRef(false);
  const lastPaymentToast = useRef("");
  useEffect(() => {
    if (
      state !== "success" &&
      state !== "failure" &&
      state !== "cancelled" &&
      state !== "pending"
    )
      return;
    if (state !== "success" && !message) return;
    const description = message || t("pages.checkout.payment.confirmed");
    const toastKey = `${state}:${description}`;
    if (lastPaymentToast.current === toastKey) return;
    lastPaymentToast.current = toastKey;
    toast({
      title: t(`common.status.${state}`),
      description,
      variant:
        state === "success"
          ? "success"
          : state === "pending"
            ? "warning"
            : "destructive",
      dismissLabel: t("common.actions.close"),
    });
  }, [message, state, t, toast]);
  useEffect(
    () => () => {
      if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    },
    [],
  );
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={3} />
        <EmptyCheckout />
      </div>
    );
  const expectedPassengers = context.input.adults + context.input.children;
  const passengerInformationValid = Boolean(
    context.passengers?.length === expectedPassengers &&
    context.passengers.every(hasValidQuotaClaims),
  );
  if (!passengerInformationValid)
    return (
      <div className="page">
        <CheckoutStepper step={3} />
        <div className="card empty-state">
          <h2>{t("pages.checkout.payment.passengerInfoRequired")}</h2>
          <p>{t("pages.checkout.payment.passengerInfoRequiredText")}</p>
          <Button asChild>
            <Link href="/checkout/passengers">
              {t("pages.checkout.payment.returnToPassengers")}
            </Link>
          </Button>
        </div>
      </div>
    );
  const fareBreakdown = calculateFareBreakdown(
    context.journey.totalFare,
    context.quota,
  );
  const amount = fareBreakdown.total;
  const normalizedUpiId = upiId.trim().toLowerCase();
  const upiIdValid = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i.test(
    normalizedUpiId,
  );
  const finish = async () => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = null;
    setState("processing");
    const booking: Booking = {
      bookingId: `booking-${Date.now()}`,
      pnr: makePnr(),
      userId: user?.id ?? "prototype-user",
      journey: context.journey,
      date: context.input.date,
      passengers: context.passengers ?? [],
      travelClass: context.input.travelClass,
      quota: context.quota,
      fare: amount,
      fareBreakdown: {
        baseFare: context.journey.totalFare,
        ...fareBreakdown,
      },
      paymentStatus: "paid",
      bookingStatus: "upcoming",
      createdAt: new Date().toISOString(),
    };
    saveStorage(storageKeys.bookings, [booking, ...savedBookings()]);
    setState("success");
    setTimeout(() => router.push(`/booking/${booking.pnr}`), 700);
  };
  const pay = async () => {
    if (method === "upi" && !upiIdValid) {
      setUpiIdTouched(true);
      setState("failure");
      setMessage(t("pages.checkout.payment.upiIdError"));
      return;
    }
    setState("opening");
    setMessage("");
    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `railease-${Date.now()}`,
        }),
      });
      const order = (await res.json()) as {
        id?: string;
        mock?: boolean;
        error?: string;
      };
      if (!res.ok)
        throw new Error(order.error ?? t("pages.checkout.payment.createError"));
      if (order.mock) {
        setState("pending");
        setMessage(t("pages.checkout.payment.noCredentials"));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        setState("processing");
        const checkout = new window.Razorpay!({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amount * 100,
          currency: "INR",
          order_id: order.id,
          name: "RailEase",
          description: t("pages.checkout.payment.description"),
          prefill:
            method === "upi"
              ? {
                  email: user?.email,
                  method: "upi",
                  vpa: normalizedUpiId,
                }
              : { email: user?.email, method: "card" },
          notes:
            method === "upi" ? { test_upi_id: normalizedUpiId } : undefined,
          config: {
            display: {
              sequence: [method],
              preferences: { show_default_blocks: false },
            },
          },
          theme: { color: "#0b57d0" },
          handler: async (response: Record<string, string>) => {
            const verified = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            if (!verified.ok) {
              setState("failure");
              setMessage(t("pages.checkout.payment.verifyError"));
              return;
            }
            await finish();
          },
          modal: {
            ondismiss: () => {
              setState("cancelled");
              setMessage(t("pages.checkout.payment.cancelled"));
            },
          },
        });
        checkout.open();
      };
      script.onerror = () => {
        setState("failure");
        setMessage(t("pages.checkout.payment.openError"));
      };
      document.body.appendChild(script);
    } catch (error) {
      setState("failure");
      setMessage(
        error instanceof Error
          ? error.message
          : t("pages.checkout.payment.startError"),
      );
    }
  };

  const createQr = async () => {
    qrCompletionRef.current = false;
    setState("opening");
    setMessage("");
    setQrPayment(null);
    try {
      const response = await fetch("/api/razorpay/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `railease-${Date.now()}`,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        imageUrl?: string;
        closeBy?: number;
        mock?: boolean;
        amount?: number;
        signature?: string;
        error?: string;
      };
      if (
        !response.ok ||
        !result.id ||
        !result.imageUrl ||
        !result.closeBy ||
        (!result.mock && (!result.amount || !result.signature))
      )
        throw new Error(
          result.error ?? t("pages.checkout.payment.qrCreateError"),
        );
      const paymentSession = {
        id: result.id,
        imageUrl: result.imageUrl,
        closeBy: result.closeBy,
        mock: Boolean(result.mock),
        amount: result.amount,
        signature: result.signature,
      };
      setQrPayment(paymentSession);
      setState("pending");
      setMessage(
        result.mock
          ? t("pages.checkout.payment.qrMockMessage")
          : t("pages.checkout.payment.qrWaiting"),
      );
      if (!paymentSession.mock) startQrPolling(paymentSession);
    } catch (error) {
      setState("failure");
      setMessage(
        error instanceof Error
          ? error.message
          : t("pages.checkout.payment.qrCreateError"),
      );
    }
  };

  const checkQrStatus = async (paymentSession = qrPayment, silent = false) => {
    if (
      !paymentSession ||
      paymentSession.mock ||
      !paymentSession.amount ||
      !paymentSession.signature
    )
      return;
    if (!silent) {
      setCheckingQr(true);
      setMessage("");
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
        setState("failure");
        setMessage(t("pages.checkout.payment.qrExpired"));
        return;
      }
      if (!response.ok)
        throw new Error(
          result.error ?? t("pages.checkout.payment.qrStatusError"),
        );
      if (result.paid) {
        if (qrCompletionRef.current) return;
        qrCompletionRef.current = true;
        if (qrPollingRef.current) clearInterval(qrPollingRef.current);
        qrPollingRef.current = null;
        await finish();
        return;
      }
      if (!silent) {
        setState("pending");
        setMessage(t("pages.checkout.payment.qrNotReceived"));
      }
    } catch (error) {
      if (!silent) {
        setState("failure");
        setMessage(
          error instanceof Error
            ? error.message
            : t("pages.checkout.payment.qrStatusError"),
        );
      }
    } finally {
      if (!silent) setCheckingQr(false);
    }
  };

  const startQrPolling = (paymentSession: NonNullable<typeof qrPayment>) => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = setInterval(() => {
      void checkQrStatus(paymentSession, true);
    }, 3000);
  };

  const busy =
    state === "opening" ||
    state === "processing" ||
    state === "success" ||
    checkingQr;
  const selectMethod = (nextMethod: "qr" | "upi" | "card") => {
    if (qrPollingRef.current) clearInterval(qrPollingRef.current);
    qrPollingRef.current = null;
    qrCompletionRef.current = false;
    setMethod(nextMethod);
    setState("idle");
    setMessage("");
    setUpiIdTouched(false);
    if (nextMethod !== "qr") setQrPayment(null);
  };
  const paymentMethods = [
    {
      id: "qr" as const,
      title: t("pages.checkout.payment.qr"),
      text: t("pages.checkout.payment.qrText"),
      icon: QrCode,
    },
    {
      id: "upi" as const,
      title: t("pages.checkout.payment.upi"),
      text: t("pages.checkout.payment.upiText"),
      icon: Smartphone,
    },
    {
      id: "card" as const,
      title: t("pages.checkout.payment.card"),
      text: t("pages.checkout.payment.cardText"),
      icon: CreditCard,
    },
  ];
  return (
    <div className="page checkout-page">
      <CheckoutStepper step={3} />
      <div className="checkout-grid">
        <div className="checkout-main">
          <h1>{t("pages.checkout.payment.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("pages.checkout.payment.subtitle")}
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-blue-700 shadow-sm">
              <ShieldCheck size={19} />
            </span>
            <div>
              <strong className="block">
                {t("pages.checkout.payment.testMode")}
              </strong>
              <p className="mt-0.5 text-blue-900/75">
                {t("pages.checkout.payment.secureText")}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {paymentMethods.map((paymentMethod) => {
              const Icon = paymentMethod.icon;
              const selected = method === paymentMethod.id;
              return (
                <Button
                  key={paymentMethod.id}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  className={`h-auto min-h-28 justify-start gap-3 rounded-2xl p-4 text-start whitespace-normal ${
                    selected
                      ? "border-2 border-blue-600 bg-blue-50 text-blue-950 hover:bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                  }`}
                  onClick={() => selectMethod(paymentMethod.id)}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {paymentMethod.title}
                      {selected && <CircleCheck size={17} />}
                    </span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                      {paymentMethod.text}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>

          {method === "qr" ? (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {t("pages.checkout.payment.qrTitle")}
                    </h2>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {t("pages.checkout.payment.testMode")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("pages.checkout.payment.qrInstructions")}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="w-fit px-3 py-1 text-base"
                >
                  ₹{amount.toLocaleString(numberLocale)}
                </Badge>
              </div>

              {qrPayment ? (
                <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:items-center">
                  <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mx-0">
                    <Image
                      src={qrPayment.imageUrl}
                      alt={t("pages.checkout.payment.qrAlt")}
                      className="size-48 object-contain"
                    />
                  </div>
                  <div className="text-center sm:text-start">
                    <div className="mb-4 flex justify-center gap-2 sm:justify-start">
                      <Badge variant="outline">
                        {qrPayment.mock
                          ? t("pages.checkout.payment.mockQr")
                          : t("pages.checkout.payment.razorpayQr")}
                      </Badge>
                      <Badge variant="outline">
                        {t("pages.checkout.payment.singleUse")}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-900">
                      {t("pages.checkout.payment.scanWithUpi")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("pages.checkout.payment.expiresAt", {
                        time: new Intl.DateTimeFormat(numberLocale, {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }).format(new Date(qrPayment.closeBy * 1000)),
                      })}
                    </p>
                    {!qrPayment.mock && (
                      <Button
                        className="mt-4 w-full sm:w-auto"
                        variant="secondary"
                        disabled={checkingQr}
                        onClick={() => checkQrStatus()}
                      >
                        {checkingQr && (
                          <LoaderCircle className="animate-spin" size={16} />
                        )}
                        {checkingQr
                          ? t("pages.checkout.payment.checkingQr")
                          : t("pages.checkout.payment.checkQrStatus")}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center px-5 py-8 text-center">
                  <span className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <QrCode size={32} />
                  </span>
                  <p className="mt-4 max-w-md text-sm text-slate-500">
                    {t("pages.checkout.payment.generateQrText")}
                  </p>
                  <Button className="mt-4" disabled={busy} onClick={createQr}>
                    {state === "opening" && (
                      <LoaderCircle className="animate-spin" size={16} />
                    )}
                    {state === "opening"
                      ? t("pages.checkout.payment.generatingQr")
                      : t("pages.checkout.payment.generateQr")}
                  </Button>
                </div>
              )}
            </section>
          ) : method === "upi" ? (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start gap-4 border-b border-slate-100 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Smartphone size={22} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {t("pages.checkout.payment.upiCheckoutTitle")}
                    </h2>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {t("pages.checkout.payment.testOnly")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {t("pages.checkout.payment.upiIdTestNote")}
                  </p>
                </div>
              </div>
              <div className="p-5">
                <label
                  className="mb-2 block text-sm font-medium text-slate-800"
                  htmlFor="checkout-upi-id"
                >
                  {t("pages.checkout.payment.upiId")}
                </label>
                <div className="relative">
                  <Smartphone
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    id="checkout-upi-id"
                    dir="ltr"
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={upiId}
                    aria-invalid={upiIdTouched && !upiIdValid}
                    aria-describedby="checkout-upi-help checkout-upi-error"
                    placeholder={t("pages.checkout.payment.upiIdPlaceholder")}
                    className={`h-12 w-full rounded-xl border bg-white pe-4 ps-10 text-sm outline-none transition focus:ring-2 ${
                      upiIdTouched && !upiIdValid
                        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                    }`}
                    onBlur={() => setUpiIdTouched(true)}
                    onChange={(event) => {
                      setUpiId(event.target.value);
                      setMessage("");
                      if (state === "failure") setState("idle");
                    }}
                  />
                </div>
                {upiIdTouched && !upiIdValid ? (
                  <p
                    id="checkout-upi-error"
                    className="mt-2 text-sm text-red-600"
                  >
                    {t("pages.checkout.payment.upiIdError")}
                  </p>
                ) : (
                  <p
                    id="checkout-upi-help"
                    className="mt-2 text-xs text-slate-500"
                  >
                    {t("pages.checkout.payment.upiIdHelp")}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["success@razorpay", "testSuccess"],
                    ["failure@razorpay", "testFailure"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUpiId(value);
                        setUpiIdTouched(true);
                        setState("idle");
                        setMessage("");
                      }}
                    >
                      {t(`pages.checkout.payment.${label}`)}
                    </Button>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  {t("pages.checkout.payment.upiCollectNotice")}
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-5 flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <CreditCard size={22} />
              </span>
              <div>
                <h2 className="font-semibold">
                  {t("pages.checkout.payment.cardCheckoutTitle")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t("pages.checkout.payment.standardCheckoutNote")}
                </p>
              </div>
            </section>
          )}

          {state === "pending" &&
            ((method === "qr" && qrPayment?.mock) ||
              (method !== "qr" &&
                message === t("pages.checkout.payment.noCredentials"))) && (
              <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                <Button size="sm" onClick={() => finish()}>
                  {t("pages.checkout.payment.simulateSuccess")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setState("failure");
                    setMessage(t("pages.checkout.payment.failed"));
                  }}
                >
                  {t("pages.checkout.payment.simulateFailure")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setState("cancelled");
                    setMessage(t("pages.checkout.payment.testCancelled"));
                  }}
                >
                  {t("pages.checkout.payment.simulateCancel")}
                </Button>
              </div>
            )}
        </div>
        <Summary
          context={context}
          action={
            method === "qr"
              ? qrPayment && !qrPayment.mock
                ? () => checkQrStatus()
                : createQr
              : pay
          }
          actionDisabled={busy || (method === "qr" && Boolean(qrPayment?.mock))}
          label={
            busy
              ? t("pages.checkout.payment.processing")
              : method === "qr"
                ? qrPayment
                  ? t("pages.checkout.payment.checkQrStatus")
                  : t("pages.checkout.payment.generateQrAmount", {
                      amount: amount.toLocaleString(numberLocale),
                    })
                : t("pages.checkout.payment.pay", {
                    amount: amount.toLocaleString(numberLocale),
                  })
          }
        />
      </div>
    </div>
  );
}
