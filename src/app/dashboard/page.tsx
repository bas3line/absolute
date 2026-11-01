import type { Metadata } from "next";
import { Overview } from "@/components/dashboard/Overview";

export const metadata: Metadata = { title: { absolute: "overview · absolute" } };

export default function OverviewPage() {
  return <Overview />;
}
