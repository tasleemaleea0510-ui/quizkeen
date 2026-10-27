/**
 * The colour behind everything.
 *
 * Three soft, slowly drifting fields plus a mesh that shifts hue over the whole
 * screen, instead of a flat gradient, so the page never looks like a
 * screenshot. Pure CSS transforms on blurred layers: no canvas, no JavaScript,
 * and it stops dead for reduced-motion users thanks to the global media query.
 */
export default function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="aurora-mesh" />
      <span className="aurora-blob aurora-a" />
      <span className="aurora-blob aurora-b" />
      <span className="aurora-blob aurora-c" />
      <span className="aurora-grid" />
    </div>
  );
}
