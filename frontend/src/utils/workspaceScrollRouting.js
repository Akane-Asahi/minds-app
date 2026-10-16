/**
 * Workspace scroll ownership: route wheel/trackpad deltas to SERP or Saved Results
 * scroll roots when the cursor is not over a scrollable element that can consume them.
 */

const SERP_ROOT_SELECTOR = '[data-baseline-scroll-root="serp"]';
const SAVED_ROOT_SELECTOR = '[data-baseline-scroll-root="saved-results"]';
const SAVED_PANEL_SELECTOR = '[data-baseline-scroll-panel="saved-results"]';
const SAVED_INNER_SELECTOR = '[data-baseline-scroll-inner="saved-results"]';
const SERP_INNER_SELECTOR = '[data-baseline-scroll-inner="serp"]';

const INTERACTIVE_SELECTOR =
  'input, textarea, select, option, [contenteditable="true"], [role="slider"], [role="listbox"]';

function isScrollable(el) {
  if (!el || el.nodeType !== 1) return false;
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function canScroll(el, deltaY) {
  if (!el || !isScrollable(el)) return false;
  const { scrollTop, scrollHeight, clientHeight } = el;
  const maxTop = scrollHeight - clientHeight;
  if (deltaY < 0) return scrollTop > 0;
  if (deltaY > 0) return scrollTop < maxTop - 1;
  return false;
}

function applyScroll(el, deltaY) {
  el.scrollTop += deltaY;
}

function queryFirst(selector) {
  if (typeof document === "undefined") return null;
  return document.querySelector(selector);
}

function collectSerpTargets(serpRoot) {
  if (!serpRoot) return [];
  const inners = [...serpRoot.querySelectorAll(SERP_INNER_SELECTOR)];
  return [...inners, serpRoot];
}

function collectSavedTargets(savedRoot) {
  if (!savedRoot) return [];
  const inners = [...savedRoot.querySelectorAll(SAVED_INNER_SELECTOR)];
  return [...inners, savedRoot];
}

/** Prefer the scroll target that can consume delta; fall back to any overflow container. */
function pickScrollTarget(candidates, deltaY) {
  for (const el of candidates) {
    if (canScroll(el, deltaY)) return el;
  }
  for (const el of candidates) {
    if (isScrollable(el)) return el;
  }
  return candidates[0] || null;
}

function findConsumableScrollableUnderCursor(target, deltaY, boundaryRoot) {
  let node = target;
  while (node && node !== document.documentElement) {
    if (boundaryRoot && !boundaryRoot.contains(node)) break;
    if (isScrollable(node) && canScroll(node, deltaY)) return node;
    node = node.parentElement;
  }
  return null;
}

function shouldIgnoreTarget(target) {
  return Boolean(target?.closest?.(INTERACTIVE_SELECTOR));
}

function routeWheelEvent(event) {
  const { deltaY, target } = event;
  if (!deltaY || !target || shouldIgnoreTarget(target)) return;

  const savedPanel = target.closest?.(SAVED_PANEL_SELECTOR);
  const savedRoot = queryFirst(SAVED_ROOT_SELECTOR);
  const serpRoot = queryFirst(SERP_ROOT_SELECTOR);

  if (savedPanel && savedRoot) {
    const nativeSaved = findConsumableScrollableUnderCursor(target, deltaY, savedPanel);
    if (nativeSaved) return;

    const savedTarget = pickScrollTarget(collectSavedTargets(savedRoot), deltaY);
    if (savedTarget && canScroll(savedTarget, deltaY)) {
      event.preventDefault();
      applyScroll(savedTarget, deltaY);
      return;
    }

    if (serpRoot) {
      const nativeSerp = findConsumableScrollableUnderCursor(target, deltaY, serpRoot);
      if (nativeSerp) return;

      const serpTarget = pickScrollTarget(collectSerpTargets(serpRoot), deltaY);
      if (serpTarget && canScroll(serpTarget, deltaY)) {
        event.preventDefault();
        applyScroll(serpTarget, deltaY);
      }
    }
    return;
  }

  if (serpRoot) {
    const nativeSerp = findConsumableScrollableUnderCursor(target, deltaY, serpRoot);
    if (nativeSerp) return;

    const serpTarget = pickScrollTarget(collectSerpTargets(serpRoot), deltaY);
    if (serpTarget && canScroll(serpTarget, deltaY)) {
      event.preventDefault();
      applyScroll(serpTarget, deltaY);
    }
  } else if (savedRoot) {
    const nativeSaved = findConsumableScrollableUnderCursor(target, deltaY, savedRoot);
    if (nativeSaved) return;

    const savedTarget = pickScrollTarget(collectSavedTargets(savedRoot), deltaY);
    if (savedTarget && canScroll(savedTarget, deltaY)) {
      event.preventDefault();
      applyScroll(savedTarget, deltaY);
    }
  }
}

let installed = false;

export function installWorkspaceScrollRouting() {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const handler = (event) => {
    if (event.defaultPrevented) return;
    routeWheelEvent(event);
  };

  window.addEventListener("wheel", handler, { capture: true, passive: false });

  return () => {
    window.removeEventListener("wheel", handler, { capture: true });
    installed = false;
  };
}
