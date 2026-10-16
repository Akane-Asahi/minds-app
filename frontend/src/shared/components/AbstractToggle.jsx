/**
 * AbstractToggle Component
 *
 * Collapsed: strictly 2-line preview with measurement-based truncation.
 * When truncated: "{text}…" + NBSP + "Read more" (inline, same Typography).
 * When fits: full text only, no ellipsis, no toggle.
 * Expanded: full text + inline "Show less".
 * Robust to global line-height overrides.
 */

import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { ABSTRACT, TYPOGRAPHY } from "../../theme/uiTokens";
import { useTruncatedText } from "../../hooks/useTruncatedText";

export default function AbstractToggle({
  abstractText,
  clampLines = ABSTRACT.clampLines,
  show = true,
  onExpand,
  onCollapse,
}) {
  const {
    containerRef,
    typographyRef,
    hasText,
    isExpanded,
    needsTruncation,
    showToggle,
    displayText,
    toggle,
  } = useTruncatedText({
    text: abstractText,
    clampLines,
    show,
    fontSize: ABSTRACT.fontSize,
    fontWeight: 400,
    lineHeight: ABSTRACT.lineHeight,
    fontSizePx: ABSTRACT.fontSizePx,
  });

  const handleToggle = (e) => {
    const next = !isExpanded;
    toggle(e);
    if (next) onExpand?.();
    else onCollapse?.();
  };

  const baseSx = {
    color: ABSTRACT.color,
    wordBreak: "break-word",
    lineHeight: ABSTRACT.lineHeight,
    margin: "0 !important",
    marginTop: "0 !important",
    marginBottom: "0 !important",
    mt: "0 !important",
    mb: "0 !important",
  };

  if (!hasText) return null;

  return (
    <Box sx={{ mt: 0.25, mb: 0 }}>
      <Box ref={containerRef} sx={{ position: "relative" }}>
        <Typography
          ref={typographyRef}
          variant="body1"
          component="p"
          sx={baseSx}
        >
          {displayText}
          {showToggle && (
            <>
              {needsTruncation && !isExpanded ? "…" : ""}
              {" "}
              <Link
                component="button"
                type="button"
                onClick={handleToggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(e);
                  }
                }}
                underline="hover"
                aria-expanded={isExpanded}
                sx={{
                  p: 0,
                  display: "inline",
                  verticalAlign: "baseline",
                  fontWeight: TYPOGRAPHY.link.fontWeight,
                  fontSize: "inherit",
                  color: ABSTRACT.linkColor,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "Show less" : "Read more"}
              </Link>
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
