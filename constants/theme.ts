/**
 * Premium Theme System for Mi Negocio
 * Modern, native-feeling design with glassmorphism and micro-animations
 */

import { Platform } from 'react-native';

// Primary Brand Colors - Professional Deep Slate/Navy
export const BrandColors = {
  primary: '#0F172A', // Slate 900
  primaryLight: '#334155', // Slate 700
  primaryDark: '#020617', // Slate 950
  secondary: '#475569', // Slate 600
  accent: '#0EA5E9', // Sky 500 (Subtle accent)
} as const;

// Semantic Colors - System-wide
export const SemanticColors = {
  success: '#10B981', // Emerald 500
  successLight: '#D1FAE5',
  warning: '#F59E0B', // Amber 500
  warningLight: '#FEF3C7',
  error: '#EF4444', // Red 500
  errorLight: '#FEE2E2',
  info: '#3B82F6', // Blue 500
  infoLight: '#DBEAFE',
} as const;

// Professional Color Palette
export const Colors = {
  light: {
    // Backgrounds - Clean & Professional
    background: '#F8FAFC', // Slate 50
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#F1F5F9', // Slate 100

    // Surface colors for cards
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfacePressed: '#F1F5F9',

    // Text hierarchy - High Contrast
    text: '#0F172A', // Slate 900
    textSecondary: '#475569', // Slate 600
    textTertiary: '#64748B', // Slate 500
    textQuaternary: '#94A3B8', // Slate 400

    // Borders & Dividers
    border: '#E2E8F0', // Slate 200
    borderLight: '#F1F5F9',
    divider: '#E2E8F0',

    // Glassmorphism - Reduced for professional look, now just subtle transparency
    glass: 'rgba(255, 255, 255, 0.9)',
    glassStrong: 'rgba(255, 255, 255, 0.95)',
    glassBorder: 'rgba(226, 232, 240, 0.8)',

    // Tab Bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabIconDefault: '#64748B',
    tabIconSelected: BrandColors.primary,

    // Overlay
    overlay: 'rgba(15, 23, 42, 0.4)',
    overlayLight: 'rgba(15, 23, 42, 0.1)',

    // Shadows
    shadowColor: '#0F172A',
    shadowColorSoft: 'rgba(15, 23, 42, 0.05)',

    // Status bar
    statusBar: 'dark',

    // Input fields
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1', // Slate 300
    inputFocusBorder: BrandColors.primary,
    inputPlaceholder: '#94A3B8',
  },
  dark: {
    // Backgrounds - Professional Dark
    background: '#020617', // Slate 950
    backgroundSecondary: '#0F172A', // Slate 900
    backgroundTertiary: '#1E293B', // Slate 800

    // Surface colors for cards
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    surfacePressed: '#334155',

    // Text hierarchy
    text: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textTertiary: '#64748B', // Slate 500
    textQuaternary: '#475569', // Slate 600

    // Borders & Dividers
    border: '#1E293B', // Slate 800
    borderLight: '#334155',
    divider: '#1E293B',

    // Glassmorphism - Dark mode
    glass: 'rgba(15, 23, 42, 0.9)',
    glassStrong: 'rgba(30, 41, 59, 0.95)',
    glassBorder: 'rgba(51, 65, 85, 0.5)',

    // Tab Bar
    tabBar: '#0F172A',
    tabBarBorder: '#1E293B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#FFFFFF',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',

    // Shadows
    shadowColor: '#000000',
    shadowColorSoft: 'rgba(0, 0, 0, 0.3)',

    // Status bar
    statusBar: 'light',

    // Input fields
    inputBackground: '#0F172A',
    inputBorder: '#334155',
    inputFocusBorder: '#F8FAFC',
    inputPlaceholder: '#64748B',
  },
} as const;

// Typography Scale - SF Pro inspired
export const Typography = {
  // Display
  displayLarge: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 29,
  },

  // Headlines
  headlineLarge: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 25,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 23,
  },

  // Titles
  titleLarge: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 21,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },

  // Body
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 19,
  },

  // Labels & Captions
  labelLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 14,
  },

  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },

  // Monospace (for numbers)
  mono: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  monoLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: Platform.select({
      ios: 'SF Mono',
      android: 'monospace',
      default: 'monospace',
    }),
  },
} as const;

// Spacing Scale (4px base)
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
} as const;

// Border Radius Scale
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// Shadow Presets
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  // Colored shadows
  primary: {
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  success: {
    shadowColor: SemanticColors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  error: {
    shadowColor: SemanticColors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Animation Timings
export const Animation = {
  // Durations (ms)
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,

  // Spring configs for Reanimated
  spring: {
    gentle: { damping: 20, stiffness: 100 },
    bouncy: { damping: 10, stiffness: 180 },
    stiff: { damping: 22, stiffness: 300 },
    snappy: { damping: 15, stiffness: 400 },
  },

  // Cubic beziers for timing (as array for Reanimated Easing)
  easing: {
    easeInOut: [0.4, 0, 0.2, 1],
    easeOut: [0, 0, 0.2, 1],
    easeIn: [0.4, 0, 1, 1],
    spring: [0.68, -0.55, 0.265, 1.55],
  },
} as const;

// System Fonts
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  default: {
    sans: 'system-ui',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
});

// Z-Index Scale
export const ZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
} as const;

// Blur Intensities
export const BlurIntensity = {
  light: 10,
  medium: 20,
  strong: 40,
  extreme: 80,
} as const;

// Safe Area defaults
export const SafeAreaDefaults = {
  topInset: Platform.OS === 'ios' ? 44 : 24,
  bottomInset: Platform.OS === 'ios' ? 34 : 0,
  horizontalInset: 16,
} as const;

// Icon Sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  huge: 40,
} as const;

// Hit Slop for touch targets
export const HitSlop = {
  small: { top: 8, right: 8, bottom: 8, left: 8 },
  medium: { top: 12, right: 12, bottom: 12, left: 12 },
  large: { top: 16, right: 16, bottom: 16, left: 16 },
} as const;

// Gradient Presets
// Solid Colors (No more gradients)
export const Gradients = {
  primary: [BrandColors.primary, BrandColors.primary] as const,
  primaryStrong: [BrandColors.primaryDark, BrandColors.primaryDark] as const,
  success: [SemanticColors.success, SemanticColors.success] as const,
  error: [SemanticColors.error, SemanticColors.error] as const,
  info: [SemanticColors.info, SemanticColors.info] as const,
  gold: ['#D97706', '#D97706'] as const, // Amber 600
  sunset: [BrandColors.secondary, BrandColors.secondary] as const,
  ocean: [BrandColors.primaryLight, BrandColors.primaryLight] as const,
  dark: ['#020617', '#020617'] as const,
  light: ['#FFFFFF', '#FFFFFF'] as const,
} as const;

// Export a helper to get theme colors
export type ThemeMode = 'light' | 'dark';

export const getThemeColors = (mode: ThemeMode) => Colors[mode];

export default {
  BrandColors,
  SemanticColors,
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  Animation,
  Fonts,
  ZIndex,
  BlurIntensity,
  SafeAreaDefaults,
  IconSizes,
  HitSlop,
  Gradients,
  getThemeColors,
};
