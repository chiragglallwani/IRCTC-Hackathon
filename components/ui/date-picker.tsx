"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { enIN, hi } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}

function formatValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  language?: "en" | "hi";
  min?: string;
  max?: string;
  ariaLabel: string;
  className?: string;
}

function DatePicker({
  value,
  onChange,
  language = "en",
  min,
  max,
  ariaLabel,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minimum = min ? parseDate(min) : undefined;
  const maximum = max ? parseDate(max) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[52px] w-full items-center gap-3 rounded-[9px] border border-[#bfc5d4] bg-white px-[15px] text-left font-normal text-[var(--ink)]",
            className,
          )}
          aria-label={ariaLabel}
        >
          <CalendarDays className="h-5 w-5 text-[#777d8d]" />
          {selected?.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          locale={language === "hi" ? hi : enIN}
          disabled={
            minimum && maximum
              ? [{ before: minimum }, { after: maximum }]
              : minimum
                ? { before: minimum }
                : maximum
                  ? { after: maximum }
                  : undefined
          }
          onSelect={(date) => {
            if (!date) return;
            onChange(formatValue(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
