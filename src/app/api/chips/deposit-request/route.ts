import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyWalletAuth } from "~/lib/auth";
import { CHIP_USD_RATE, PLATFORM_WALLET_ADDRESS, REQUIRED_CONFIRMATIONS } from "~/lib/constants";
import { setDepositIntent } from "~/lib/chips";

const schema = z.object({ amount: z.number().int().positive() });

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

  const { amount } = parsed.data;
  await setDepositIntent(address, amount);
  const usd = amount * CHIP_USD_RATE;
  return NextResponse.json({
    success: true,
    amountChips: amount,
    amountUsd: usd,
    platformWallet: PLATFORM_WALLET_ADDRESS,
    network: "base-sepolia",
    requiredConfirmations: REQUIRED_CONFIRMATIONS,
  });
}


