"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ShareButton } from "~/components/ui/Share";
import { cn } from "~/lib/utils";
import { useMiniApp } from "@neynar/react";
import { useChips } from "~/components/ui/ChipsProvider";
import {
  DepositModal,
  InsufficientBalanceModal,
  WithdrawModal,
} from "~/components/ui/ChipsModals";
import { fetchWithAuth } from "~/lib/auth";

type Side = "heads" | "tails";

type CoinStyleVars = React.CSSProperties & {
  "--final-rotation"?: string;
  "--flip-duration"?: string;
};

type ConfettiStyleVars = React.CSSProperties & {
  "--x"?: string;
  "--y"?: string;
  "--r"?: string;
  "--dur"?: string;
};

export default function CoinFlipGame() {
  const { context } = useMiniApp();

  const { balance: chips, minWagerBalance, chipUsdRate, refresh } = useChips();
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [outcome, setOutcome] = useState<Side | null>(null);
  const [didWin, setDidWin] = useState<boolean | null>(null);
  const [coinPhase, setCoinPhase] = useState<
    "idle" | "spinning" | "landing" | "landed"
  >("idle");
  const [finalRotation, setFinalRotation] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastBet, setLastBet] = useState<number | null>(null);
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
      !isFlipping &&
      didWin === null &&
      outcome === null &&
      selectedSide !== null &&
      Number.isFinite(amount) &&
      amount > 0 &&
      amount <= chips
    );
  }, [isFlipping, didWin, outcome, selectedSide, betAmount, chips]);

  const setQuickAmount = useCallback(
    (amount: number) => setBetAmount(String(amount)),
    []
  );

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showInsufficient, setShowInsufficient] = useState(false);

  const handlePlaceBet = useCallback(async () => {
    const amount = Number(betAmount);
    if (!selectedSide || !Number.isFinite(amount) || amount <= 0) return;
    if (chips < minWagerBalance) {
      setShowInsufficient(true);
      return;
    }
    if (amount > chips) return;
    setIsFlipping(true);
    setOutcome(null);
    setDidWin(null);
    setCoinPhase("spinning");
    setShowConfetti(false);
    setLastBet(amount);
    try {
      const res = await fetchWithAuth("/api/chips/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, side: selectedSide }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Bet failed" }));
        throw new Error(err.error || "Bet failed");
      }
      const data = (await res.json()) as { outcome: Side; didWin: boolean };
      // Show animation matching outcome
      const flipTo = data.outcome;
      setFinalRotation(flipTo === "heads" ? 0 : 180);
      setCoinPhase("landing");
      setTimeout(() => {
        setIsFlipping(false);
        setOutcome(flipTo);
        setDidWin(data.didWin);
        setCoinPhase("landed");
        if (data.didWin) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1200);
        }
        const nextBoundary = Math.ceil(Date.now() / 60_000) * 60_000;
        setRoundEndsAt(nextBoundary);
      }, 1200);
      await refresh();
    } catch {
      setIsFlipping(false);
      setCoinPhase("idle");
    }
  }, [betAmount, selectedSide, chips, minWagerBalance, refresh]);

  const resetRound = useCallback(() => {
    setSelectedSide(null);
    setBetAmount("");
    setIsFlipping(false);
    setOutcome(null);
    setDidWin(null);
    setCoinPhase("idle");
    setFinalRotation(0);
    setShowConfetti(false);
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
      <div className="flex items-center justify-between glass-panel px-4 py-3">
        <div>
          <div className="text-xs text-muted-foreground">Next round</div>
          <div className="font-semibold text-foreground">
            {secondsRemaining}s
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Your chips</div>
          <div className="font-semibold text-foreground">{chips}</div>
          <div className="text-[10px] text-muted-foreground">
            ≈ ${(chips * (chipUsdRate || 0.001)).toFixed(3)} USD
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setShowDeposit(true)}
              className="text-xs px-2 py-1 rounded border border-border bg-secondary/70 backdrop-blur-sm text-secondary-foreground"
            >
              ➕ Deposit
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="text-xs px-2 py-1 rounded border border-border bg-secondary/70 backdrop-blur-sm text-secondary-foreground"
            >
              ⬇️ Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary/80 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Claim Section */}

      {/* Visual Coin */}
      <div className="flex items-center justify-center py-4">
        <Coin
          phase={coinPhase}
          finalRotation={finalRotation}
          didWin={didWin}
          outcome={outcome}
          showConfetti={showConfetti}
        />
      </div>

      {/* Choose Side */}
      <div className="glass-panel p-4">
        <div className="mb-3">
          <div className="font-medium">Pick your side</div>
          <div className="text-xs text-muted-foreground">Heads or Tails</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SideButton
            label="Heads"
            selected={selectedSide === "heads"}
            disabled={isFlipping || outcome !== null}
            onClick={() => setSelectedSide("heads")}
          />
          <SideButton
            label="Tails"
            selected={selectedSide === "tails"}
            disabled={isFlipping || outcome !== null}
            onClick={() => setSelectedSide("tails")}
          />
        </div>
      </div>

      {/* Bet Amount */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="bet-amount" className="font-medium">
            Bet amount
          </Label>
          <div className="text-xs text-muted-foreground">Max: {chips}</div>
        </div>
        <Input
          id="bet-amount"
          inputMode="numeric"
          className="text-black"
          pattern="[0-9]*"
          placeholder="Enter chips"
          value={betAmount}
          disabled={isFlipping || outcome !== null}
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
              disabled={chips === 0 || isFlipping || outcome !== null}
              className={cn(
                "text-sm py-2 rounded-md border border-border bg-secondary/70 backdrop-blur-sm text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed",
                idx === 3 && "font-medium"
              )}
            >
              {idx === 3 ? "MAX" : amt}
            </button>
          ))}
        </div>
        <Button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet || chips < minWagerBalance}
          isLoading={isFlipping}
        >
          {isFlipping
            ? "Flipping..."
            : chips < minWagerBalance
            ? `You need at least ${minWagerBalance} chips ($${(
                minWagerBalance * (chipUsdRate || 0.001)
              ).toFixed(2)})`
            : "Place Bet"}
        </Button>
        {didWin !== null && outcome && (
          <div
            className={cn(
              "mt-2 rounded-md border border-border p-3 text-center animate-fade-in-up",
              didWin
                ? "bg-gradient-to-r from-primary/25 to-primary/5 text-primary-foreground"
                : "bg-secondary/70 text-secondary-foreground"
            )}
          >
            <div className="text-sm font-medium">
              {didWin ? "You won!" : "You lost this round"}
            </div>
            {lastBet !== null && (
              <div className="text-xs opacity-80">
                {didWin ? "+" : "-"}
                {lastBet} chips on {outcome.toUpperCase()}
              </div>
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

      {/* Leaderboard Preview */}
      <div className="glass-panel p-4">
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
      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} />
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
      />
      <InsufficientBalanceModal
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        onDeposit={() => {
          setShowInsufficient(false);
          setShowDeposit(true);
        }}
      />
    </div>
  );
}

function SideButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-3 rounded-lg border text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        selected
          ? "bg-primary text-primary-foreground border-border"
          : "bg-secondary text-secondary-foreground border-border"
      )}
      disabled={disabled}
    >
      <span className="text-lg">{label === "Heads" ? "🙂" : "🦅"}</span>
      <div className="text-sm mt-1">{label}</div>
    </button>
  );
}

