import "./globals.css";
import "./dark.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";

const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--sans",
  display: "swap",
});
const boska = localFont({
  src: [
    { path: "./fonts/Boska-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Boska-400i.woff2", weight: "400", style: "italic" },
    { path: "./fonts/Boska-500i.woff2", weight: "500", style: "italic" },
  ],
  variable: "--serif",
  display: "swap",
});
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--mono" });

export const metadata: Metadata = {
  title: "Halte · Stolen means unsellable",
  description: "A digital passport for fine watches. Report one missing and it freezes in a single block; only the owner's quantum-safe ML-DSA-87 key can lift it. On QoreChain.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07070A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${switzer.variable} ${boska.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
