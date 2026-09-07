import { describe, expect, it } from "vitest";
import { normalizePnr, parsePnrCommand } from "@/lib/assistant/pnr-command";

describe("PNR assistant commands", () => {
  it("extracts formatted and unformatted PNR values", () => {
    expect(normalizePnr("123-4567890")).toBe("123-4567890");
    expect(normalizePnr("123 456 7890")).toBe("123-4567890");
  });

  it("understands digits spoken as words", () => {
    expect(
      normalizePnr("one two three four five six seven eight nine zero"),
    ).toBe("123-4567890");
  });

  it("distinguishes status and cancellation requests", () => {
    expect(parsePnrCommand("Tell me the status for PNR 123-4567890")).toEqual({
      action: "status",
      pnr: "123-4567890",
    });
    expect(parsePnrCommand("Cancel booking for PNR number 1234567890")).toEqual(
      {
        action: "cancel",
        pnr: "123-4567890",
      },
    );
  });
});
