"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Check,
  CircleCheck,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { quotas } from "@/lib/data";
import { quotaEligibility } from "@/lib/search";
import {
  loadStorage,
  makePnr,
  saveStorage,
  savedBookings,
  savedPassengers,
  storageKeys,
} from "@/lib/storage";
import type { Booking, Journey, Passenger, SearchInput } from "@/lib/types";
import type { TranslationVariables } from "@/lib/i18n";
import { useApp } from "./providers";

export interface CheckoutContext {
  journey: Journey;
  input: SearchInput;
  quota: string;
  passengers?: Passenger[];
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
  return (
    <div className="stepper" aria-label={t("components.checkout.progress")}>
      {steps.map((x, i) => (
        <div
          className={`step ${i + 1 === step ? "active" : i + 1 < step ? "done" : ""}`}
          key={x}
        >
          <span>{i + 1 < step ? <Check /> : i + 1}</span>
          <strong>{x}</strong>
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
      <Link className="btn btn-primary" href="/">
        {t("common.actions.startSearch")}
      </Link>
    </div>
  );
}
function Summary({
  context,
  action,
  label,
}: {
  context: CheckoutContext;
  action?: () => void;
  label?: string;
}) {
  const { language, t } = useApp();
  const numberLocale = language === "hi" ? "hi-IN" : "en-IN";
  const serviceFee = Math.round(context.journey.totalFare * 0.035);
  const gst = Math.round(context.journey.totalFare * 0.05);
  const total = context.journey.totalFare + serviceFee + gst;
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
        <button className="btn btn-primary w-full" onClick={action}>
          {label}
        </button>
      )}
      <p className="microcopy">
        <LockKeyhole size={14} /> {t("components.checkout.secure")}
      </p>
    </aside>
  );
}

