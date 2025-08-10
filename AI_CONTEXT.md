# AI Context for Farcaster Mini App Starter Kit

## Project Purpose

A starter kit for building Farcaster mini-apps with Next.js, TypeScript, and QuickAuth.

## Key Conventions

- Use wallet auth: gate UI with `wagmi` connection + sign-in.
- Use `verifyWalletAuth` in protected API routes.
- Use semantic Tailwind color classes.
- Place UI components in `src/components/ui/`.
- Place API routes in `src/app/api/`.
- Use TypeScript everywhere.

## File Structure

- `src/lib/auth.ts`: Auth utilities
- `src/app/api/`: API routes
- `src/components/`: UI components
- `src/app/globals.css`: Theme variables
- `tailwind.config.ts`: Tailwind config

## Public vs Protected

- `/` and `/api/auth/*` are public.
- All other routes require authentication.

## Example Usage

```typescript
// Client sign-in (SIWE-like)
const signature = await signMessageAsync({ message });
await fetch("/api/auth", {
  method: "POST",
  body: JSON.stringify({ address, message, signature }),
});
```

For API

```typescript
export async function POST(request: Request) {
  // Verify wallet session
  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Perform the rest
}
```

## Build with Farcaster

Reference the link -> https://miniapps.farcaster.xyz/llms.txt for any Farcaster SDK related query.

## Query with Neynar

Reference the link -> https://docs.neynar.com/llms.txt for any data fetch query from Neynar.
