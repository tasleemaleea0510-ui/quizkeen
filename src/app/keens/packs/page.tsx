import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getKeenView } from "../_data";
import PacksClient from "@/components/keens/packs-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keens — paket · QuizKeen",
  description: "Öppna paket och få nya Keens. Gratispaket varje dag.",
};

export default async function KeenPacksPage() {
  const { user, profile, state } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile || !state) redirect("/register");

  return <PacksClient state={state} />;
}
