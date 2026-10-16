/**
 * UI Tokens - Layout and component styling constants
 * Primitives live in designTokens.js; here we attach palette keys and layout-only values.
 */
import {
  typography as typoPrim,
  surfaces,
  chip,
  componentSizes,
} from "./designTokens";

export const CARD_BACKGROUND = "background.paper";
/** Result card corners — explicit px (matches surfaces.resultCard) */
export const CARD_BORDER_RADIUS = surfaces.resultCard.borderRadius;

/** Workspace list cards — border + shadow from designTokens.surfaces */
export const SURFACE_WORKSPACE_CARD = surfaces.workspaceCard;

/** Error / loading shell cards (App.jsx) */
export const SURFACE_APP_SHELL = surfaces.appShell;

export const TYPOGRAPHY = {
  title: { ...typoPrim.title, color: "text.primary" },
  metadata: { ...typoPrim.metadata, color: "rgba(0,0,0,0.70)" },
  abstract: { ...typoPrim.abstract, color: "text.secondary" },
  docType: { ...typoPrim.docType, color: "text.secondary" },
  link: { ...typoPrim.link, color: "primary.main" },
};

export const SPACING = {
  cardMarginBottomSerp: 3,
  cardMarginBottomTimeline: 2,
  abstractMarginTop: 1.5,
  cardPadding: surfaces.resultCard.padding,
  cardPaddingNoTags: surfaces.resultCard.paddingNoTags,
};

export const GRID = {
  columnGap: 1,
  iconWidth: 80,
  timestampWidth: 100,
  actionsWidth: 220,
  serpTemplate: (iconWidth, actionsWidth) => `${iconWidth}px 1fr ${actionsWidth}px`,
  timelineTemplate: (iconWidth, timestampWidth) => `${iconWidth}px 1fr ${timestampWidth}px`,
};

export const ABSTRACT = {
  clampLines: 2,
  paddingRight: "80px",
  fontSize: typoPrim.metadata.fontSize,
  /** px equivalent for measurer fallback */
  fontSizePx: 19,
  lineHeight: 1.5,
  color: "text.secondary",
  linkColor: "primary.main",
};

/** Header search & text fields — height / font from designTokens */
export const INPUT_SEARCH = componentSizes.input.medium;

/** Primary CTA buttons (workspace list, etc.) */
export const BUTTON_MEDIUM = componentSizes.button.medium;

/** FRBR badge on result cards */
export const CHIP_MULTI_VERSION = chip.multiVersionBadge;

/** Typography tokens for non-palette consumers (sx spread) */
export const TYPO_PRIM = typoPrim;

export const CONTENT_PADDING_X = { md: 4, lg: 6, xl: 8 };

/** Clamp keeps this responsive: 220-320px, scaling with viewport between those bounds. */
export const HEADER_ACTION_WIDTH = "clamp(220px, 18vw, 320px)";

export const SERP_GRID_COL_RIGHT = "clamp(320px, 25vw, 430px)";

/**
 * Shared page container — identical constraints used by MainHeader, breadcrumb, and body grid,
 * so all three always align. px follows MUI's 8px rhythm: xs=2 (16px), sm=3 (24px).
 */
export const PAGE_CONTAINER = {
  maxWidth: 1400,
  mx: 'auto',
  width: '100%',
  px: { xs: 2, sm: 3 },
};

export const LAYOUT = {
  /** Default rhythm between SERP results column and timeline; keep slightly tight so both read as one workspace. */
  gap: { md: 2.5, lg: 3 },
  paddingX: CONTENT_PADDING_X,
  paddingY: 3,
  height: 'calc(100vh - 64px)',
  rightColumnMinWidth: 320,
  rightColumnMaxWidth: 430,
  rightColumnStyles: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  leftColumnStyles: {
    width: '100%',
    minWidth: 0,
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  // Outer wrapper: full-width, sets background and height
  mainGridOuterStyles: {
    width: '100%',
    bgcolor: 'background.default',
    height: 'calc(100vh - 64px)',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
  },
  // Inner container: centered, same maxWidth/px as header and breadcrumb.
  // gap: 3 = 24px between results + timeline (was 32px — slightly looser related pairing).
  mainGridStyles: {
    width: '100%',
    maxWidth: 1400,
    mx: 'auto',
    px: { xs: 2, sm: 3 },
    display: 'grid',
    gap: 3,
    py: 2,
    height: '100%',
    overflow: 'hidden',
  },
};
