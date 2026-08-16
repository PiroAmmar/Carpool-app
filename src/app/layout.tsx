import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "./RegisterSW";

// Display/UI face — technical grotesk with a bit of edge, per the design
// system. Swap for General Sans/Neue Montreal (via Fontshare) later if
// you want an exact match to the plan; Space Grotesk is the closest
// free Google Font in the same family in the meantime.
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

// Data/numerals face — reserved specifically for seat counts, rates,
// and trip times, so they read like a dashboard readout.
const dataFont = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ammar FAST carpool",
  description: "Seat booking for the FAST campus carpool — Syed Ammar Ali",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Carpool Hub",
  },
};

export const viewport = {
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${dataFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Fixed grain — physical texture, never on scrolling containers. */}
        <div className="grain-overlay" aria-hidden />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
