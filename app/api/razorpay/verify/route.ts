import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ verified: false }, { status: 503 });
    const expected = createHmac("sha256", secret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(input.razorpay_signature);
    const verified = a.length === b.length && timingSafeEqual(a, b);
    return NextResponse.json({ verified }, { status: verified ? 200 : 400 });
  } catch {
    return NextResponse.json({ verified: false }, { status: 400 });
  }
}
