import type { Metadata } from "next";
import { CanaryView } from "@/components/dashboard/CanaryView";

export const metadata: Metadata = { title: "canary" };

export default function CanaryPage() {
  return <CanaryView />;
}
