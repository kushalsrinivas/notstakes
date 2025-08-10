import { NextResponse } from "next/server";
import { verifyWalletAuth } from "~/lib/auth";
import { depositChips } from "~/lib/chips";

export async function POST(request: Request) {
  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await depositChips(address, 1000);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Deposit failed" }, { status: 400 });
  }
}