function Coin({
  phase,
  finalRotation,
  didWin,
  outcome,
  showConfetti,
}: {
  phase: "idle" | "spinning" | "landing" | "landed";
  finalRotation: number;
  didWin: boolean | null;
  outcome: Side | null;
  showConfetti: boolean;
}) {
  const isSpinning = phase === "spinning";
  const isLanding = phase === "landing";
  const isLanded = phase === "landed";
  const coinStateClass = cn(
    "coin3d",
    isLanded && didWin === true && "coin3d--win",
    isLanded && didWin === false && "coin3d--lose"
  );
  return (
    <div className={coinStateClass}>
      <div
        className={cn(
          "coin3d__inner",
          isSpinning && "is-spinning",
          isLanding && "is-flipping"
        )}
        style={
          {
            "--final-rotation": `${finalRotation}deg`,
            "--flip-duration": "1200ms",
          } as CoinStyleVars
        }
      >
        <div className="coin3d__shine" />
        <div className="coin3d__face coin3d__face--front text-2xl">🙂</div>
        <div className="coin3d__face coin3d__face--back text-2xl">🦅</div>
      </div>
      {showConfetti && (
        <div className="confetti-burst">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const dist = 60 + Math.random() * 40;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist + 40;
            const hue = Math.floor(200 + Math.random() * 120);
            const dur = 700 + Math.random() * 600;
            const rot = Math.floor(Math.random() * 180);
            return (
              <div
                key={i}
                className="confetti-piece"
                style={
                  {
                    "--x": `${x}px`,
                    "--y": `${y}px`,
                    "--r": `${rot}deg`,
                    "--dur": `${dur}ms`,
                    background: `hsl(${hue} 80% 60%)`,
                  } as ConfettiStyleVars
                }
              />
            );
          })}
        </div>
      )}
      {isLanded && outcome && (
        <div className="mt-3 text-center text-sm text-muted-foreground">
          Landed on {outcome}
        </div>
      )}
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
