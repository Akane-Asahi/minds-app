import React, { useState, useCallback } from "react";
import { IconButton, CircularProgress } from "@mui/material";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";

/**
 * Single control for save / unsave: outline = not saved, filled = saved.
 */
export default function BookmarkSaveButton({
  saved = false,
  disabled = false,
  onToggle,
  "aria-label": ariaLabel = "Save document",
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(
    async (e) => {
      e?.stopPropagation?.();
      if (disabled || busy || typeof onToggle !== "function") return;
      setBusy(true);
      try {
        await onToggle();
      } finally {
        setBusy(false);
      }
    },
    [disabled, busy, onToggle]
  );

  return (
    <IconButton
      data-testid="bookmark-save"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-label={saved ? "Remove from saved" : ariaLabel}
      aria-pressed={saved}
      sx={{
        width: 36,
        height: 36,
        background: "transparent",
        border: "none",
        borderRadius: "10px",
        color: "inherit",
        padding: 0,
        boxShadow: "none",
        flexShrink: 0,
      }}
    >
      {busy ? (
        <CircularProgress size={18} thickness={5} sx={{ color: "primary.main" }} />
      ) : saved ? (
        <BookmarkIcon sx={{ width: 22, height: 22, color: "primary.main" }} />
      ) : (
        <BookmarkBorderIcon sx={{ width: 22, height: 22, color: "primary.main" }} />
      )}
    </IconButton>
  );
}
