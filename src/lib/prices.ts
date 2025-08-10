export async function getEthUsdPrice(): Promise<number> {
  // Simple public API; replace with Chainlink price feeds in production.
  const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
    cache: "no-store",
    headers: { "User-Agent": "mini-app/price" },
  }).catch(() => null);
  if (!res || !res.ok) throw new Error("Failed to fetch ETH price");
  const data = (await res.json()) as { data?: { amount?: string } };
  const amt = data?.data?.amount ? Number(data.data.amount) : NaN;
  if (!Number.isFinite(amt)) throw new Error("Invalid price data");
  return amt;
}

export function isWithinTolerance(actual: number, expected: number, tolerancePct = 0.02): boolean {
  const diff = Math.abs(actual - expected);
  return diff <= expected * tolerancePct;
}


