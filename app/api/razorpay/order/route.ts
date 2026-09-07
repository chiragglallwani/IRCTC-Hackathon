import { NextResponse } from "next/server";
import { z } from "zod";
const inputSchema = z.object({
  amount: z.number().int().min(1).max(500000),
  currency: z.literal("INR"),
  receipt: z.string().min(3).max(40),
});
export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret)
      return NextResponse.json({ id: `order_mock_${Date.now()}`, mock: true });
    const authorization = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount * 100,
        currency: input.currency,
        receipt: input.receipt,
      }),
    });
    if (!response.ok) {
      const issue = (await response.json().catch(() => null)) as {
        error?: { description?: string };
      } | null;
      return NextResponse.json(
        {
          error:
            issue?.error?.description ??
            "Razorpay payment order could not be created.",
        },
        { status: 502 },
      );
    }
    const order = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
    };
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid payment amount or order request." },
      { status: 400 },
    );
  }
}
