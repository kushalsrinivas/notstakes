import { createPublicClient, createWalletClient, http, Chain } from "viem";
import { base, baseSepolia } from "viem/chains";
import { ACCEPTED_CRYPTO, PLATFORM_WALLET_ADDRESS, REQUIRED_CONFIRMATIONS, SUPPORTED_CHAIN_ID } from "./constants";

export const CHAIN: Chain = SUPPORTED_CHAIN_ID === baseSepolia.id ? baseSepolia : base;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

export async function getWalletClientFromPrivateKey() {
  const pk = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (!pk) return null;
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ chain: CHAIN, transport: http(), account });
}

export async function getConfirmations(txHash: `0x${string}`): Promise<number | null> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt || !receipt.blockNumber) return null;
  const currentBlock = await publicClient.getBlockNumber();
  const confirmations = Number(currentBlock - receipt.blockNumber + 1n);
  return confirmations;
}

export function isConfirmed(confirmations: number | null) {
  return confirmations !== null && confirmations >= REQUIRED_CONFIRMATIONS;
}


