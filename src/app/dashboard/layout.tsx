import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardApp } from "@/components/dashboard/App";

export const metadata: Metadata = {
  title: { template: "%s · absolute", default: "panel · absolute" },
  description: "The absolute control panel, as a demo. A 32-character credential is the whole account.",
  robots: { index: false, follow: false },
};

// The build never holds a credential, so every exported page is the gate and never the
// page under it; the panel only exists client-side.

// The provider lives here, above every dashboard route, so the in-memory session
// survives navigation between them. Nothing about it is persisted anywhere.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardApp>{children}</DashboardApp>;
}
