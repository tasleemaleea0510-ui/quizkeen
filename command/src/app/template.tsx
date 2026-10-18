/**
 * Every route change enters the same way.
 *
 * `template` remounts on navigation (unlike `layout`), which is exactly the hook
 * a page transition needs: no router events, no exit animation to keep in sync,
 * just a fresh element that plays once per screen.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
