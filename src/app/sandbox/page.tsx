import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SandboxScreen from "@/components/sandbox/sandbox-screen";
import { sandboxLink } from "@/lib/sandbox";
import { getViewer } from "@/lib/viewer";

/**
 * The owner's own sandbox.
 *
 * Private: a signed-out visitor, or anyone who is not running the site, is sent
 * home without being told the page exists. The shareable demo for a friend is
 * the separate `/sandbox/s/<key>` route — a different door with its own key.
 */
export const metadata: Metadata = {
  title: "Sandlåda — QuizKeen",
  robots: { index: false, follow: false },
};

export default async function SandboxPage() {
  const { profile } = await getViewer();
  const role = profile?.role;
  if (role !== "OWNER" && role !== "ADMIN") redirect("/");

  return (
    <SandboxScreen
      note={`Egen kontrollvy. Dela den hemliga länken i stället: ${sandboxLink()}`}
    />
  );
}
