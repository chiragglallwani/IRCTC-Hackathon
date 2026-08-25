import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const inputSchema = z.object({
  id: z.string().regex(/^qr_[A-Za-z0-9_-]+$/),
  amount: z.number().int().min(1).max(500000),
  closeBy: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret)
      return NextResponse.json(
        { error: "Razorpay test credentials are not configured." },
        { status: 503 },
      );

    const expectedSignature = createHmac("sha256", secret)
      .update(`${input.id}|${input.amount}|${input.closeBy}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(input.signature);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    )
      return NextResponse.json(
        { error: "Invalid QR payment session." },
        { status: 401 },
      );

    if (Math.floor(Date.now() / 1000) > input.closeBy + 60)
      return NextResponse.json(
        { error: "This QR payment session has expired.", expired: true },
        { status: 410 },
      );

    const authorization = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(input.id)}`,
      {
        headers: { Authorization: `Basic ${authorization}` },
        cache: "no-store",
      },
    );
    if (!response.ok)
      return NextResponse.json(
        { error: "QR payment status could not be checked." },
        { status: 502 },
      );

    const qr = (await response.json()) as {
      status: string;
      payment_amount?: number;
      payments_amount_received?: number;
      payments_count_received?: number;
    };
    const expectedAmount = input.amount * 100;
    const receivedAmount = qr.payments_amount_received ?? 0;
    if (qr.payment_amount !== expectedAmount)
      return NextResponse.json(
        { error: "QR payment amount does not match this booking." },
        { status: 409 },
      );
    return NextResponse.json({
      status: qr.status,
      paymentsCount: qr.payments_count_received ?? 0,
      receivedAmount,
      paid:
        (qr.payments_count_received ?? 0) > 0 &&
        expectedAmount > 0 &&
        receivedAmount >= expectedAmount,
    });
  } catch {
    return NextResponse.json({ error: "Invalid QR code id." }, { status: 400 });
  }
}
