/**
 * Design Tokens - Authoritative design system values
 *
 * Used by theme.js for shape.borderRadius, shadows, transitions.
 * Components import typography, surfaces, and chip roles from here.
 * uiTokens composes palette-facing exports from these primitives.
 */

// Spacing scale

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16.625rem', // 266px (increased by 10px)
};

/** 8px — gap between filter list rows, compact chip stacks */
export const stackGapSm = spacing[2];

// Component sizing

export const componentSizes = {
  // Button sizes (fontSize: max(1rem, old * 1.2))
  button: {
    small: {
      height: '32px',
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: '1.05rem',
    },
    medium: {
      height: '40px',
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: '1.2rem',
    },
    large: {
      height: '48px',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: '1.2rem',
    },
    extraLarge: {
      height: '56px',
      padding: `${spacing[4]} ${spacing[8]}`,
      fontSize: '1.35rem',
    },
  },

  // Input sizes (fontSize: max(1rem, old * 1.2))
  input: {
    small: {
      height: '32px',
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: '1.05rem',
    },
    medium: {
      height: '40px',
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: '1.2rem',
    },
    large: {
      height: '48px',
      padding: `${spacing[3]} ${spacing[4]}`,
      fontSize: '1.2rem',
    },
  },

  // Chip sizes (fontSize: max(1rem, old * 1.2))
  chip: {
    small: {
      height: '24px',
      padding: `0 ${spacing[2]}`,
      fontSize: '1rem',
    },
    medium: {
      height: '32px',
      padding: `0 ${spacing[3]}`,
      fontSize: '1.05rem',
    },
    large: {
      height: '40px',
      padding: `0 ${spacing[4]}`,
      fontSize: '1.2rem',
    },
  },

  // Card sizes
  card: {
    small: {
      padding: spacing[4],
      borderRadius: 8,
    },
    medium: {
      padding: spacing[6],
      borderRadius: 12,
    },
    large: {
      padding: spacing[8],
      borderRadius: 16,
    },
  },

  // Icon sizes
  icon: {
    small: '16px',
    medium: '20px',
    large: '24px',
    extraLarge: '32px',
    huge: '48px',
  },
};

// Border radius

export const borderRadius = {
  none: '0',
  small: '4px',
  medium: '8px',
  large: 12,
  extraLarge: '16px',
  full: '9999px',
};

// Shadows

export const shadows = {
  none: 'none',
  small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  extraLarge: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  colored: '0 4px 14px 0 rgba(59, 130, 246, 0.15)',
};

// Transitions

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '350ms ease-in-out',
  slower: '500ms ease-in-out',
  
  // Easing functions
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Typography (rem / unitless)
/** Semantic text styles — pair with palette keys in uiTokens / sx */
export const typography = {
  title: {
    fontSize: '1.575rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  metadata: {
    fontSize: '1.2rem',
    fontWeight: 400,
    lineHeight: 1.2,
  },
  abstract: {
    fontSize: '1.05rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  docType: {
    fontSize: '1.1rem',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  link: {
    fontSize: '1.05rem',
    fontWeight: 500,
  },
  /** 16px at root — filter panel rows, compact UI labels */
  uiBody: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  uiHeadingSm: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
  },
  cardTitleTight: {
    lineHeight: 1.25,
  },
  cardMetaTight: {
    lineHeight: 1.3,
  },
};

/** MUI theme.typography variants — single source for theme.js */
export const muiTypographyVariants = {
  h1: { fontSize: '3.2rem', fontWeight: 700, lineHeight: 1.2 },
  h4: { fontSize: '2.4rem', fontWeight: 700, lineHeight: 1.2 },
  h5: { fontSize: '1.8rem', fontWeight: 600, lineHeight: 1.25 },
  h6: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
  subtitle1: { fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.4 },
  subtitle2: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 },
  body1: { fontSize: '1.2rem', fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.4 },
  overline: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.08em',
  },
};

// Surfaces (cards, panels, shell)
export const surfaces = {
  resultCard: {
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    hoverShadow: '0 2px 6px rgba(0,0,0,0.08)',
    hoverOverlay: 'rgba(0, 0, 0, 0.04)',
    padding: {
      top: '12px',
      bottom: '8px',
      left: '8px',
      right: '8px',
    },
    paddingNoTags: {
      top: '12px',
      bottom: '12px',
      left: '8px',
      right: '8px',
    },
  },
  workspaceCard: {
    borderRadius: '16px',
    borderColor: '#D9DEE8',
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
  },
  filterPanel: {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    titleIconSize: '1.25rem',
  },
  appShell: {
    cardPadding: 4,
    cardRadius: '12px',
    cardShadow: '0 4px 20px rgba(0,0,0,0.1)',
    buttonPadding: `${spacing[3]} ${spacing[6]}`,
    buttonFontSize: '1rem',
    buttonRadius: `${spacing[2]}`,
  },
};

// Chip roles (same family, different behavior)
export const chip = {
  /** Filled / filter-style chip sizes (legacy naming) */
  tagComponentSizes: {
    small: {
      height: '30px',
      fontSize: '1.05rem',
      paddingX: 1.5,
      borderRadius: '10px',
    },
    medium: {
      height: '34px',
      fontSize: '1.2rem',
      paddingX: 1.5,
      borderRadius: '12px',
    },
    large: {
      height: '38px',
      fontSize: '1.05rem',
      paddingX: 1.75,
      borderRadius: '14px',
    },
  },
  /** Removable MUI Chip on cards — height aligned to small chip size */
  removable: {
    minHeight: '30px',
    maxWidth: '220px',
    labelMaxWidth: '200px',
    fontSize: '1.05rem',
    lineHeight: 1.2,
    deleteIconSize: '18px',
  },
  /** Filter panel rows — ButtonBase pills */
  filterRow: {
    listGap: stackGapSm,
    minHeight: 38,
    borderRadius: borderRadius.full,
    gap: 1,
    px: 2,
    py: 1.25,
  },
  /** FRBR "Multiple versions" badge on result cards */
  multiVersionBadge: {
    height: 22,
    fontSize: '0.72rem',
    fontWeight: 500,
    labelPx: '6px',
    iconFontSize: '0.9rem',
    iconMarginLeft: '4px',
  },
};