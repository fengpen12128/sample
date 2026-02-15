import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LiquidGlassDefs } from "@/components/ui/liquid-glass-defs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Trade Records",
    template: "%s | Trade Records",
  },
  description: "Track and review trade records with an infinite stream view.",
  applicationName: "Trade Records",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon?size=180", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trade Records",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["light", "dark", "hyperdash"]}
          enableSystem
          disableTransitionOnChange
        >
          <LiquidGlassDefs />
          <PwaRegister />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
