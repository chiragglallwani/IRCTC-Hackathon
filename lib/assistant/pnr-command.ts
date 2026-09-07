export type PnrAction = "status" | "cancel";

const digitWords: Record<string, string> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

export function normalizePnr(value: string) {
  const expanded = value
    .toLowerCase()
    .replace(
      /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g,
      (word) => digitWords[word],
    );
  const digits = expanded.replace(/\D/g, "").slice(0, 10);
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : null;
}

export function parsePnrCommand(utterance: string) {
  const marker = utterance.match(/\bpnr\b|\bbooking\s+(?:number|reference)\b/i);
  if (!marker || marker.index === undefined) return null;
  const action: PnrAction = /\b(cancel|cancellation|cancelled)\b/i.test(utterance)
    ? "cancel"
    : "status";
  const numberText = utterance.slice(marker.index + marker[0].length);
  return { action, pnr: normalizePnr(numberText) };
}
