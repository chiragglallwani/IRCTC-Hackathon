"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRightIcon,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { findPlaces } from "@/lib/data";
import type { BookingMode, Station } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "./providers";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CLASSSELECTIONLIST, cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import { Button } from "@/components/ui/button";

const modes: BookingMode[] = ["tatkal", "quick", "explore", "tourism"];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDate() {
  return formatLocalDate(new Date());
}

function tomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDate(tomorrow);
}

export function SearchCard({
  initialMode = "quick",
}: {
  initialMode?: BookingMode;
}) {
  const router = useRouter();
  const { language, t } = useApp();
  const { isTabletScreen, isMobileScreen } = useResponsive();
  const [mode, setMode] = useState<BookingMode>(initialMode);
  const [origin, setOrigin] = useState<Station | null>(
    findPlaces("Ahmedabad")[0] ?? null,
  );
  const [destination, setDestination] = useState<Station | null>(
    findPlaces("Mumbai")[0] ?? null,
  );
  const [date, setDate] = useState(() =>
    initialMode === "tatkal" ? tomorrowDate() : todayDate(),
  );
  const [travelClass, setTravelClass] = useState("ANY");
  const [travellers, setTravellers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [error, setError] = useState("");
  const swap = () => {
    const o = origin;
    setOrigin(destination);
    setDestination(o);
  };
  const updateCount = (key: keyof typeof travellers, delta: number) =>
    setTravellers((p) => ({
      ...p,
      [key]: Math.max(
        key === "adults" ? 1 : 0,
        Math.min(key === "adults" ? 9 : 6, p[key] + delta),
      ),
    }));
  const submit = () => {
    if (mode === "tourism") return router.push("/tourism");
    if (mode === "tatkal" && date !== tomorrowDate())
      return setError(t("components.searchCard.tatkalDateOnly"));
    if (mode !== "tatkal" && date < todayDate())
      return setError(t("components.searchCard.pastDate"));
    if (!origin || !destination)
      return setError(t("components.searchCard.selectPlaces"));
    if (origin.stationId === destination.stationId)
      return setError(t("components.searchCard.samePlace"));
    const q = new URLSearchParams({
      origin: origin.stationId,
      destination: destination.stationId,
      date,
      adults: String(travellers.adults),
      children: String(travellers.children),
      infants: String(travellers.infants),
      class: travelClass,
      mode,
    });
    router.push(`/search?${q}`);
  };
  return (
    <Tabs
      className="card max-w-[1180px] overflow-visible"
      value={mode}
      onValueChange={(value) => {
        const nextMode = value as BookingMode;
        setMode(nextMode);
        setError("");
        if (nextMode === "tatkal") setDate(tomorrowDate());
        else if (date < todayDate()) setDate(todayDate());
      }}
    >
      <TabsList
        className="flex overflow-auto rounded-t-xl border-b border-[var(--line)] bg-[#f1f3f6]"
        aria-label={t("components.searchCard.tabsLabel")}
      >
        {modes.map((bookingMode) => (
          <TabsTrigger
            key={bookingMode}
            value={bookingMode}
            className={`min-h-16 whitespace-nowrap border-0 border-b-[3px] bg-transparent px-4 font-[650] text-[#4b4f5d] lg:px-12 ${
              mode === bookingMode
                ? "border-[var(--primary)] bg-white text-[var(--primary-dark)]"
                : "border-transparent"
            }`}
          >
            {t(`components.searchCard.tabs.${bookingMode}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex flex-col gap-6 p-5 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-y-2 gap-x-12 justify-between w-full">
          <PlaceCombobox
            label={t("common.fields.from")}
            selected={origin}
            onSelect={setOrigin}
            searchPlaceholder={t("components.searchCard.searchStations")}
            emptyText={t("components.searchCard.noStations")}
            className="w-full"
          />
          <Button
            variant="ghost"
            size="icon"
            className="m-auto lg:mx-0 lg:mb-1"
            onClick={swap}
            aria-label={t("components.searchCard.swap")}
          >
            {isMobileScreen || isTabletScreen ? (
              <ArrowUpDown />
            ) : (
              <ArrowLeftRightIcon />
            )}
          </Button>
          <PlaceCombobox
            label={t("common.fields.to")}
            selected={destination}
            onSelect={setDestination}
            searchPlaceholder={t("components.searchCard.searchStations")}
            emptyText={t("components.searchCard.noStations")}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 items-end gap-[18px] lg:col-span-full lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div className="grid gap-[7px] font-semibold text-[#363a45]">
            {t("common.fields.date")}
            <DatePicker
              value={date}
              onChange={(nextDate) => {
                if (mode === "tatkal" && nextDate !== tomorrowDate()) {
                  setError(t("components.searchCard.tatkalDateOnly"));
                  return;
                }
                if (mode !== "tatkal" && nextDate < todayDate()) {
                  setError(t("components.searchCard.pastDate"));
                  return;
                }
                setDate(nextDate);
                setError("");
              }}
              min={mode === "tatkal" ? tomorrowDate() : todayDate()}
              max={mode === "tatkal" ? tomorrowDate() : undefined}
              language={language}
              ariaLabel={t("common.fields.date")}
            />
          </div>
          <Popover>
            <div className="grid gap-[7px] font-semibold text-[#363a45]">
              {t("common.fields.passengers")}
              <PopoverTrigger asChild>
                <button className="flex min-h-[52px] w-full items-center gap-2.5 rounded-[9px] border border-[#bfc5d4] bg-white px-[15px] text-start [&_svg]:w-[21px] [&_svg]:text-[#777d8d]">
                  <Users />
                  {t(
                    travellers.adults === 1
                      ? "components.searchCard.adult"
                      : "components.searchCard.adults",
                    { count: travellers.adults },
                  )}
                  {travellers.children
                    ? ` · ${t(
                        travellers.children === 1
                          ? "components.searchCard.child"
                          : "components.searchCard.children",
                        { count: travellers.children },
                      )}`
                    : ""}
                  {travellers.infants
                    ? ` · ${t(
                        travellers.infants === 1
                          ? "components.searchCard.infant"
                          : "components.searchCard.infants",
                        { count: travellers.infants },
                      )}`
                    : ""}
                </button>
              </PopoverTrigger>
            </div>
            <PopoverContent className="w-[340px] p-[18px]" align="end">
              {(["adults", "children", "infants"] as const).map((key) => (
                <div className="counter-row" key={key}>
                  <div>
                    <strong>
                      {t(
                        `components.searchCard.${key === "adults" ? "adultLabel" : key === "children" ? "childLabel" : "infantLabel"}`,
                      )}
                    </strong>
                    <div className="microcopy">
                      {key === "adults"
                        ? t("components.searchCard.adultAge")
                        : key === "children"
                          ? t("components.searchCard.childAge")
                          : t("components.searchCard.infantAge")}
                    </div>
                  </div>
                  <div className="flex gap-x-4 text-[var(--primary)]">
                    <button
                      className="border-2 rounded-full border-[var(--primary)]"
                      onClick={() => updateCount(key, -1)}
                      aria-label={t("components.searchCard.removePassenger", {
                        type: key,
                      })}
                    >
                      <Minus />
                    </button>
                    <strong>{travellers[key]}</strong>
                    <button
                      className="border-2 rounded-full border-[var(--primary)]"
                      onClick={() => updateCount(key, 1)}
                      aria-label={t("components.searchCard.addPassenger", {
                        type: key,
                      })}
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
              ))}
              <PopoverClose asChild>
                <Button size="md" className="w-full mt-3">
                  {t("common.actions.done")}
                </Button>
              </PopoverClose>
            </PopoverContent>
          </Popover>
          <div className="grid gap-[7px] font-[650] text-[#3f4350]">
            <span>{t("common.fields.class")}</span>
            <Select value={travelClass} onValueChange={setTravelClass}>
              <SelectTrigger aria-label={t("common.fields.class")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSSELECTIONLIST.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="lg" className="min-h-[52px]" onClick={submit}>
            <Search />
            {mode === "tourism"
              ? t("components.searchCard.exploreIndia")
              : t("components.searchCard.find")}
          </Button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {mode === "tatkal" && (
          <div className="col-span-full flex gap-3 border-t border-[var(--line)] pt-[17px] text-[#134b8e] [&_span]:text-[var(--muted)]">
            <strong>{t("components.searchCard.tatkalTitle")}</strong>
            <span>{t("components.searchCard.tatkalNote")}</span>
          </div>
        )}
        {mode === "explore" && (
          <p className="microcopy">{t("components.searchCard.exploreNote")}</p>
        )}
      </div>
    </Tabs>
  );
}
function PlaceCombobox({
  label,
  selected,
  onSelect,
  searchPlaceholder,
  emptyText,
  className,
}: {
  label: string;
  selected: Station | null;
  onSelect: (x: Station) => void;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => findPlaces(query), [query]);

  return (
    <div
      className={cn("grid gap-[7px] font-semibold text-[#363a45]", className)}
    >
      <span>{label}</span>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-label={label}
            className="flex min-h-[52px] w-full items-center justify-between rounded-[9px] border border-[#bfc5d4] bg-white px-[15px] text-start font-normal"
          >
            {selected ? (
              <span className="grid">
                <strong className="font-semibold">{selected.name}</strong>
                <small className="text-[var(--muted)]">{selected.state}</small>
              </span>
            ) : (
              <span className="text-[var(--muted)]">{label}</span>
            )}
            <span className="ms-3 flex shrink-0 items-center gap-2">
              {selected && <strong>{selected.code}</strong>}
              <ChevronsUpDown className="h-4 w-4 text-[var(--muted)]" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] pt-2"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {suggestions.map((station) => (
                  <CommandItem
                    key={station.stationId}
                    value={station.stationId}
                    onSelect={() => {
                      onSelect(station);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`me-2 h-4 w-4 shrink-0 ${
                        selected?.stationId === station.stationId
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span className="grid flex-1">
                      <strong>{station.name}</strong>
                      <small className="text-[var(--muted)]">
                        {station.state}
                      </small>
                    </span>
                    <strong className="ms-3">{station.code}</strong>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
