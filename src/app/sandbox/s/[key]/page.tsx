import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SandboxScreen from "@/components/sandbox/sandbox-screen";
import { isSandboxKey } from "@/lib/sandbox";

/**
 * The link you hand someone.
 *
 * No session and no sign-in: the key in the path is the whole permission, and a
 * wrong key is a 404 rather than a redirect, so the page does not advertise
 * itself to anyone guessing at paths. The demo behind it never talks to the
 * server, so there is nothing here to abuse once it is open.
 */
export const metadata: Metadata = {
  title: "QuizKeen — demo",
  robots: { index: false, follow: false },
};

export default function SandboxSharedPage({ params }: { params: { key: string } }) {
  if (!isSandboxKey(params.key)) notFound();

  return <SandboxScreen note="Delad demolänk — inget sparas och inget konto behövs." />;
}
