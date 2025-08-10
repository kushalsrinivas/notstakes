import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyWalletAuth } from "~/lib/auth";
import { withdrawChips } from "~/lib/chips";
import { CHIP_USD_RATE, PLATFORM_WALLET_ADDRESS } from "~/lib/constants";
import { getWalletClientFromPrivateKey, publicClient } from "~/lib/viem";
import { getEthUsdPrice } from "~/lib/prices";

const schema = z.object({
  amount: z.number().int().positive(),
  destination: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .transform((s) => (s ? (s as `0x${string}`) : (undefined as any)))
    .optional(),
});

export async function POST(request: Request) {
  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { amount, destination } = parsed.data as { amount: number; destination?: `0x${string}` };
    const result = await withdrawChips(address, amount, destination);

    // Queue on-chain transaction from platform wallet if private key is configured
    const wallet = await getWalletClientFromPrivateKey();
    if (wallet && destination) {
      const ethUsd = await getEthUsdPrice();
      const usd = amount * CHIP_USD_RATE;
      const eth = usd / ethUsd;
      const txHash = await wallet.sendTransaction({
        to: destination,
        value: BigInt(Math.floor(eth * 1e18)),
      });
      // Could update transaction record with txHash via a dedicated function if desired
    }

    const usd = amount * CHIP_USD_RATE;
    return NextResponse.json({ success: true, ...result, amountUsd: usd, platformWallet: PLATFORM_WALLET_ADDRESS });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Withdraw failed" }, { status: 400 });
  }
}


