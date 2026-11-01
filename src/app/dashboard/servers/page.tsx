import type { Metadata } from "next";
import { Suspense } from "react";
import { ServersRoute } from "@/components/dashboard/Servers";

export const metadata: Metadata = { title: "servers" };

// The list, or one box when the URL carries ?id=. Search params are read in the browser,
// so they sit behind a boundary; the panel itself only ever renders client-side (see ../layout.tsx).
export default function ServersPage() {
  return (
    <Suspense>
      <ServersRoute />
    </Suspense>
  );
}
