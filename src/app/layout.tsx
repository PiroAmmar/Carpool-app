import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "Carpool Hub",
  description: "Seat booking for the campus carpool",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${dataFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
