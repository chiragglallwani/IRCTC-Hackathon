import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const inputSchema = z.object({
  amount: z.number().int().min(1).max(500000),
  currency: z.literal("INR"),
  receipt: z.string().min(3).max(40),
});

function createMockQrDataUrl(seed: string) {
  const size = 25;
  let hash = 0;
  for (const character of seed)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const isFinder = (x: number, y: number, startX: number, startY: number) =>
    x >= startX && x < startX + 7 && y >= startY && y < startY + 7;
  const finderCell = (x: number, y: number, startX: number, startY: number) => {
    const localX = x - startX;
    const localY = y - startY;
    return (
      localX === 0 ||
      localX === 6 ||
      localY === 0 ||
      localY === 6 ||
      (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
    );
  };
  const cells: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const topLeft = isFinder(x, y, 0, 0);
      const topRight = isFinder(x, y, size - 7, 0);
      const bottomLeft = isFinder(x, y, 0, size - 7);
      const finder =
        (topLeft && finderCell(x, y, 0, 0)) ||
        (topRight && finderCell(x, y, size - 7, 0)) ||
        (bottomLeft && finderCell(x, y, 0, size - 7));
      hash = (hash * 1664525 + 1013904223) >>> 0;
      if (finder || (!topLeft && !topRight && !bottomLeft && hash % 3 === 0)) {
        cells.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="#111827">${cells.join("")}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function signQrSession(
  secret: string,
  qrId: string,
  amount: number,
  closeBy: number,
) {
  return createHmac("sha256", secret)
    .update(`${qrId}|${amount}|${closeBy}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const closeBy = Math.floor(Date.now() / 1000) + 15 * 60;

    if (!keyId || !secret) {
      const id = `qr_mock_${Date.now()}`;
      return NextResponse.json({
        id,
        imageUrl: createMockQrDataUrl(`${id}-${input.receipt}-${input.amount}`),
        closeBy,
        status: "active",
        mock: true,
      });
    }

    const authorization = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch(
      "https://api.razorpay.com/v1/payments/qr_codes",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "upi_qr",
          name: "RailEase Booking",
          usage: "single_use",
          fixed_amount: true,
          payment_amount: input.amount * 100,
          description: "RailEase test-mode railway booking",
          close_by: closeBy,
          notes: { receipt: input.receipt },
        }),
      },
    );

    if (!response.ok) {
      const issue = (await response.json().catch(() => null)) as {
        error?: { description?: string };
      } | null;
      return NextResponse.json(
        {
          error:
            issue?.error?.description ??
            "Razorpay QR could not be created. Confirm QR Codes are enabled for this test account.",
        },
        { status: 502 },
      );
    }

    const qr = (await response.json()) as {
      id: string;
      image_url: string;
      close_by: number;
      status: string;
    };
    return NextResponse.json({
      id: qr.id,
      imageUrl: qr.image_url,
      closeBy: qr.close_by,
      status: qr.status,
      amount: input.amount,
      signature: signQrSession(secret, qr.id, input.amount, qr.close_by),
      mock: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid QR payment request." },
      { status: 400 },
    );
  }
}
