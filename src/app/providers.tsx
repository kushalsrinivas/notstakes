"use client";

import dynamic from "next/dynamic";
import { MiniAppProvider } from "@neynar/react";
import { ChipsProvider } from "~/components/ui/ChipsProvider";

const WagmiProvider = dynamic(
  () => import("~/components/providers/WagmiProvider"),
  {
    ssr: false,
  }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider>
      <MiniAppProvider analyticsEnabled={true}>
        <ChipsProvider>{children}</ChipsProvider>
      </MiniAppProvider>
    </WagmiProvider>
  );
}
