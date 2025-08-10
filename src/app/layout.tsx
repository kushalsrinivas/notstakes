import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="relative min-h-dvh">
        {/* Subtle radial gradient background for depth */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 600px at 50% 0%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(800px 400px at 80% 100%, rgba(59,130,246,0.10), transparent 60%)",
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
