/**
 * Theme Index - Main theme configuration
 *
 * Single source of truth:
 * - Colors: colors.js (muiPalette) — background.default, background.paper
 * - Radius, shadows: designTokens.js
 *
 * uiTokens uses palette keys only; no hex overrides.
 */

import { createTheme } from '@mui/material/styles';
import { muiPalette } from './colors';
import { shadows, transitions, muiTypographyVariants } from './designTokens';

// ==================== THEME ====================

export const lightTheme = createTheme({
  palette: muiPalette,
  typography: {
    fontFamily: "'Lexend Deca', sans-serif",
    ...muiTypographyVariants,
  },
  shape: {
    borderRadius: 16, // Cards and buttons share same corner radius
  },
  shadows: [
    'none',
    shadows.small,
    shadows.medium,
    shadows.large,
    shadows.extraLarge,
    ...Array(20).fill(shadows.extraLarge),
  ],
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: transitions.easeInOut,
      easeOut: transitions.easeOut,
      easeIn: transitions.easeIn,
      sharp: transitions.easeInOut,
    },
  },
  components: {
    // ── Hover overrides: no white flash; subtle or same-as-default ─────────────
    // Avoid backgroundColor: 'inherit'/'transparent' on hover so the area under
    // the cursor does not flash white (ripple + see-through was the cause).
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          letterSpacing: 'normal',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.MuiButton-contained': {
            '&:hover': {
              backgroundColor: 'primary.main',
              boxShadow: 'none',
            },
          },
          '&.MuiButton-outlined:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'inherit',
          },
          '&.MuiButton-text:hover': {
            backgroundColor: 'action.hover',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '&:hover': {
            boxShadow: 'inherit',
            transform: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          '&:hover': {
            boxShadow: 'inherit',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        label: {
          letterSpacing: 'normal',
        },
        root: {
          filter: 'none',
          '&:hover': {
            filter: 'none',
          },
          '&.MuiChip-clickable:hover': {
            backgroundColor: 'action.hover',
          },
          '&.MuiChip-deletable:hover': {
            backgroundColor: 'action.hover',
          },
        },
        deleteIcon: {
          '&:hover': {
            color: 'inherit',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          letterSpacing: 'normal',
          '&:hover': {
            backgroundColor: 'action.hover',
            color: 'inherit',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          '&:hover': {
            textDecoration: 'none',
            color: 'inherit',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        // Function form (not a plain object) so outline/outlineColor can read the real
        // theme palette value — those properties aren't in MUI's sx-style auto-resolved
        // allowlist, unlike color/bgcolor/borderColor.
        root: ({ theme }) => ({
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          // Centralized keyboard-focus indicator (WCAG 2.4.7) — MUI's own default focus
          // treatment is a ripple/background effect that only shows on press, not on
          // keyboard focus, so most buttons/icon-buttons had no visible focus state at
          // all. This covers every MuiButtonBase descendant (Button, IconButton,
          // Link component="button") in one place instead of requiring each component
          // to opt in individually. Components with their own explicit
          // &:focus-visible override (search submit, pagination, "New Workspace")
          // keep taking precedence via normal CSS specificity/order.
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    // Reduce ripple opacity so hover/click does not create a white flash under the cursor
    MuiTouchRipple: {
      styleOverrides: {
        child: {
          opacity: 0.22,
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:hover .MuiCardActionArea-focusHighlight': {
            opacity: 0,
          },
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      },
    },
    // ── Popper z-index (unchanged) ────────────────────────────────────────────
    MuiPopper: {
      defaultProps: {
        disablePortal: false,
      },
      styleOverrides: {
        root: {
          zIndex: 1500,
        },
      },
    },
  },
});

// ==================== DEFAULT EXPORT ====================

// Export light theme as default
export default lightTheme;