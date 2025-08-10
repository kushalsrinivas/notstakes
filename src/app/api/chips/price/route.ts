import { NextResponse } from "next/server";
import { CHIP_USD_RATE } from "~/lib/constants";

export async function GET() {
  return NextResponse.json({ chipUsdRate: CHIP_USD_RATE });
}


