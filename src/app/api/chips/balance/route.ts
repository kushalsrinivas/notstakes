import { NextResponse } from "next/server";
import { verifyWalletAuth } from "~/lib/auth";
import { getUserBalance } from "~/lib/chips";
import { CHIP_USD_RATE } from "~/lib/constants";

export async function GET(request: Request) {
  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balance = await getUserBalance(address);
  return NextResponse.json({ balance, minWagerBalance: 1, chipUsdRate: CHIP_USD_RATE });
}


