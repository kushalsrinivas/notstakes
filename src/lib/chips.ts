import { Redis } from "@upstash/redis";
import { APP_NAME } from "./constants";

type TransactionBase = {
  id: string;
  amount: number; // positive integer chips
  timestamp: number; // epoch ms
};

export type DepositTransaction = TransactionBase & {
  type: "deposit";
  status: "pending" | "processed";
  txHash?: `0x${string}`;
};

export type WithdrawTransaction = TransactionBase & {
  type: "withdraw";
  status: "pending" | "processed";
  destination?: string;
  txHash?: `0x${string}`;
};

export type BetWinTransaction = TransactionBase & {
  type: "bet_win";
  status: "processed";
  side: "heads" | "tails";
};

export type BetLossTransaction = TransactionBase & {
  type: "bet_loss";
  status: "processed";
  side: "heads" | "tails";
};

export type ChipTransaction =
  | DepositTransaction
  | WithdrawTransaction
  | BetWinTransaction
  | BetLossTransaction;

const useRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
const redis = useRedis
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

const localStore = new Map<string, unknown>();

function balanceKey(address: string) {
  return `${APP_NAME}:wallet:${address.toLowerCase()}:balance`;
}

function txKey(address: string) {
  return `${APP_NAME}:wallet:${address.toLowerCase()}:txs`;
}

function depositIntentKey(address: string) {
  return `${APP_NAME}:wallet:${address.toLowerCase()}:deposit-intent`;
}

export async function getUserBalance(address: string): Promise<number> {
  const key = balanceKey(address);
  if (redis) {
    const val = await redis.get<number>(key);
    return typeof val === "number" ? val : 0;
  }
  const val = localStore.get(key);
  return typeof val === "number" ? val : 0;
}

async function setUserBalance(address: string, newBalance: number): Promise<void> {
  const key = balanceKey(address);
  if (redis) {
    await redis.set(key, newBalance);
  } else {
    localStore.set(key, newBalance);
  }
}

async function addTransaction(address: string, tx: ChipTransaction): Promise<void> {
  const key = txKey(address);
  if (redis) {
    await redis.lpush(key, JSON.stringify(tx));
  } else {
    const existing = (localStore.get(key) as string[]) || [];
    existing.unshift(JSON.stringify(tx));
    localStore.set(key, existing);
  }
}

export async function setDepositIntent(address: string, amountChips: number): Promise<void> {
  const key = depositIntentKey(address);
  if (redis) {
    await redis.set(key, amountChips, { ex: 60 * 30 }); // 30m expiry
  } else {
    localStore.set(key, amountChips);
  }
}

export async function getDepositIntent(address: string): Promise<number | null> {
  const key = depositIntentKey(address);
  if (redis) {
    const v = await redis.get<number>(key);
    return typeof v === "number" ? v : null;
  }
  const v = localStore.get(key);
  return typeof v === "number" ? v : null;
}

export async function listTransactions(
  address: string,
  limit = 50
): Promise<ChipTransaction[]> {
  const key = txKey(address);
  if (redis) {
    const raw = await redis.lrange<string>(key, 0, limit - 1);
    return raw.map((s) => JSON.parse(s) as ChipTransaction);
  }
  const arr = (localStore.get(key) as string[]) || [];
  return arr.slice(0, limit).map((s) => JSON.parse(s) as ChipTransaction);
}

export async function recordPendingDeposit(
  address: string,
  amount: number,
  txHash: `0x${string}`
): Promise<void> {
  const tx: DepositTransaction = {
    id: generateId(),
    type: "deposit",
    amount,
    timestamp: Date.now(),
    status: "pending",
    txHash,
  };
  await addTransaction(address, tx);
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore compat for Node/Web crypto typing
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function assertPositiveInteger(name: string, amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export async function depositChips(address: string, amount: number) {
  assertPositiveInteger("amount", amount);
  const current = await getUserBalance(address);
  const next = current + amount;
  await setUserBalance(address, next);
  const tx: DepositTransaction = {
    id: generateId(),
    type: "deposit",
    amount,
    timestamp: Date.now(),
    status: "processed",
  };
  await addTransaction(address, tx);
  return { balance: next, transactionId: tx.id };
}

export async function withdrawChips(
  address: string,
  amount: number,
  destination?: string,
  txHash?: `0x${string}`
) {
  assertPositiveInteger("amount", amount);
  const current = await getUserBalance(address);
  if (amount > current) {
    throw new Error("Insufficient balance");
  }
  const next = current - amount;
  await setUserBalance(address, next);
  const tx: WithdrawTransaction = {
    id: generateId(),
    type: "withdraw",
    amount,
    timestamp: Date.now(),
    status: "pending",
    destination,
    txHash,
  };
  await addTransaction(address, tx);
  return { balance: next, requestId: tx.id };
}

export async function placeBet(
  address: string,
  params: { amount: number; side: "heads" | "tails" }
) {
  const { amount, side } = params;
  assertPositiveInteger("amount", amount);
  const current = await getUserBalance(address);
  if (current < 10) {
    throw new Error("Minimum balance of 10 chips required to place a wager");
  }
  if (amount > current) {
    throw new Error("Bet amount exceeds balance");
  }

  const outcome: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
  const didWin = outcome === side;
  const next = didWin ? current + amount : current - amount;
  await setUserBalance(address, next);

  const tx: ChipTransaction = didWin
    ? {
        id: generateId(),
        type: "bet_win",
        amount,
        timestamp: Date.now(),
        status: "processed",
        side,
      }
    : {
        id: generateId(),
        type: "bet_loss",
        amount,
        timestamp: Date.now(),
        status: "processed",
        side,
      };
  await addTransaction(address, tx);

  return { outcome, didWin, balance: next };
}


