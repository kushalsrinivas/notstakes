"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ShareButton } from "~/components/ui/Share";
import { cn } from "~/lib/utils";
import { useMiniApp } from "@neynar/react";

type Side = "heads" | "tails";

export default function CoinFlipGame() {
  const { context } = useMiniApp();

  const [hasClaimed, setHasClaimed] = useState(false);
  const [chips, setChips] = useState<number>(0);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [outcome, setOutcome] = useState<Side | null>(null);
  const [didWin, setDidWin] = useState<boolean | null>(null);
  const [roundEndsAt, setRoundEndsAt] = useState<number>(() => {
    const now = Date.now();
    return Math.ceil(now / 60_000) * 60_000; // next minute boundary
  });
  const [now, setNow] = useState<number>(Date.now());

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const secondsRemaining = useMemo(() => {
    return Math.max(0, Math.ceil((roundEndsAt - now) / 1000));
  }, [roundEndsAt, now]);

  const progressPct = useMemo(() => {
    const total = 60_000;
    const elapsed = Math.min(total, Math.max(0, total - (roundEndsAt - now)));
    return Math.round((elapsed / total) * 100);
  }, [roundEndsAt, now]);

  const canPlaceBet = useMemo(() => {
    const amount = Number(betAmount);
    return (
      hasClaimed &&
      !isFlipping &&
      didWin === null &&
      outcome === null &&
      selectedSide !== null &&
      Number.isFinite(amount) &&
      amount > 0 &&
      amount <= chips
    );
  }, [hasClaimed, isFlipping, didWin, outcome, selectedSide, betAmount, chips]);

  const claimChips = useCallback(() => {
    if (hasClaimed) return;
    setHasClaimed(true);
    setChips(1000);
  }, [hasClaimed]);

  const setQuickAmount = useCallback(
    (amount: number) => setBetAmount(String(amount)),
    []
  );

  const handlePlaceBet = useCallback(() => {
    if (!canPlaceBet || !selectedSide) return;
    const amount = Number(betAmount);
    // Start visual flip
    setIsFlipping(true);
    setOutcome(null);
    setDidWin(null);
    // Resolve after animation
    const flipTo = Math.random() < 0.5 ? ("heads" as Side) : ("tails" as Side);
    setTimeout(() => {
      setIsFlipping(false);
      setOutcome(flipTo);
      const win = flipTo === selectedSide;
      setDidWin(win);
      setChips((prev) => (win ? prev + amount : prev - amount));
      const nextBoundary = Math.ceil(Date.now() / 60_000) * 60_000;
      setRoundEndsAt(nextBoundary);
    }, 1100);
  }, [betAmount, canPlaceBet, selectedSide]);

  const resetRound = useCallback(() => {
    setSelectedSide(null);
    setBetAmount("");
    setIsFlipping(false);
    setOutcome(null);
    setDidWin(null);
    // keep the global minute cadence; no change to roundEndsAt
  }, []);

  const shareText = useMemo(() => {
    if (didWin === null || !outcome) return "I'm playing Coin Flip!";
    const amount = Number(betAmount);
    return didWin
      ? `I just won ${amount} chips on ${outcome.toUpperCase()}! 🪙`
      : `Missed ${amount} chips on ${outcome.toUpperCase()}... rematch? 🪙`;
  }, [didWin, outcome, betAmount]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Round + Chips Header */}
      <div className="flex items-center justify-between bg-card text-card-foreground border border-border rounded-lg px-4 py-3">
        <div>
          <div className="text-xs text-muted-foreground">Next round</div>
          <div className="font-semibold text-foreground">
            {secondsRemaining}s
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Your chips</div>
          <div className="font-semibold text-foreground">{chips}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Claim Section */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Claim daily chips</div>
            <div className="text-xs text-muted-foreground">
              Come back every day for 1,000 chips
            </div>
          </div>
          <Button onClick={claimChips} disabled={hasClaimed}>
            {hasClaimed ? "Claimed" : "Claim 1,000"}
          </Button>
        </div>
      </div>

      {/* Choose Side */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
        <div className="mb-3">
          <div className="font-medium">Pick your side</div>
          <div className="text-xs text-muted-foreground">Heads or Tails</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SideButton
            label="Heads"
            selected={selectedSide === "heads"}
            onClick={() => setSelectedSide("heads")}
          />
          <SideButton
            label="Tails"
            selected={selectedSide === "tails"}
            onClick={() => setSelectedSide("tails")}
          />
        </div>
      </div>

      {/* Bet Amount */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="bet-amount" className="font-medium">
            Bet amount
          </Label>
          <div className="text-xs text-muted-foreground">Max: {chips}</div>
        </div>
        <Input
          id="bet-amount"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Enter chips"
          value={betAmount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            setBetAmount(v);
          }}
        />
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 100, chips].map((amt, idx) => (
            <button
              key={`${amt}-${idx}`}
              onClick={() => setQuickAmount(amt || 0)}
              disabled={chips === 0}
              className={cn(
                "text-sm py-2 rounded-md border border-border bg-secondary text-secondary-foreground disabled:opacity-50",
                idx === 3 && "font-medium"
              )}
            >
              {idx === 3 ? "MAX" : amt}
            </button>
          ))}
        </div>
        <Button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet}
          isLoading={isFlipping}
        >
          {isFlipping ? "Flipping..." : "Place Bet"}
        </Button>
        {didWin !== null && outcome && (
          <div className="text-center text-sm">
            {didWin ? (
              <span className="text-foreground">You won! 🎉</span>
            ) : (
              <span className="text-muted-foreground">
                You lost. Try again!
              </span>
            )}
          </div>
        )}
        {(didWin !== null || outcome !== null) && (
          <div className="flex items-center justify-center">
            <ShareButton
              buttonText="Share result"
              cast={{
                text: shareText,
                embeds: [
                  `${process.env.NEXT_PUBLIC_URL}/share/${
                    context?.user?.fid || ""
                  }`,
                ],
              }}
              className="max-w-none"
            />
          </div>
        )}
        {(didWin !== null || outcome !== null) && (
          <button
            onClick={resetRound}
            className="mx-auto block text-xs text-muted-foreground hover:underline"
          >
            New round
          </button>
        )}
      </div>

      {/* Visual Coin */}
      <div className="flex items-center justify-center py-4">
        <Coin isFlipping={isFlipping} outcome={outcome} />
      </div>

      {/* Leaderboard Preview */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Leaderboard</div>
          <span className="text-xs text-muted-foreground">Daily</span>
        </div>
        <div className="space-y-2">
          {sampleLeaders(chips).map((row, idx) => (
            <div
              key={row.username + idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-5 text-right">
                  {idx + 1}
                </span>
                <div className="w-6 h-6 rounded-full bg-muted" />
                <span className="text-foreground">{row.username}</span>
              </div>
              <span className="text-foreground font-medium">{row.chips}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-3">
          <button
            className="text-xs text-muted-foreground hover:underline"
            disabled
          >
            Full leaderboard (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}

function SideButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-3 rounded-lg border text-center transition-colors",
        selected
          ? "bg-primary text-primary-foreground border-border"
          : "bg-secondary text-secondary-foreground border-border"
      )}
    >
      <span className="text-lg">{label === "Heads" ? "🙂" : "🦅"}</span>
      <div className="text-sm mt-1">{label}</div>
    </button>
  );
}

function Coin({
  isFlipping,
  outcome,
}: {
  isFlipping: boolean;
  outcome: Side | null;
}) {
  return (
    <div
      className={cn(
        "w-20 h-20 rounded-full border border-border bg-accent text-accent-foreground grid place-items-center text-2xl",
        isFlipping && "animate-coin-flip"
      )}
    >
      {outcome === "heads" && !isFlipping && "🙂"}
      {outcome === "tails" && !isFlipping && "🦅"}
      {outcome === null && !isFlipping && "🪙"}
    </div>
  );
}

function sampleLeaders(userChips: number) {
  return [
    { username: "You", chips: userChips },
    { username: "alpha", chips: 2300 },
    { username: "beta", chips: 1800 },
    { username: "gamma", chips: 1400 },
    { username: "delta", chips: 900 },
  ];
}
