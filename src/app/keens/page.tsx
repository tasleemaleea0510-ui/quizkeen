import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getKeenView } from "./_data";
import CollectionClient from "@/components/keens/collection-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keens · QuizKeen",
  description: "Samla Keens, öppna paket och handla i marknaden.",
};

export default async function KeensPage() {
  const { user, profile, state } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile || !state) redirect("/register");

  return <CollectionClient state={state} />;
}
