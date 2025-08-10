"use client";

import { useMemo, useState } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/frame-sdk";
import { useMiniApp } from "@neynar/react";
import { Button } from "~/components/ui/Button";

type HeaderProps = {
  neynarUser?: {
    fid: number;
    score: number;
  } | null;
};

export function Header({ neynarUser }: HeaderProps) {
  const { context, actions, added } = useMiniApp();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [hasClickedPfp, setHasClickedPfp] = useState(false);
  const addressShort = useMemo(() => {
    const addr = context?.user?.verifiedAddresses?.ethAddresses?.[0];
    if (!addr) return null;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }, [context?.user?.verifiedAddresses?.ethAddresses]);

  return (
    <div className="relative">
      <div className="mb-1 py-2 px-3 bg-card text-card-foreground rounded-lg flex items-center justify-between border-[3px] border-double border-primary">
        <div className="text-lg font-light">Welcome to {APP_NAME}!</div>
        {context?.user ? (
          <div
            className="cursor-pointer"
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setHasClickedPfp(true);
            }}
          >
            {context.user.pfpUrl && (
              <img
                src={context.user.pfpUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-primary"
              />
            )}
          </div>
        ) : (
          <div className="ml-2">
            <Button
              onClick={actions.addMiniApp}
              disabled={added}
              className="max-w-none px-3 py-2 text-sm"
            >
              {added ? "Added" : "Add Mini App"}
            </Button>
          </div>
        )}
      </div>
      {context?.user && (
        <>
          {!hasClickedPfp && (
            <div className="absolute right-0 -bottom-6 text-xs text-primary flex items-center justify-end gap-1 pr-2">
              <span className="text-[10px]">↑</span> Click PFP!{" "}
              <span className="text-[10px]">↑</span>
            </div>
          )}

          {isUserDropdownOpen && (
            <div className="absolute top-full right-0 z-50 w-fit mt-1 bg-card text-card-foreground rounded-lg shadow-lg border border-border">
              <div className="p-3 space-y-2">
                <div className="text-right">
                  <h3
                    className="font-bold text-sm hover:underline cursor-pointer inline-block text-foreground"
                    onClick={() =>
                      sdk.actions.viewProfile({ fid: context.user.fid })
                    }
                  >
                    {context.user.displayName || context.user.username}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    @{context.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    FID: {context.user.fid}
                  </p>
                  {addressShort && (
                    <p className="text-xs text-muted-foreground">
                      Wallet: {addressShort}
                    </p>
                  )}
                  {neynarUser && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Neynar Score: {neynarUser.score}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
