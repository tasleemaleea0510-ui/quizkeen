import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getKeenView } from "../_data";
import MarketClient from "@/components/keens/market-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keens — marknad · QuizKeen",
  description: "Köp och sälj Keens för mynt. Nya deals varje dag.",
};

export default async function KeenMarketPage() {
  const { user, profile, state, top } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile || !state) redirect("/register");

  return <MarketClient state={state} top={top} />;
}
