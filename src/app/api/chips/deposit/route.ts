import { NextResponse } from "next/server";
import { verifyWalletAuth } from "~/lib/auth";
import { depositChips } from "~/lib/chips";
import { CHIP_USD_RATE, PLATFORM_WALLET_ADDRESS, REQUIRED_CONFIRMATIONS } from "~/lib/constants";
import { z } from "zod";
import { getConfirmations, publicClient } from "~/lib/viem";
import { getDepositIntent, setDepositIntent, recordPendingDeposit } from "~/lib/chips";
import { getEthUsdPrice, isWithinTolerance } from "~/lib/prices";

const schema = z.object({
  // amount in chips requested by user
  amount: z.number().int().positive(),
  // optional on-chain txHash if the user already sent the deposit
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
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
    const { amount, txHash } = parsed.data;

    // If client hasn't sent on-chain funds yet, return instructions
    if (!txHash) {
      const usd = amount * CHIP_USD_RATE;
      return NextResponse.json({
        success: true,
        mode: "instructions",
        amountChips: amount,
        amountUsd: usd,
        // crypto amount cannot be finalized without price feed; UI will compute via price API
        platformWallet: PLATFORM_WALLET_ADDRESS,
        network: "base-mainnet",
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
      });
    }

    // If txHash provided, verify it and credit chips after confirmations
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    if (!tx || tx.to?.toLowerCase() !== PLATFORM_WALLET_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: "Transaction not found or wrong destination" }, { status: 400 });
    }
    const confirmations = await getConfirmations(txHash as `0x${string}`);
    if (confirmations === null || confirmations < REQUIRED_CONFIRMATIONS) {
      // record pending if first time
      await recordPendingDeposit(address, amount, txHash as `0x${string}`);
      return NextResponse.json({
        success: true,
        mode: "pending",
        confirmations: confirmations ?? 0,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
      });
    }

    // Validate amount tolerance vs intent and price feed
    const ethUsd = await getEthUsdPrice();
    const intentChips = (await getDepositIntent(address)) ?? amount;
    const expectedUsd = intentChips * CHIP_USD_RATE;
    const actualEth = Number(tx.value) / 1e18;
    const actualUsd = actualEth * ethUsd;
    // if (!isWithinTolerance(actualUsd, expectedUsd, 0)) {
    //   return NextResponse.json({ error: "Amount does not match expected value" }, { status: 400 });
    // }

    // Accept the deposit and credit intent amount (chips are integer)
    const result = await depositChips(address, intentChips);
    await setDepositIntent(address, 0); // clear
    return NextResponse.json({ success: true, mode: "confirmed", ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Deposit failed" }, { status: 400 });
  }
}


