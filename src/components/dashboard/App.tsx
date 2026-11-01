"use client";

import type { ReactNode } from "react";
import { Gate } from "./Gate";
import { Shell } from "./Shell";
import { DashProvider, useDash } from "./store";

/**
 * The panel's root, mounted by app/dashboard/layout.tsx so its state survives navigation
 * between dashboard routes. With no credential in memory, every route shows the gate instead.
 * The server never has a credential, so it always renders the gate; the panel only exists client-side.
 */
export function DashboardApp({ children }: { children: ReactNode }) {
  return (
    <DashProvider>
      <Gatekeeper>{children}</Gatekeeper>
    </DashProvider>
  );
}

function Gatekeeper({ children }: { children: ReactNode }) {
  const { state } = useDash();
  return state.credential ? <Shell>{children}</Shell> : <Gate />;
}
