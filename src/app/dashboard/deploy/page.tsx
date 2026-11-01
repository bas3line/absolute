import type { Metadata } from "next";
import { Deploy } from "@/components/dashboard/Deploy";

export const metadata: Metadata = { title: "deploy" };

export default function DeployPage() {
  return <Deploy />;
}
