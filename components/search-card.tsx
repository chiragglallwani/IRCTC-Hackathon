"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
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

const modes: BookingMode[] = ["tatkal", "quick", "explore", "tourism"];
export function SearchCard({
  initialMode = "quick",
}: {
  initialMode?: BookingMode;
}) {
  const router = useRouter();
  const { t } = useApp();
  const [mode, setMode] = useState<BookingMode>(initialMode);
  const [originQ, setOriginQ] = useState("Ahmedabad");
  const [destinationQ, setDestinationQ] = useState("Mumbai");
  const [origin, setOrigin] = useState<Station | null>(
    findPlaces("Ahmedabad")[0] ?? null,
  );
  const [destination, setDestination] = useState<Station | null>(
    findPlaces("Mumbai")[0] ?? null,
  );
  const [date, setDate] = useState("2026-08-24");
  const [travelClass, setTravelClass] = useState("ANY");
  const [travellers, setTravellers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [passengerOpen, setPassengerOpen] = useState(false);
  const [focus, setFocus] = useState<"origin" | "destination" | null>(null);
  const [error, setError] = useState("");
  const suggestions = useMemo(
    () => findPlaces(focus === "origin" ? originQ : destinationQ),
    [focus, originQ, destinationQ],
  );
  const select = (station: Station) => {
    if (focus === "origin") {
      setOrigin(station);
      setOriginQ(`${station.name} (${station.code})`);
    } else {
      setDestination(station);
      setDestinationQ(`${station.name} (${station.code})`);
    }
    setFocus(null);
  };
  const swap = () => {
    const o = origin;
    const oq = originQ;
    setOrigin(destination);
    setOriginQ(destinationQ);
    setDestination(o);
    setDestinationQ(oq);
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
    <div className="card search-card">
      <div
        className="mode-tabs"
        role="tablist"
        aria-label={t("components.searchCard.tabsLabel")}
      >
        {modes.map((bookingMode) => (
          <button
            key={bookingMode}
            role="tab"
            aria-selected={mode === bookingMode}
            className={mode === bookingMode ? "active" : ""}
            onClick={() => setMode(bookingMode)}
          >
            {t(`components.searchCard.tabs.${bookingMode}`)}
          </button>
        ))}
      </div>
      <div className="search-form">
        <PlaceInput
          label={t("common.fields.from")}
          value={originQ}
          onChange={(x) => {
            setOriginQ(x);
            setOrigin(null);
            setFocus("origin");
          }}
          onFocus={() => setFocus("origin")}
          show={focus === "origin"}
          suggestions={suggestions}
          onSelect={select}
        />
        <button
          className="icon-btn swap"
          onClick={swap}
          aria-label={t("components.searchCard.swap")}
        >
          <ArrowUpDown />
        </button>
        <PlaceInput
          label={t("common.fields.to")}
          value={destinationQ}
          onChange={(x) => {
            setDestinationQ(x);
            setDestination(null);
            setFocus("destination");
          }}
          onFocus={() => setFocus("destination")}
          show={focus === "destination"}
          suggestions={suggestions}
          onSelect={select}
        />
        <div className="wide-row">
          <label>
            {t("common.fields.date")}
            <span className="input-icon">
              <CalendarDays />
              <input
                type="date"
                value={date}
                min="2026-08-24"
                onChange={(e) => setDate(e.target.value)}
              />
            </span>
          </label>
          <div className="passenger-popover">
            <label>
              {t("common.fields.passengers")}
              <button
                className="select-button"
                onClick={() => setPassengerOpen(!passengerOpen)}
              >
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
              </button>
            </label>
            {passengerOpen && (
              <div className="passenger-panel">
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
                    <div className="counter">
                      <button
                        onClick={() => updateCount(key, -1)}
                        aria-label={t("components.searchCard.removePassenger", {
                          type: key,
                        })}
                      >
                        <Minus />
                      </button>
                      <strong>{travellers[key]}</strong>
                      <button
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
                <button
                  className="btn btn-primary w-full"
                  onClick={() => setPassengerOpen(false)}
                >
                  {t("common.actions.done")}
                </button>
              </div>
            )}
          </div>
          <div className="field-label">
            <span>{t("common.fields.class")}</span>
            <Select value={travelClass} onValueChange={setTravelClass}>
              <SelectTrigger aria-label={t("common.fields.class")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">{t("common.classes.any")}</SelectItem>
                <SelectItem value="1A">
                  {t("common.classes.firstAc")}
                </SelectItem>
                <SelectItem value="2A">
                  {t("common.classes.secondAc")}
                </SelectItem>
                <SelectItem value="3A">
                  {t("common.classes.thirdAc")}
                </SelectItem>
                <SelectItem value="CC">
                  {t("common.classes.chairCar")}
                </SelectItem>
                <SelectItem value="SL">
                  {t("common.classes.sleeper")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button className="btn btn-primary" onClick={submit}>
            <Search />
            {mode === "tourism"
              ? t("components.searchCard.exploreIndia")
              : t("components.searchCard.find")}
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {mode === "tatkal" && (
          <div className="tatkal-note">
            <strong>{t("components.searchCard.tatkalTitle")}</strong>
            <span>{t("components.searchCard.tatkalNote")}</span>
          </div>
        )}
        {mode === "explore" && (
          <p className="microcopy">{t("components.searchCard.exploreNote")}</p>
        )}
      </div>
    </div>
  );
}
function PlaceInput({
  label,
  value,
  onChange,
  onFocus,
  show,
  suggestions,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (x: string) => void;
  onFocus: () => void;
  show: boolean;
  suggestions: Station[];
  onSelect: (x: Station) => void;
}) {
  return (
    <div className="autocomplete">
      <label>
        {label}
        <input
          value={value}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          aria-autocomplete="list"
        />
      </label>
      {show && (
        <div className="autocomplete-list" role="listbox">
          {suggestions.map((x) => (
            <button
              role="option"
              aria-selected="false"
              key={x.stationId}
              onMouseDown={() => onSelect(x)}
            >
              <span>
                <strong>{x.name}</strong>
                <small>{x.state}</small>
              </span>
              <strong>{x.code}</strong>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
