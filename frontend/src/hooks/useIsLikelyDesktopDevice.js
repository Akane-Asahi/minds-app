import { useEffect, useState } from "react";

/**
 * Like a min-width media query, but based on the physical screen resolution
 * (window.screen.width) instead of the current CSS viewport width.
 *
 * A plain `useMediaQuery('(min-width: Npx)')` responds to browser zoom, not just
 * window/device size — zooming in to enlarge text (WCAG 1.4.4) narrows the effective
 * CSS viewport, which would incorrectly trip a "desktop only" gate on real desktop
 * hardware. window.screen.width reflects the display's actual resolution and is
 * unaffected by in-page zoom, so it stays a true device-size check.
 */
export function useIsLikelyDesktopDevice(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.screen?.width >= minWidth
  );

  useEffect(() => {
    const check = () => setIsDesktop(window.screen?.width >= minWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [minWidth]);

  return isDesktop;
}
