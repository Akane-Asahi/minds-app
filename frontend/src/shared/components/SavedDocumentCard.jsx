import React, { useState, useCallback } from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import { format as formatDate } from "date-fns";
import { unsaveSavedDocument } from "../libraryService";
import { extractAuthors, extractYear, extractSource, getFullDocumentName } from "../../utils/documentMetadata";
import { buildUReginaPrimoFullDisplayUrl } from "../../utils/primoUrl";
import ResultCardShell from "./ResultCardShell";
import BookmarkSaveButton from "./BookmarkSaveButton";
import { TYPOGRAPHY } from "../../theme/uiTokens";

/**
 * Saved-doc row (bookmark only) — shared by Saved results view; no timeline dependency.
 */
const SavedDocumentCard = React.forwardRef(function SavedDocumentCard(
  {
    doc,
    hideSaveButton = false,
    sx = {},
    query = null,
  },
  ref
) {
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const savedId = doc._id || doc.id;

  const title = getFullDocumentName(doc);
  const titleHref = doc?.doc_url ?? buildUReginaPrimoFullDisplayUrl(doc);
  const authors = extractAuthors(doc);
  const year = extractYear(doc);
  const source = extractSource(doc);
  const metadataLine = [year, authors, source].filter(Boolean).join(" · ");

  const controlNumber = doc?.ControlNumber || doc?.controlNumber;
  const externalId = doc?.externalId || controlNumber;

  const handleTitleClick = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
  }, []);

  const handleToggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (savedId) {
        await unsaveSavedDocument(savedId, { controlNumber, externalId });
      }
      // Success: keep card dimmed while it animates out of the list (context removes it).
    } catch (e) {
      console.error("[SavedDocumentCard] bookmark toggle failed:", e);
      setBusy(false);
      setRemoveError(true);
    }
  }, [busy, savedId, controlNumber, externalId]);

  const showSaved = !!savedId;

  const rightColumn = (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.75 }}>
      {!hideSaveButton && showSaved && (
        <BookmarkSaveButton
          saved={showSaved}
          disabled={busy}
          onToggle={handleToggle}
          aria-label="Remove from saved"
        />
      )}
      {(doc.savedAt || doc.createdAt) && (
        <Typography
          variant="body2"
          sx={{
            color: TYPOGRAPHY.metadata.color,
            letterSpacing: "0.015em",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {(() => {
            const docDate = new Date(doc.savedAt || doc.createdAt);
            const today = new Date();
            const isToday = docDate.toDateString() === today.toDateString();
            const isSameDayAsQuery = query?.createdAt
              ? docDate.toDateString() === new Date(query.createdAt).toDateString()
              : false;
            if (isSameDayAsQuery) return formatDate(docDate, "HH:mm");
            const dateStr = isToday ? "Today" : formatDate(docDate, "MMM dd, yyyy");
            return `${dateStr} · ${formatDate(docDate, "HH:mm")}`;
          })()}
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <ResultCardShell
        cardRef={ref}
        doc={doc}
        title={title}
        titleHref={titleHref}
        titleFontSize="1.5rem"
        metadataLine={metadataLine}
        hideSaveButton={hideSaveButton}
        rightColumn={rightColumn}
        actionsColumnWidth="13rem"
        cardSx={{
          ...sx,
          transition: "opacity 180ms ease",
          ...(busy ? { opacity: 0.45, pointerEvents: "none" } : {}),
        }}
        contentSx={{ columnGap: 1 }}
        onTitleClick={handleTitleClick}
      />
      <Snackbar
        open={removeError}
        autoHideDuration={3000}
        onClose={() => setRemoveError(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setRemoveError(false)}>
          Could not remove document. Please try again.
        </Alert>
      </Snackbar>
    </>
  );
});

export default SavedDocumentCard;
