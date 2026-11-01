import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Doto, IBM_Plex_Mono, Rethink_Sans } from "next/font/google";
import "./globals.css";

const rethink = Rethink_Sans({
  variable: "--font-rethink",
  subsets: ["latin"],
});

// Display face for headlines: heavy, tight, with opsz so it sharpens as it grows.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "wdth"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  // Placeholder origin until the real domain exists.
  metadataBase: new URL("https://absolute.example"),
  title: "absolute — servers that never learn your name",
  description:
    "Anonymous VPS and VDS in eight locations, and Blackbox: a VPS whose memory the host cannot read. No email, no KYC, no logs. Pay in crypto, cash or card.",
  openGraph: {
    title: "absolute — servers that never learn your name",
    description: "Anonymous VPS and VDS in eight locations, and Blackbox, the zero-knowledge VPS. No email, no KYC, no logs.",
  },
};

export const viewport: Viewport = {
  themeColor: "#e9e9e9",
};

// Typed by hand: LayoutProps only exists once `next build` has generated its types, and CI typechecks first.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      // Smooth for in-page anchors, instant for route changes into /dashboard.
      data-scroll-behavior="smooth"
      className={`${rethink.variable} ${bricolage.variable} ${plexMono.variable} ${doto.variable} antialiased`}
    >
      <head>
        {/* Reveal hides blocks until script shows them. Without script (Tor Browser on Safest,
            NoScript), nothing would ever show them, so they start visible. */}
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-dvh bg-bg text-ink">{children}</body>
    </html>
  );
}
