/**
 * Shared card chrome for SERP and Saved Results (grid, icon, meta, abstract).
 * Callers supply actions and `rightColumn` (e.g. bookmark + timestamp).
 */

import React from "react";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import IconMapper from "../iconMapper";
import DocumentAbstract from "./DocumentAbstract";
import { SHOW_ABSTRACTS } from "../../config/uiFlags";
import {
  CARD_BACKGROUND,
  TYPOGRAPHY,
  SPACING,
  CARD_BORDER_RADIUS,
  TYPO_PRIM,
  CHIP_MULTI_VERSION,
} from "../../theme/uiTokens";
import { getDocumentIconType } from "../../utils/getDocumentIconType";
import { getDocumentType, getHasMultipleVersions, getDisplayLabelFromDocType, getDocTypeLabelClassName } from "../../utils/documentTypeUtils";
import { useIsTruncated } from "../../utils/useIsTruncated";

/**
 * Resolve the icon type + display label for a result card. Three possible sources, in
 * precedence order:
 * 1. Live PNX-derived type (`liveType`) — wins only for Proceedings/Conference Proceeding,
 *    since that classification is the one most likely to be stale on older saved docs
 *    (a saved `doc_type` can outlive a later PNX correction).
 * 2. Saved-view fields (`savedIconType`/`savedDocType`) — used when the doc came from a
 *    saved-results view (has a stored `doc_type`/`iconType`), not a live SERP hit.
 * 3. SERP-computed fallback (`iconSource.type`/`iconSource.displayLabel`) — used for live
 *    SERP hits, which have no stored doc_type/iconType of their own.
 */
function resolveIconTypeAndLabel({ liveType, savedIconType, savedDocType, iconSource }) {
  if (liveType === "Proceedings" || liveType === "Conference Proceeding") {
    return {
      type: liveType,
      displayLabel: liveType === "Proceedings" ? "Proceedings" : "Conference",
    };
  }
  const type = savedIconType ?? iconSource.type;
  if (type === "Proceedings" || type === "Conference Proceeding") {
    return { type, displayLabel: type === "Proceedings" ? "Proceedings" : "Conference" };
  }
  if (savedDocType) {
    return { type, displayLabel: getDisplayLabelFromDocType(savedDocType) };
  }
  return { type, displayLabel: iconSource.displayLabel };
}

