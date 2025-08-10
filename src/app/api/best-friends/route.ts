import { NextResponse } from 'next/server';
import { verifyWalletAuth } from '~/lib/auth';

export async function GET(request: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;

  const address = await verifyWalletAuth(request);
  if (!address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Neynar API key is not configured. Please add NEYNAR_API_KEY to your environment variables.' },
      { status: 500 }
    );
  }

  // Note: fid is no longer required here as we just use wallet auth to allow request

  try {
    // For demo, use the app user's fid from Neynar context is not available server-side without QuickAuth.
    // You may adjust this later to map wallet -> fid.
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/best_friends?fid=1&limit=3`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.statusText}`);
    }

    const { users } = await response.json() as { users: { user: { fid: number; username: string } }[] };
    const bestFriends = users.map(({ user }) => ({ fid: user.fid, username: user.username }));
    return NextResponse.json({ bestFriends });
  } catch (error) {
    console.error('Failed to fetch best friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch best friends. Please check your Neynar API key and try again.' },
      { status: 500 }
    );
  }
} 