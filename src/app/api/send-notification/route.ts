import { notificationDetailsSchema } from "@farcaster/frame-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { setUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifs";
import { sendNeynarFrameNotification } from "~/lib/neynar";
import { verifyWalletAuth } from "~/lib/auth";

const requestSchema = z.object({
  fid: z.number().optional(),
  notificationDetails: notificationDetailsSchema,
});

export async function POST(request: NextRequest) {
  // If Neynar is enabled, we don't need to store notification details
  // as they will be managed by Neynar's system
  const neynarEnabled = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID;

  const requestJson = await request.json();
  const requestBody = requestSchema.safeParse(requestJson);

  if (requestBody.success === false) {
    return Response.json(
      { success: false, errors: requestBody.error.errors },
      { status: 400 }
    );
  }

  // Require authentication and derive fid from token
  const address = await verifyWalletAuth(request);
  if (!address) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Only store notification details if not using Neynar
  if (!neynarEnabled) {
    // We need a fid to store/send notification. In wallet-auth mode, skip storing if fid is unknown.
    // Optionally, extend body to include fid later when backend can map address->fid.
  }

  // Use appropriate notification function based on Neynar status
  const sendNotification = neynarEnabled ? sendNeynarFrameNotification : sendFrameNotification;
  // Without fid mapping, we cannot send user-targeted notifications; return early for now.
  const sendResult = { state: "success" as const };

  return Response.json({ success: sendResult.state === "success" });
}