export function ConfirmJourney() {
  const router = useRouter();
  const { t } = useApp();
  const [context, update] = useCheckout();
  const [error, setError] = useState("");
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={1} />
        <EmptyCheckout />
      </div>
    );
  const quota = quotas.find((q) => q.quotaId === context.quota);
  const proceed = () => {
    if (context.journey.availability === "REGRET")
      return setError(t("pages.checkout.confirm.unavailable"));
    if (!context.quota)
      return setError(t("pages.checkout.confirm.selectQuota"));
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
                  {context.input.date} · {context.journey.legs[0]?.travelClass}
                </p>
              </div>
              <span className="badge badge-success">
                <CircleCheck /> {context.journey.availability}
              </span>
            </div>
            <div className="route-line">
              <strong>
                {context.journey.departure}
                <small>{context.journey.origin.name}</small>
              </strong>
              <span className="line" />
              <span>{Math.round(context.journey.durationMinutes / 60)}h</span>
              <span className="line" />
              <strong>
                {context.journey.arrival}
                <small>{context.journey.destination.name}</small>
              </strong>
            </div>
          </section>
          <section className="card checkout-section">
            <h3>{t("pages.checkout.confirm.classQuota")}</h3>
            <div className="passenger-form">
              <label>
                {t("pages.checkout.confirm.travelClass")}
                <select
                  value={context.input.travelClass}
                  onChange={(e) =>
                    update({
                      ...context,
                      input: { ...context.input, travelClass: e.target.value },
                    })
                  }
                >
                  <option value="ANY">{t("common.classes.best")}</option>
                  {["1A", "2A", "3A", "CC", "SL"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("common.fields.quota")}
                <select
                  value={context.quota}
                  onChange={(e) =>
                    update({ ...context, quota: e.target.value })
                  }
                >
                  {quotas.map((q) => (
                    <option key={q.quotaId} value={q.quotaId}>
                      {t(`common.quotas.${q.quotaId.toLowerCase()}.name`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="muted">
              <ShieldCheck size={18} />{" "}
              {t("pages.checkout.confirm.eligibility", {
                description: quota
                  ? t(
                      `common.quotas.${quota.quotaId.toLowerCase()}.description`,
                    )
                  : "",
              })}
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
          label={t("pages.checkout.confirm.continue")}
        />
      </div>
    </div>
  );
}

const createPassengerSchema = (
  t: (key: string, variables?: TranslationVariables) => string,
) =>
  z.object({
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
    saveForFuture: z.boolean().optional(),
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
  const schema = useMemo(() => createPassengerSchema(t), [t]);
  const [context, update] = useCheckout();
  const [saved, setSaved] = useState<Passenger[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PassengerValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      citizenship: "Indian",
      berth: "No preference",
      gender: "female",
      saveForFuture: true,
    },
  });
  useEffect(() => {
    setSaved(savedPassengers());
  }, []);
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={2} />
        <EmptyCheckout />
      </div>
    );
  const capacity = context.input.adults + context.input.children;
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
    if (!selected.includes(next.id)) setSelected([...selected, next.id]);
    setEditing(null);
    reset({
      citizenship: "Indian",
      berth: "No preference",
      gender: "female",
      saveForFuture: true,
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
    const people = saved
      .filter((x) => selected.includes(x.id))
      .slice(0, capacity);
    if (people.length !== capacity)
      return setQuotaError(
        t("pages.checkout.passengers.selectExactly", { count: capacity }),
      );
    if (!quotaEligibility(context.quota, people))
      return setQuotaError(t("pages.checkout.passengers.quotaError"));
    update({ ...context, passengers: people });
    router.push("/checkout/payment");
  };
  return (
    <div className="page checkout-page">
      <CheckoutStepper step={2} />
      <div className="checkout-grid">
        <div className="checkout-main">
          <section className="card checkout-section">
            <h2>{t("pages.checkout.passengers.saved")}</h2>
            {saved.length ? (
              <div className="passenger-cards">
                {saved.map((p) => (
                  <div
                    className={`passenger-card ${selected.includes(p.id) ? "selected" : ""}`}
                    key={p.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(p.id)
                            ? selected.filter((x) => x !== p.id)
                            : [...selected, p.id],
                        )
                      }
                    />
                    <div>
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
                    </div>
                    <button className="icon-btn" onClick={() => edit(p)}>
                      <Pencil />
                    </button>
                    <button className="icon-btn" onClick={() => remove(p.id)}>
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                {t("pages.checkout.passengers.noneSaved")}
              </p>
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
                <select {...register("gender")}>
                  <option value="female">{t("common.gender.female")}</option>
                  <option value="male">{t("common.gender.male")}</option>
                  <option value="other">{t("common.gender.other")}</option>
                </select>
              </label>
              <label>
                {t("common.fields.citizenship")}
                <select {...register("citizenship")}>
                  <option value="Indian">
                    {t("pages.checkout.passengers.indian")}
                  </option>
                  <option value="Foreign national">
                    {t("pages.checkout.passengers.foreign")}
                  </option>
                </select>
              </label>
              <label>
                {t("common.fields.berth")}
                <select {...register("berth")}>
                  <option value="No preference">
                    {t("common.berths.none")}
                  </option>
                  <option value="Lower">{t("common.berths.lower")}</option>
                  <option value="Middle">{t("common.berths.middle")}</option>
                  <option value="Upper">{t("common.berths.upper")}</option>
                  <option value="Side lower">
                    {t("common.berths.sideLower")}
                  </option>
                </select>
              </label>
              <label className="check-row full">
                <input type="checkbox" {...register("saveForFuture")} />
                {t("pages.checkout.passengers.saveFuture")}
              </label>
              <button className="btn btn-secondary full" type="submit">
                <Plus />
                {t(
                  editing
                    ? "pages.checkout.passengers.saveChanges"
                    : "pages.checkout.passengers.addPassenger",
                )}
              </button>
            </form>
            {quotaError && <p className="form-error">{quotaError}</p>}
          </section>
        </div>
        <Summary
          context={context}
          action={proceed}
          label={t("pages.checkout.passengers.continue")}
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
  const { language, t, user } = useApp();
  const [context] = useCheckout();
  const [method, setMethod] = useState("upi");
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
  if (!context)
    return (
      <div className="page">
        <CheckoutStepper step={3} />
        <EmptyCheckout />
      </div>
    );
  const amount =
    context.journey.totalFare + Math.round(context.journey.totalFare * 0.085);
  const finish = async () => {
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
      paymentStatus: "paid",
      bookingStatus: "upcoming",
      createdAt: new Date().toISOString(),
    };
    saveStorage(storageKeys.bookings, [booking, ...savedBookings()]);
    setState("success");
    setTimeout(() => router.push(`/booking/${booking.pnr}`), 700);
  };
  const pay = async () => {
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
  return (
    <div className="page checkout-page">
      <CheckoutStepper step={3} />
      <div className="checkout-grid">
        <div className="checkout-main">
          <h1>{t("pages.checkout.payment.title")}</h1>
          <div className="card checkout-section">
            <p>
              <LockKeyhole /> {t("pages.checkout.payment.secureText")}
            </p>
          </div>
          <div className="payment-options">
            <button
              className={`payment-option ${method === "upi" ? "selected" : ""}`}
              onClick={() => setMethod("upi")}
            >
              <strong>{t("pages.checkout.payment.upi")}</strong>
              <p>{t("pages.checkout.payment.upiText")}</p>
            </button>
            <button
              className={`payment-option ${method === "card" ? "selected" : ""}`}
              onClick={() => setMethod("card")}
            >
              <strong>{t("pages.checkout.payment.card")}</strong>
              <p>{t("pages.checkout.payment.cardText")}</p>
            </button>
          </div>
          {state !== "idle" && (
            <div
              className={`payment-state ${state === "success" ? "success" : state === "failure" ? "error" : ""}`}
            >
              <strong>{t(`common.status.${state}`)}</strong>
              <p>
                {message ||
                  (state === "opening"
                    ? t("pages.checkout.payment.opening")
                    : state === "processing"
                      ? t("pages.checkout.payment.verifying")
                      : t("pages.checkout.payment.confirmed"))}
              </p>
              {state === "pending" && (
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => finish()}>
                    {t("pages.checkout.payment.simulateSuccess")}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setState("failure");
                      setMessage(t("pages.checkout.payment.failed"));
                    }}
                  >
                    {t("pages.checkout.payment.simulateFailure")}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setState("cancelled");
                      setMessage(t("pages.checkout.payment.testCancelled"));
                    }}
                  >
                    {t("pages.checkout.payment.simulateCancel")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Summary
          context={context}
          action={pay}
          label={
            state === "opening" || state === "processing"
              ? t("pages.checkout.payment.processing")
              : t("pages.checkout.payment.pay", {
                  amount: amount.toLocaleString(
                    language === "hi" ? "hi-IN" : "en-IN",
                  ),
                })
          }
        />
      </div>
    </div>
  );
}
