/**
 * useIsTruncated — detects if an element's text is truncated (ellipsis visible).
 * Use with elements that have overflow: hidden and textOverflow: ellipsis (single line)
 * or -webkit-line-clamp (multi-line).
 * Returns [ref, isTruncated]. Use isTruncated for aria-label when text is ellipsized.
 * @param {Array} deps - dependency array for the effect (e.g. [text])
 * @param {{ multiLine?: boolean }} [opts] - if true, use scrollHeight > clientHeight (line-clamp)
 */
import { useState, useLayoutEffect, useRef } from "react";

export function useIsTruncated(deps = [], opts = {}) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const multiLine = opts.multiLine === true;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (multiLine) {
        setIsTruncated(el.scrollHeight > el.clientHeight);
      } else {
        setIsTruncated(el.scrollWidth > el.clientWidth);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps from caller; multiLine from opts
  }, [...(Array.isArray(deps) ? deps : []), multiLine]);

  return [ref, isTruncated];
}