export default function ResultCardShell({
  doc,
  title = "",
  metadataLine = "",
  hideSaveButton = false,
  rightColumn = null,
  cardSx = {},
  contentSx = {},
  cardRef = null,
  titleHref = null,
  titleFontSize = null,
  cardClassName = "",
  onTitleClick = null,
  onAbstractExpand = null,
  onAbstractCollapse = null,
  actionsColumnWidth = "auto",
}) {
  // Saved views use stored doc_type + iconType; SERP uses getDocumentIconType (no doc_type on SERP doc).
  const savedDocType = doc?.doc_type ?? doc?.docdata?.doc_type ?? '';
  const savedIconType = doc?.iconType ?? doc?.docdata?.iconType ?? null;
  const iconSource = getDocumentIconType(doc);
  const pnxForLabel = doc?.pnx || doc?.docdata?.pnx;
  const liveType = pnxForLabel ? getDocumentType(doc) : null;
  const format = iconSource.format;
  const genre = iconSource.genre;
  const { type, displayLabel } = resolveIconTypeAndLabel({
    liveType,
    savedIconType,
    savedDocType,
    iconSource,
  });

  // Multiple-versions indicator: prefer stored boolean (works for old saves without pnx),
  // fall back to live PNX frbrgroupid check for SERP docs.
  const pnxForVersions = doc?.pnx || doc?.docdata?.pnx;
  const hasMultipleVersions =
    doc?.docdata?.hasMultipleVersions === true || getHasMultipleVersions(pnxForVersions);

  const [docTypeRef, isDocTypeTruncated] = useIsTruncated([displayLabel]);

  const titleSx = {
    wordBreak: "break-word",
    overflowWrap: "break-word",
    lineHeight: TYPO_PRIM.cardTitleTight.lineHeight,
    mb: 0.5,
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    ...(titleFontSize ? { fontSize: titleFontSize } : {}),
    color: TYPOGRAPHY.title.color,
  };

  return (
    <Card
      ref={cardRef}
      variant="outlined"
      className={`ResultCard${cardClassName ? ` ${cardClassName}` : ""}`}
      sx={{
        backgroundColor: CARD_BACKGROUND,
        borderRadius: CARD_BORDER_RADIUS,
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        overflow: "visible",
        ...cardSx,
      }}
    >
      <CardContent
        sx={{
          display: "grid",
          gridTemplateColumns: `72px 1fr ${actionsColumnWidth}`,
          gridTemplateRows: "auto auto",
          columnGap: 1.5,
          rowGap: 0.5,
          alignItems: "flex-start",
          paddingTop: `${SPACING.cardPadding.top} !important`,
          paddingBottom: `${SPACING.cardPaddingNoTags.bottom} !important`,
          paddingLeft: `${SPACING.cardPadding.left} !important`,
          paddingRight: `${SPACING.cardPadding.right} !important`,
          "&:last-child": {
            paddingBottom: `${SPACING.cardPaddingNoTags.bottom} !important`,
          },
          ...contentSx,
        }}
      >
        {/* ── Icon column (spans both rows so title row has no actions column) ── */}
        <Box
          sx={{
            gridRow: "1 / -1",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
            flexShrink: 0,
          }}
          role="presentation"
        >
          <IconMapper
            format={format}
            type={type}
            genre={genre}
            size={36}
            color="grey.600"
            sx={{ display: "block", flexShrink: 0 }}
          />
          {(() => {
            return (
              <Typography
                ref={docTypeRef}
                variant="caption"
                className={getDocTypeLabelClassName(displayLabel)}
                aria-label={isDocTypeTruncated ? displayLabel : undefined}
                sx={{
                  color: TYPOGRAPHY.docType.color,
                  textAlign: "center",
                  lineHeight: 1.4,
                  minWidth: 0,
                }}
              >
                {displayLabel}
              </Typography>
            );
          })()}
        </Box>

        {/* ── Row 1: title + metadata span full width ── */}
        <Box sx={{ gridColumn: "2 / -1", gridRow: 1, minWidth: 0 }}>
          {!!title && (
            <Typography component="h2" variant="inherit" sx={{ margin: 0, font: "inherit", display: "block" }}>
              {titleHref ? (
                <Typography
                  variant="h6"
                  component="a"
                  href={titleHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    onTitleClick?.(e);
                  }}
                  sx={{
                    ...titleSx,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {title}
                </Typography>
              ) : (
                <Typography variant="h6" component="span" sx={titleSx}>
                  {title}
                </Typography>
              )}
            </Typography>
          )}

          {!!metadataLine && (
            <Box sx={{ mb: 0.25 }}>
              <Typography
                variant="body2"
                component="span"
                className="result-meta"
                sx={{
                  color: TYPOGRAPHY.metadata.color,
                  lineHeight: TYPO_PRIM.cardMetaTight.lineHeight,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {metadataLine}
              </Typography>
            </Box>
          )}

          {/* Multiple-versions badge — shown when Primo has grouped editions (FRBR) */}
          {hasMultipleVersions && (
            <Box sx={{ mb: 0.25 }}>
              <Chip
                size="small"
                icon={
                  <LayersOutlinedIcon
                    sx={{ fontSize: `${CHIP_MULTI_VERSION.iconFontSize} !important` }}
                  />
                }
                label="Multiple versions"
                variant="outlined"
                sx={{
                  height: CHIP_MULTI_VERSION.height,
                  fontSize: CHIP_MULTI_VERSION.fontSize,
                  fontWeight: CHIP_MULTI_VERSION.fontWeight,
                  color: "#5867be",
                  borderColor: "#7985cb",
                  backgroundColor: "#EEF0FB",
                  "& .MuiChip-label": { px: CHIP_MULTI_VERSION.labelPx },
                  "& .MuiChip-icon": {
                    color: "#5867be",
                    ml: CHIP_MULTI_VERSION.iconMarginLeft,
                  },
                }}
              />
            </Box>
          )}
        </Box>

        {/* ── Row 2: abstract (meta) ── */}
        <Box sx={{ gridColumn: 2, gridRow: 2, minWidth: 0 }}>
          <Box sx={{ mb: 0.25 }}>
            <DocumentAbstract
              doc={doc}
              showAbstract={SHOW_ABSTRACTS}
              clampLines={2}
              onExpand={onAbstractExpand}
              onCollapse={onAbstractCollapse}
            />
          </Box>
        </Box>

        {/* ── Right column: actions in row 2 only so title row keeps full width ── */}
        <Box
          className="card-actions-area tag-actions-area"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          sx={{
            gridColumn: 3,
            gridRow: "2 / 3",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            alignSelf: "flex-start",
            flexShrink: 0,
            minWidth: 196,
          }}
        >
          {rightColumn}
        </Box>
      </CardContent>
    </Card>
  );
}
