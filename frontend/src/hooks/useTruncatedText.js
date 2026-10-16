import { useCallback, useEffect, useRef, useState } from "react";

/** Reserve width for the toggle suffix so it stays on the same line when the container shrinks. */
const RESERVED_SUFFIX_PX = 80;

function computeTruncation(containerEl, typographyEl, fullText, maxLines, style, suffix) {
  if (!containerEl || !fullText) return { truncated: "", needsTruncation: false };

  const containerWidth = containerEl.offsetWidth;
  if (containerWidth <= 0) return { truncated: fullText, needsTruncation: false };

  const width = Math.max(0, containerWidth - RESERVED_SUFFIX_PX);
  if (width <= 0) return { truncated: fullText, needsTruncation: false };

  const measurer = document.createElement("div");
  measurer.style.position = "absolute";
  measurer.style.visibility = "hidden";
  measurer.style.pointerEvents = "none";
  measurer.style.left = "0";
  measurer.style.top = "0";
  measurer.style.width = `${width}px`;
  measurer.style.whiteSpace = "normal";
  measurer.style.wordBreak = "break-word";
  measurer.style.fontSize = style.fontSize;
  measurer.style.fontWeight = String(style.fontWeight);
  measurer.style.lineHeight = String(style.lineHeight);
  measurer.style.fontFamily = "inherit";
  measurer.style.margin = "0";
  measurer.style.padding = "0";

  const textSpan = document.createElement("span");
  const suffixSpan = document.createElement("span");
  suffixSpan.style.whiteSpace = "nowrap";
  suffixSpan.textContent = suffix;
  measurer.appendChild(textSpan);
  measurer.appendChild(suffixSpan);

  containerEl.appendChild(measurer);

  const lineHeightPx = typographyEl
    ? parseFloat(getComputedStyle(typographyEl).lineHeight)
    : 0;
  const fallbackLineHeight =
    (style.fontSizePx ?? parseFloat(style.fontSize)) *
    (typeof style.lineHeight === "number" ? style.lineHeight : parseFloat(style.lineHeight));
  const effectiveLineHeight = lineHeightPx > 0 ? lineHeightPx : fallbackLineHeight;
  // +1px tolerance: scrollHeight is an integer, effectiveLineHeight/maxHeight are floats, so a
  // height that's genuinely N lines can round to 1px above N*lineHeight and fail a strict <=
  // check for every length in that line — collapsing the whole line, not just trimming a
  // character. Fixed 1px is enough slack for that rounding without meaningfully changing which
  // line the boundary falls on.
  const maxHeight = effectiveLineHeight * maxLines + 1;

  textSpan.textContent = fullText;
  suffixSpan.style.display = "none";
  if (measurer.scrollHeight <= maxHeight) {
    containerEl.removeChild(measurer);
    return { truncated: fullText, needsTruncation: false };
  }

  suffixSpan.style.display = "";
  let low = 0;
  let high = fullText.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    textSpan.textContent = fullText.slice(0, mid);
    if (measurer.scrollHeight <= maxHeight) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  containerEl.removeChild(measurer);
  const truncated = fullText.slice(0, best).trimEnd();
  return { truncated, needsTruncation: true };
}

/**
 * Measurement-based multi-line truncation with an expand/collapse toggle.
 * Re-measures against the actual rendered line-height (not an assumed constant), so it
 * stays correct under text-spacing overrides (WCAG 1.4.12) instead of silently clipping more.
 *
 * `fontSize` must match the real rendered element, since the measurer is offscreen and
 * has no other way to know it. `lineHeight` is a unitless multiplier (or fallback px
 * string) — `fontSizePx` backs the fallback calc when the real px size isn't available.
 * `suffix` reserves width for "… Read more" during measurement; the caller renders the
 * visible suffix itself. `show=false` makes the hook inert, mirroring AbstractToggle's
 * own `show` prop.
 */
export function useTruncatedText({
  text,
  clampLines,
  fontSize,
  fontWeight = 400,
  lineHeight,
  fontSizePx,
  suffix = "… Read more",
  show = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [truncated, setTruncated] = useState("");
  const [needsTruncation, setNeedsTruncation] = useState(true);
  const containerRef = useRef(null);
  const typographyRef = useRef(null);
  const debounceRef = useRef(null);

  const fullText = (text || "").trim();
  const hasText = Boolean(show && fullText);

  const toggle = useCallback((e) => {
    e?.stopPropagation?.();
    setIsExpanded((prev) => !prev);
  }, []);

  const runTruncation = useCallback(() => {
    if (!containerRef.current || isExpanded) return;
    const typographyEl = typographyRef.current || containerRef.current?.firstElementChild;
    const { truncated: t, needsTruncation: n } = computeTruncation(
      containerRef.current,
      typographyEl,
      fullText,
      clampLines,
      { fontSize, fontWeight, lineHeight, fontSizePx },
      suffix
    );
    setTruncated(t);
    setNeedsTruncation(n);
  }, [fullText, clampLines, isExpanded, fontSize, fontWeight, lineHeight, fontSizePx, suffix]);

  useEffect(() => {
    if (!hasText) return;
    if (!isExpanded) {
      const id = requestAnimationFrame(() => runTruncation());
      return () => cancelAnimationFrame(id);
    }
  }, [hasText, isExpanded, runTruncation]);

  useEffect(() => {
    if (!hasText) return;

    const resizeObserver = new ResizeObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!isExpanded) runTruncation();
      }, 150);
    });

    const el = containerRef.current;
    if (el) resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hasText, isExpanded, runTruncation]);

  const displayText = isExpanded ? fullText : truncated || fullText.slice(0, 60);
  const showToggle = hasText && (isExpanded || needsTruncation);

  return {
    containerRef,
    typographyRef,
    hasText,
    isExpanded,
    needsTruncation,
    showToggle,
    displayText,
    toggle,
  };
}
