import { useEffect, useMemo } from "react";
import { Box, Typography, Stack, Collapse } from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import { normalizeSavedDoc, extractExternalId } from "../../../utils/documentMetadata";
import { HEADER_ACTION_WIDTH, LAYOUT } from "../../../theme/uiTokens";
import { useSavedBookmarks } from "../../workspace/context/SavedBookmarksContext";
import SavedDocumentCard from "../../../shared/components/SavedDocumentCard";

/** Flat list of active saved docs (newest first). Server querylist excludes soft-removed rows. */
function buildSavedResultsRows(queries) {
  const rows = [];
  for (const q of queries || []) {
    for (const doc of q?.documents || []) {
      if (doc?.isRemoved === true) continue;
      const normalized = normalizeSavedDoc(doc);
      if (normalized) rows.push({ doc: normalized, query: q });
    }
  }
  rows.sort(
    (a, b) =>
      new Date(b.doc.createdAt || b.doc.savedAt || 0) -
      new Date(a.doc.createdAt || a.doc.savedAt || 0)
  );
  return rows;
}

export default function SavedSearchResults({ participant: _participant }) {
  useEffect(() => {
    document.title = "Saved results";
  }, []);

  const { queries } = useSavedBookmarks();

  const rows = useMemo(() => buildSavedResultsRows(queries), [queries]);

  return (
    <Box
      className="main-saved-timeline"
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 3,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <h1 className="visually-hidden">Saved results</h1>
      <Box
        data-baseline-scroll-panel="saved-results"
        className="scrollbarOutsideCards"
        data-baseline-scroll-root="saved-results"
        sx={{
          flex: "1 1 0",
          minWidth: 0,
          ...LAYOUT.leftColumnStyles,
          backgroundColor: "transparent",
        }}
      >
        <Box sx={{ pt: 0, pb: 1, flex: 1, width: "100%" }}>
          {rows.length > 0 ? (
            <Stack spacing={2} component={TransitionGroup}>
              {rows.map(({ doc, query }, index) => {
                const ext = extractExternalId(doc);
                const key = doc._id || doc.id || ext || `saved-row-${index}`;
                return (
                  <Collapse key={key} timeout={220}>
                    <SavedDocumentCard
                      doc={doc}
                      query={query}
                      hideSaveButton={false}
                    />
                  </Collapse>
                );
              })}
            </Stack>
          ) : (
            <Box
              sx={{
                minHeight: { xs: "min(56vh, 520px)", md: "min(48vh, 480px)" },
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No saved documents yet. Save items from search results.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Saved Results right rail (SearchPath parity). Intentionally empty for baseline. */}
      <Box
        sx={{
          flexShrink: 0,
          width: HEADER_ACTION_WIDTH,
          alignSelf: "flex-start",
          overflow: "visible",
          pt: 0,
        }}
      />
    </Box>
  );
}
