import type { Metadata } from "next";
import { Activity } from "@/components/dashboard/Activity";

export const metadata: Metadata = { title: "activity" };

export default function ActivityPage() {
  return <Activity />;
}
