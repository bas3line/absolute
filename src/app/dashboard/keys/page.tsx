import type { Metadata } from "next";
import { Keys } from "@/components/dashboard/Keys";

export const metadata: Metadata = { title: "keys" };

export default function KeysPage() {
  return <Keys />;
}
