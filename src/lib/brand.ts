// The brand's own names. Everything the site sells (plans, prices, locations,
// payments) lives in catalog.ts.

export const brand = {
  name: "absolute",
  tagline: "Servers that never learn your name.",
  // Placeholder until absolute runs its own onion mirror.
  onion: "absolutexq7…onion",
  canaryUpdated: "2026-10-30",
} as const;

// The control panel with the demo credential typed in for you: Gate.tsx unlocks on ?demo.
export const panelDemo = "/dashboard?demo";

export const nav = [
  { label: "Blackbox", href: "#blackbox" },
  { label: "Servers", href: "#servers" },
  { label: "Locations", href: "#regions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Canary", href: "#canary" },
  { label: "FAQ", href: "#faq" },
] as const;
