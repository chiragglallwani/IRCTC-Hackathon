import { Check, TrainFront } from "lucide-react";
import { cn } from "@/lib/utils";

export function JourneyLoader({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "journey-loader",
        compact && "journey-loader-compact",
        className,
      )}
      aria-hidden="true"
    >
      <span className="journey-loader-emblem">
        <svg viewBox="0 0 80 80" focusable="false">
          <circle className="journey-loader-track" cx="40" cy="40" r="31" />
          <circle
            className="journey-loader-ring journey-loader-ring-navy"
            cx="40"
            cy="40"
            r="31"
            pathLength="100"
          />
          <circle
            className="journey-loader-ring journey-loader-ring-teal"
            cx="40"
            cy="40"
            r="24"
            pathLength="100"
          />
        </svg>
        <span className="journey-loader-core">
          <TrainFront />
        </span>
        <span className="journey-loader-check">
          <Check />
        </span>
      </span>
    </span>
  );
}
