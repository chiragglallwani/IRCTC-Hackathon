import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CLASSSELECTIONLIST = [
  { label: "common.classes.any", value: "ANY" },
  { label: "common.classes.firstAc", value: "1A" },
  { label: "common.classes.secondAc", value: "2A" },
  { label: "common.classes.thirdAc", value: "3A" },
  { label: "common.classes.economyThirdAc", value: "3E" },
  { label: "common.classes.executiveChair", value: "EC" },
  { label: "common.classes.chairCar", value: "CC" },
  { label: "common.classes.sleeper", value: "SL" },
  { label: "common.classes.secondSitting", value: "2S" },
];

export function getClassTranslationKey(value: string) {
  return (
    CLASSSELECTIONLIST.find((travelClass) => travelClass.value === value)
      ?.label ?? value
  );
}
