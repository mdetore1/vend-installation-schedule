import { useEffect, useState } from "react";

// Computes a fixed { top, left } for a floating panel anchored below (or,
// if there isn't room, above) a trigger element — keeping dropdowns/popovers
// fully on-screen instead of relying on ancestor scroll containers.
//
// Recomputes on scroll/resize (rather than closing) so the panel keeps
// following its anchor — this also means scrolling something *inside* the
// panel itself (e.g. a long team list) doesn't get mistaken for "the page
// scrolled" and dismiss the panel out from under the user.
export function useAnchoredPosition(open, anchorRef, { width = 240, height = 260, margin = 8 } = {}) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }

    function compute() {
      const rect = anchorRef.current.getBoundingClientRect();
      let left = Math.min(rect.left, window.innerWidth - width - margin);
      left = Math.max(left, margin);
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < height + margin && rect.top > height + margin;
      const top = placeAbove ? Math.max(rect.top - height - margin, margin) : rect.bottom + margin;
      setPos({ top, left });
    }

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef]);

  return pos;
}

// Computes a fixed { top, left } for a small tooltip centered directly above
// (or, if there isn't room, below) its anchor — used for hover tooltips that
// need to render via a portal so they're never clipped or covered by a
// sticky header/column sitting in a higher stacking tier than the anchor.
export function useCenteredTooltipPosition(open, anchorRef, { width = 200, height = 50, margin = 8 } = {}) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }

    function compute() {
      const rect = anchorRef.current.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(left, margin), window.innerWidth - width - margin);
      const placeAbove = rect.top > height + margin;
      const top = placeAbove ? rect.top - height - margin : rect.bottom + margin;
      setPos({ top, left });
    }

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef]);

  return pos;
}
