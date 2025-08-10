export const APP_URL = process.env.NEXT_PUBLIC_URL!;
export const APP_NAME = process.env.NEXT_PUBLIC_FRAME_NAME;
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_FRAME_DESCRIPTION;
export const APP_PRIMARY_CATEGORY = process.env.NEXT_PUBLIC_FRAME_PRIMARY_CATEGORY;
export const APP_TAGS = process.env.NEXT_PUBLIC_FRAME_TAGS?.split(',');
export const APP_ICON_URL = `${APP_URL}/icon.png`;
export const APP_OG_IMAGE_URL = `${APP_URL}/api/opengraph-image`;
export const APP_SPLASH_URL = `${APP_URL}/splash.png`;
export const APP_SPLASH_BACKGROUND_COLOR = "#f7f7f7";
export const APP_BUTTON_TEXT = process.env.NEXT_PUBLIC_FRAME_BUTTON_TEXT;
export const APP_WEBHOOK_URL = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID 
    ? `https://api.neynar.com/f/app/${process.env.NEYNAR_CLIENT_ID}/event`
    : `${APP_URL}/api/webhook`;
export const USE_WALLET = process.env.NEXT_PUBLIC_USE_WALLET === 'true';

// Chips & Wallet Configuration
// Conversion: 1 chip = 0.001 USD
export const CHIP_USD_RATE = 0.001;

// All deposits must be sent to this address; withdrawals are paid from it
export const PLATFORM_WALLET_ADDRESS =
  (process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ||
    "0xB18F04b407464CB376eC029Ce5b7f114b1Efa182") as `0x${string}`;

// Network: Base Sepolia testnet for now
export const SUPPORTED_CHAIN_NAME = "base-mainnet";
export const SUPPORTED_CHAIN_ID = 8453; // Base Sepolia chain id

// Required confirmations for on-chain crediting
export const REQUIRED_CONFIRMATIONS = 3;

// Accepted currency for on-chain settlements
export const ACCEPTED_CRYPTO = "ETH";
