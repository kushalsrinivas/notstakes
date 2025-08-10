"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useChips } from "./ChipsProvider";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  CHIP_USD_RATE,
  PLATFORM_WALLET_ADDRESS,
  SUPPORTED_CHAIN_ID,
} from "~/lib/constants";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { parseEther } from "viem";
import { fetchWithAuth } from "~/lib/auth";

export function DepositModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { chipUsdRate, refresh } = useChips();
  const [amount, setAmount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [cryptoPriceUsd, setCryptoPriceUsd] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [pollId, setPollId] = useState<ReturnType<typeof setInterval> | null>(
    null
  );
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  useEffect(() => {
    if (!open) return;
    // Fetch ETH price USD (simple public API; replace with Chainlink if desired)
    fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot")
      .then((r) => r.json())
      .then((d) => setCryptoPriceUsd(parseFloat(d.data.amount)))
      .catch(() => setCryptoPriceUsd(null));
  }, [open]);

  const onConfirm = useCallback(async () => {
    setError(null);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a positive integer amount");
      return;
    }
    if (!address) {
      setError("Connect wallet in client to deposit");
      return;
    }
    const usd = amount * (chipUsdRate || CHIP_USD_RATE);
    if (!cryptoPriceUsd) {
      setError("Price feed unavailable. Try again.");
      return;
    }
    const ethAmount = usd / cryptoPriceUsd;
    setIsLoading(true);
    try {
      // Ensure Base Sepolia
      if (chainId !== SUPPORTED_CHAIN_ID) {
        await switchChainAsync({ chainId: SUPPORTED_CHAIN_ID });
      }
      const hash = await sendTransactionAsync({
        to: PLATFORM_WALLET_ADDRESS,
        value: parseEther(ethAmount.toFixed(6)),
      });
      console.log("hash", hash);
      setTxHash(hash);
      // Notify backend with txHash so it can poll confirmations and credit chips
      const res = await fetchWithAuth("/api/chips/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, txHash: hash }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Deposit failed" }));
        console.log("err", err);
        throw new Error(err.error || "Deposit failed");
      }
      const json = await res.json();
      console.log("json", json);
      if (json.mode === "confirmed") {
        await refresh();
        onClose();
      } else if (json.mode === "pending") {
        setIsPending(true);
        setConfirmations(json.confirmations || 0);
        if (pollId) clearInterval(pollId);
        const id = setInterval(async () => {
          const res2 = await fetchWithAuth("/api/chips/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, txHash: hash }),
          });
          const json2 = await res2.json().catch(() => ({}));
          setConfirmations(json2.confirmations || 0);
          if (json2.mode === "confirmed") {
            clearInterval(id);
            setIsPending(false);
            await refresh();
            onClose();
          }
        }, 4000);
        setPollId(id);
      } else {
        onClose();
      }
    } catch (e: any) {
      console.log("error", e);
      setError(e?.message || "Deposit failed");
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    chipUsdRate,
    address,
    cryptoPriceUsd,
    chainId,
    switchChainAsync,
    sendTransactionAsync,
    onClose,
  ]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center">
      <div className="w-full max-w-sm glass-panel p-4 space-y-3">
        <h3 className="font-semibold text-lg">Deposit Chips</h3>
        <p className="text-xs text-muted-foreground">
          Conversion: 1 chip = ${(chipUsdRate || CHIP_USD_RATE).toFixed(3)} USD
        </p>
        <div className="space-y-1">
          <Label htmlFor="deposit-amount">Amount</Label>
          <Input
            id="deposit-amount"
            inputMode="numeric"
            className="text-black"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setAmount(v ? parseInt(v, 10) : 0);
            }}
            placeholder="Enter chips"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          ≈ ${(amount * (chipUsdRate || CHIP_USD_RATE)).toFixed(3)} USD
          {cryptoPriceUsd && (
            <>
              {" "}
              · Exact:{" "}
              {(
                (amount * (chipUsdRate || CHIP_USD_RATE)) /
                cryptoPriceUsd
              ).toFixed(6)}{" "}
              ETH
            </>
          )}
        </div>
        {cryptoPriceUsd && (
          <div className="flex items-center justify-center">
            {/* QR using public service; encodes EIP-681 with chain id */}
            {(() => {
              const usd = amount * (chipUsdRate || CHIP_USD_RATE);
              const eth = usd / (cryptoPriceUsd || 1);
              const wei = Math.floor(eth * 1e18);
              const payload = `ethereum:${PLATFORM_WALLET_ADDRESS}@${SUPPORTED_CHAIN_ID}?value=${wei}`;
              const url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                payload
              )}`;
              return <img src={url} alt="Deposit QR" className="rounded" />;
            })()}
          </div>
        )}
        <div className="rounded-md border border-dashed border-border p-2 text-xs space-y-1">
          <div>
            Destination wallet:
            <button
              className="ml-1 underline"
              onClick={() =>
                navigator.clipboard.writeText(PLATFORM_WALLET_ADDRESS)
              }
            >
              {PLATFORM_WALLET_ADDRESS}
            </button>
          </div>
          <div>Network: Base mainnet</div>
          <div>
            Note: Send the exact amount in one transaction. Credited after 3
            confirmations.
          </div>
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        {isPending && (
          <div className="text-xs text-muted-foreground">
            Waiting for confirmations: {confirmations}/3…
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading}>
            Confirm Deposit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WithdrawModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { withdraw, balance, chipUsdRate } = useChips();
  const [amount, setAmount] = useState(10);
  const [destination, setDestination] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = useCallback(async () => {
    setError(null);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a positive integer amount");
      return;
    }
    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }
    setIsLoading(true);
    try {
      await withdraw(amount, destination || undefined);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Withdraw failed");
    } finally {
      setIsLoading(false);
    }
  }, [amount, destination, withdraw, balance, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center">
      <div className="w-full max-w-sm glass-panel p-4 space-y-3">
        <h3 className="font-semibold text-lg">Withdraw Chips</h3>
        <p className="text-xs text-muted-foreground">
          Conversion: 1 chip = {(chipUsdRate || CHIP_USD_RATE).toFixed(3)} USD
        </p>
        <div className="space-y-1">
          <Label htmlFor="withdraw-amount">Amount</Label>
          <Input
            id="withdraw-amount"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setAmount(v ? parseInt(v, 10) : 0);
            }}
            placeholder="Enter chips"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="destination">Wallet Address (optional)</Label>
          <Input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="text-xs text-muted-foreground">
          ≈ ${(amount * (chipUsdRate || CHIP_USD_RATE)).toFixed(3)} USD
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading}>
            Confirm Withdrawal
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InsufficientBalanceModal({
  open,
  onClose,
  onDeposit,
}: {
  open: boolean;
  onClose: () => void;
  onDeposit: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center">
      <div className="w-full max-w-sm glass-panel p-4 space-y-3">
        <h3 className="font-semibold text-lg">Insufficient Balance</h3>
        <p className="text-sm text-muted-foreground">
          You need at least 10 chips (= $0.01) to place a wager. Please deposit
          more chips to continue.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onDeposit}>Deposit Chips</Button>
        </div>
      </div>
    </div>
  );
}
