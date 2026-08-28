"use client";

import {
  BusFront,
  Footprints,
  Plane,
  Ship,
  TrainFront,
  type LucideIcon,
} from "lucide-react";

import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/journey-utils";
import type { Journey, JourneyLeg, TransportMode } from "@/lib/types";

const modeIcons: Record<TransportMode, LucideIcon> = {
  train: TrainFront,
  metro: TrainFront,
  bus: BusFront,
  ship: Ship,
  plane: Plane,
  walk: Footprints,
};

function departurePlatform(index: number) {
  return 1 + ((index * 2) % 8);
}

function arrivalPlatform(index: number) {
  return 1 + ((index * 2 + 1) % 8);
}

function TransferBadges({
  leg,
  nextLeg,
  index,
}: {
  leg: JourneyLeg;
  nextLeg?: JourneyLeg;
  index: number;
}) {
  const { t } = useApp();
  if (!nextLeg) return null;

  if (nextLeg.mode !== leg.mode) {
    return (
      <Badge variant="secondary">
        {t("components.journeyRoute.takeMode", {
          mode: t(`components.journeyRoute.modes.${nextLeg.mode}`),
        })}
      </Badge>
    );
  }

  return (
    <>
      <Badge variant="warning">
        {t("components.journeyRoute.layover", { duration: "45m" })}
      </Badge>
      <Badge variant="outline">
        {t("components.journeyRoute.platformTransfer", {
          from: arrivalPlatform(index),
          to: departurePlatform(index + 1),
        })}
      </Badge>
    </>
  );
}

function StopDetails({
  leg,
  index,
  kind,
}: {
  leg: JourneyLeg;
  index: number;
  kind: "departure" | "arrival";
}) {
  const { t } = useApp();
  const station = kind === "departure" ? leg.from : leg.to;
  const time = kind === "departure" ? leg.departure : leg.arrival;
  const platform =
    kind === "departure" ? departurePlatform(index) : arrivalPlatform(index);

  return (
    <div className="min-w-0">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        {t(`components.journeyRoute.${kind}`)}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h3>{station.name}</h3>
        <Badge variant="outline">{station.code}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <strong className="text-lg text-[var(--primary-dark)]">{time}</strong>
        <span>{t("components.journeyRoute.platform", { platform })}</span>
      </div>
    </div>
  );
}

function VerticalRoute({ journey }: { journey: Journey }) {
  const { t } = useApp();
  const firstLeg = journey.legs[0];
  if (!firstLeg) return null;

  return (
    <div className="mt-5 max-w-3xl">
      <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3">
        <div className="relative flex justify-center pt-2">
          <span className="absolute bottom-0 left-1/2 top-[14px] w-0.5 -translate-x-1/2 bg-[#b7c3dd]" />
          <span className="relative z-10 size-3 rounded-full bg-[var(--primary)] ring-4 ring-[#e8efff]" />
        </div>
        <StopDetails leg={firstLeg} index={0} kind="departure" />
      </div>

      {journey.legs.map((leg, index) => {
        const Icon = modeIcons[leg.mode];
        const nextLeg = journey.legs[index + 1];

        return (
          <div key={leg.id}>
            <div className="grid min-h-24 grid-cols-[42px_minmax(0,1fr)] gap-3">
              <div className="relative flex justify-center">
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#b7c3dd]" />
                <span className="relative my-auto grid size-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)] shadow-sm">
                  <Icon aria-hidden="true" />
                </span>
              </div>
              <div className="my-auto flex flex-wrap items-center gap-2 rounded-lg bg-[#f7f9fc] px-4 py-3">
                <strong>
                  {t(`components.journeyRoute.modes.${leg.mode}`)}
                </strong>
                <span className="text-[var(--muted)]">{leg.serviceName}</span>
                <Badge variant="secondary">
                  {t("components.journeyRoute.travelTime", {
                    duration: formatDuration(leg.durationMinutes),
                  })}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3">
              <div className="relative flex justify-center pt-2">
                <span
                  className={`absolute left-1/2 top-0 w-0.5 -translate-x-1/2 bg-[#b7c3dd] ${
                    nextLeg ? "bottom-0" : "h-[14px]"
                  }`}
                />
                <span className="relative z-10 size-3 rounded-full border-[3px] border-[var(--primary)] bg-white" />
              </div>
              <div className="pb-2">
                <StopDetails leg={leg} index={index} kind="arrival" />
                {nextLeg && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TransferBadges leg={leg} nextLeg={nextLeg} index={index} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalRoute({ journey }: { journey: Journey }) {
  const { t } = useApp();
  const firstLeg = journey.legs[0];
  if (!firstLeg) return null;

  return (
    <div className="mt-5 overflow-x-auto pb-3">
      <div className="flex w-max min-w-full items-stretch">
        <div className="w-52 shrink-0 rounded-xl border border-[var(--line)] bg-white p-4">
          <StopDetails leg={firstLeg} index={0} kind="departure" />
        </div>

        {journey.legs.map((leg, index) => {
          const Icon = modeIcons[leg.mode];
          const nextLeg = journey.legs[index + 1];

          return (
            <div className="flex items-stretch" key={leg.id}>
              <div className="flex w-44 shrink-0 flex-col items-center justify-center px-3 text-center">
                <div className="flex w-full items-center">
                  <span className="h-0.5 flex-1 bg-[#b7c3dd]" />
                  <span className="grid size-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)] shadow-sm">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="h-0.5 flex-1 bg-[#b7c3dd]" />
                </div>
                <strong className="mt-2 text-sm">
                  {t(`components.journeyRoute.modes.${leg.mode}`)}
                </strong>
                <span className="text-xs text-[var(--muted)]">
                  {formatDuration(leg.durationMinutes)}
                </span>
              </div>
              <div className="w-52 shrink-0 rounded-xl border border-[var(--line)] bg-white p-4">
                <StopDetails leg={leg} index={index} kind="arrival" />
                {nextLeg && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <TransferBadges leg={leg} nextLeg={nextLeg} index={index} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JourneyRoute({
  journey,
  orientation = "vertical",
}: {
  journey: Journey;
  orientation?: "vertical" | "horizontal";
}) {
  return orientation === "horizontal" ? (
    <HorizontalRoute journey={journey} />
  ) : (
    <VerticalRoute journey={journey} />
  );
}
