"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchWithAuth } from "~/lib/auth";

type ChipsContextValue = {
  balance: number;
  minWagerBalance: number;
  chipUsdRate: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number, destination?: string) => Promise<void>;
};

const ChipsContext = createContext<ChipsContextValue | null>(null);

export function ChipsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [minWagerBalance, setMinWagerBalance] = useState(10);
  const [chipUsdRate, setChipUsdRate] = useState(0.001);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/chips/balance", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = (await res.json()) as {
        balance: number;
        minWagerBalance: number;
        chipUsdRate?: number;
      };
      setBalance(data.balance);
      setMinWagerBalance(data.minWagerBalance);
      if (typeof data.chipUsdRate === "number")
        setChipUsdRate(data.chipUsdRate);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  const deposit = useCallback(async (amount: number) => {
    const res = await fetchWithAuth("/api/chips/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Deposit failed" }));
      throw new Error(err.error || "Deposit failed");
    }
    const data = (await res.json()) as { balance: number };
    setBalance(data.balance);
  }, []);

  const withdraw = useCallback(async (amount: number, destination?: string) => {
    const res = await fetchWithAuth("/api/chips/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, destination }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Withdraw failed" }));
      throw new Error(err.error || "Withdraw failed");
    }
    const data = (await res.json()) as { balance: number };
    setBalance(data.balance);
  }, []);

  useEffect(() => {
    fetchBalance();
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(fetchBalance, 5_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchBalance]);

  const value = useMemo<ChipsContextValue>(
    () => ({
      balance,
      minWagerBalance,
      chipUsdRate,
      isLoading,
      refresh,
      deposit,
      withdraw,
    }),
    [
      balance,
      minWagerBalance,
      chipUsdRate,
      isLoading,
      refresh,
      deposit,
      withdraw,
    ]
  );

  return (
    <ChipsContext.Provider value={value}>{children}</ChipsContext.Provider>
  );
}

export function useChips() {
  const ctx = useContext(ChipsContext);
  if (!ctx) throw new Error("useChips must be used within ChipsProvider");
  return ctx;
}
