import type { Metadata } from "next";
import { Billing } from "@/components/dashboard/Billing";

export const metadata: Metadata = { title: "billing" };

export default function BillingPage() {
  return <Billing />;
}
