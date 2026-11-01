import type { IconName } from "./glyphs";

export const NAV: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", hint: "stats, fleet, canary" },
  { href: "/dashboard/servers", label: "Servers", icon: "servers", hint: "every box" },
  { href: "/dashboard/deploy", label: "Deploy", icon: "deploy", hint: "location, plan, system, pay" },
  { href: "/dashboard/billing", label: "Billing", icon: "billing", hint: "balance, renewals, invoices" },
  { href: "/dashboard/keys", label: "Keys", icon: "keys", hint: "ssh keys, the account" },
  { href: "/dashboard/activity", label: "Activity", icon: "activity", hint: "the access log that isn't" },
  { href: "/dashboard/canary", label: "Canary", icon: "canary", hint: "warrant canary" },
];

/** One box's page. A query, not a path segment: the site is a static export, and boxes deployed in the demo get names nobody knows at build time. */
export const serverHref = (id: string) => `/dashboard/servers?id=${encodeURIComponent(id)}`;
