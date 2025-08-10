import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, createCookie, clearCookie, verifyWalletAuth } from '~/lib/auth';
import { z } from 'zod';
import { recoverMessageAddress } from 'viem';

// Simple SIWE-like flow (not full SIWE spec). Message format:
// "Sign in to <host> with address <0x...>\nNonce: <random>\nExpires: <iso>"
// For simplicity we only verify the EIP-191 personal_sign with wagmi client side.

const verifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function GET(request: NextRequest) {
  // Who am I?
  const addr = await verifyWalletAuth(request);
  if (!addr) return NextResponse.json({ address: null });
  return NextResponse.json({ address: addr });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { address, message, signature } = parsed.data;

  try {
    // Verify personal_sign / signMessage using viem helper
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const token = createSessionToken(address);
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
    const cookie = createCookie('session', token, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
    const res = NextResponse.json({ ok: true, address });
    res.headers.set('Set-Cookie', cookie);
    return res;
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie('session'));
  return res;
}


