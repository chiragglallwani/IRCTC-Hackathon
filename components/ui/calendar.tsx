"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold",
        nav: "absolute inset-x-3 top-3 flex items-center justify-between",
        button_previous:
          "grid h-9 w-9 place-items-center rounded-md border border-[var(--line)] bg-white hover:bg-brand-50 disabled:opacity-50",
        button_next:
          "grid h-9 w-9 place-items-center rounded-md border border-[var(--line)] bg-white hover:bg-brand-50 disabled:opacity-50",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-center text-xs font-medium text-[var(--muted)]",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button:
          "grid h-9 w-9 place-items-center rounded-md hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf47]",
        selected:
          "[&_button]:bg-brand-600 [&_button]:text-white [&_button]:hover:bg-brand-700",
        today: "[&_button]:border [&_button]:border-brand-600",
        outside: "text-[var(--muted)] opacity-50",
        disabled: "pointer-events-none opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClassName, orientation }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : orientation === "up"
                  ? ChevronUp
                  : ChevronDown;
          return <Icon className={cn("h-4 w-4", iconClassName)} />;
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
