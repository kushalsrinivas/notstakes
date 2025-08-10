import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyWalletAuth } from "~/lib/auth";
import { placeBet } from "~/lib/chips";

const schema = z.object({
  amount: z.number().int().positive(),
  side: z.enum(["heads", "tails"]),
});

export async function POST(request: Request) {
  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await placeBet(address, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bet failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


