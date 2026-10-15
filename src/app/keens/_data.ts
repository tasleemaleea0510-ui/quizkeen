import { cache } from "react";
import { getViewer } from "@/lib/viewer";
import { loadKeenState, topCollectors, type KeenState } from "@/lib/keens-store";

export type KeenTop = { id: string; username: string; role: string; count: number };

/**
 * One Keen read per request, shared by the layout (which shows the wallet) and
 * the page (which shows the collection). Without this the tabs would query the
 * same rows twice on every navigation.
 */
export const getKeenView = cache(async () => {
  const { user, profile } = await getViewer();
  if (!user || !profile) {
    return { user: null, profile: null, state: null as KeenState | null, top: [] as KeenTop[] };
  }

  const [state, top] = await Promise.all([
    loadKeenState(user.id).catch(() => null),
    topCollectors().catch(() => [] as KeenTop[]),
  ]);

  return { user, profile, state, top };
});
