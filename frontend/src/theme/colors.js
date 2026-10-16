/**
 * Color Palette - Centralized color definitions
 * 
 * This module provides the color system for the Material-UI theme:
 * - Brand colors (primary, secondary)
 * - Semantic colors (success, warning, error, info)
 * - Background, text, and border colors
 * - MUI palette configuration (used by theme.js)
 */

// Brand colors

export const brandColors = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#1873cd', // Main primary (header color). Darkened from #1976d2, same hue, for WCAG 1.4.3 contrast.
    600: '#1565c0',
    700: '#0d47a1',
    800: '#0277bd',
    900: '#01579b',
  },
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main secondary
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
};

// Semantic colors

export const semanticColors = {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  info: {
    50: '#f0f3f9',
    100: '#d4dbe8',
    200: '#b7c3d7',
    300: '#9aabc6',
    400: '#7d93b5',
    500: '#8da0cb',
    600: '#6d7ca8',
    700: '#4d5985',
    800: '#2d3662',
    900: '#0d133f',
  },
};

// Background colors
// Single source: theme.palette.background.default (page), background.paper (cards)

export const backgroundColors = {
  primary: '#f6f8fb',   // Page background — cool/neutral, palette.background.default
  secondary: '#F7FAFF', // Card background — palette.background.paper
  tertiary: '#f9fafb',
  overlay: 'rgba(0, 0, 0, 0.5)',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(31, 41, 55, 0.9)', // Dark gray instead of pure black
};

// Text colors

export const textColors = {
  primary: '#232A2F',   // Title/heading
  secondary: '#6b7280', // Metadata, abstract, secondary text
  tertiary: '#9ca3af',
  disabled: '#d1d5db',
  inverse: '#fafafa', // Off-white instead of pure white
  link: '#2563eb',
  linkHover: '#1d4ed8',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
};

// Border colors

export const borderColors = {
  light: '#e5e7eb',
  medium: '#d1d5db',
  dark: '#9ca3af',
  focus: '#3b82f6',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

// MUI palette configuration

/**
 * Creates the Material-UI palette configuration
 * This consolidates all color configuration in one place
 */
export const muiPalette = {
  mode: 'light',
  primary: {
    main: brandColors.primary[500],
    light: brandColors.primary[300], // #64b5f6 (closest to #60A5FA)
    dark: brandColors.primary[700], // #0d47a1 (closest to #1D4ED8)
    contrastText: textColors.inverse, // Off-white instead of pure white
  },
  error: {
    main: semanticColors.error[500],
    light: semanticColors.error[400], // #f87171
    dark: semanticColors.error[700], // #b91c1c
    contrastText: textColors.inverse,
  },
  warning: {
    main: semanticColors.warning[500],
    light: semanticColors.warning[400], // #fbbf24
    dark: semanticColors.warning[700], // #b45309
    contrastText: textColors.inverse,
  },
  info: {
    main: semanticColors.info[500],
    light: brandColors.primary[300], // Use primary light for info (same blue)
    dark: brandColors.primary[700], // Use primary dark for info
    contrastText: textColors.inverse,
  },
  success: {
    main: semanticColors.success[500],
    light: semanticColors.success[400], // #4ade80
    dark: semanticColors.success[700], // #15803d
    contrastText: textColors.inverse,
  },
  background: {
    default: backgroundColors.primary,
    paper: backgroundColors.secondary,
  },
  text: {
    primary: textColors.primary,
    secondary: textColors.secondary,
    disabled: textColors.disabled,
  },
  divider: borderColors.light,
};