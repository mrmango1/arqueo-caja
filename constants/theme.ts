/**
 * Premium Theme System for Mi Negocio
 * Modern, native-feeling design with glassmorphism and micro-animations
 */

import { Platform } from 'react-native';

// Primary Brand Colors - Orange gradient palette
export const BrandColors = {
  primary: '#FF6B00',
  primaryLight: '#FF8E33',
  primaryDark: '#E55A00',
  secondary: '#FF9500',
  accent: '#FFB74D',
} as const;

// Semantic Colors - System-wide
export const SemanticColors = {
  success: '#34C759',
  successLight: '#E8F8ED',
  warning: '#FF9500',
  warningLight: '#FFF5E6',
  error: '#FF3B30',
  errorLight: '#FFEBEA',
  info: '#007AFF',
  infoLight: '#E6F2FF',
} as const;

// Premium Color Palette
export const Colors = {
  light: {
    // Backgrounds
    background: '#F5F5F7',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#F0F0F5',

    // Surface colors for cards
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfacePressed: '#F5F5F7',

    // Text hierarchy
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#8E8E93',
    textQuaternary: '#AEAEB2',

    // Borders & Dividers
    border: '#E5E5EA',
    borderLight: '#F0F0F5',
    divider: '#E5E5EA',

    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.72)',
    glassStrong: 'rgba(255, 255, 255, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',

    // Tab Bar
    tabBar: 'rgba(249, 249, 249, 0.94)',
    tabBarBorder: 'rgba(0, 0, 0, 0.04)',
    tabIconDefault: '#8E8E93',
    tabIconSelected: BrandColors.primary,

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.15)',

    // Shadows
    shadowColor: '#000000',
    shadowColorSoft: 'rgba(0, 0, 0, 0.08)',

    // Status bar
    statusBar: 'dark',

    // Input fields
    inputBackground: '#F5F5F7',
    inputBorder: '#E0E0E0',
    inputFocusBorder: BrandColors.primary,
    inputPlaceholder: '#AEAEB2',
  },
  dark: {
    // Backgrounds - True black for OLED
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',

    // Surface colors for cards
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    surfacePressed: '#3A3A3C',

    // Text hierarchy
    text: '#FFFFFF',
    textSecondary: '#A1A1A6',
    textTertiary: '#6B6B6B',
    textQuaternary: '#48484A',

    // Borders & Dividers
    border: '#38383A',
    borderLight: '#2C2C2E',
    divider: '#38383A',

    // Glassmorphism - Dark mode
    glass: 'rgba(28, 28, 30, 0.72)',
    glassStrong: 'rgba(44, 44, 46, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',

    // Tab Bar
    tabBar: 'rgba(28, 28, 30, 0.94)',
    tabBarBorder: 'rgba(255, 255, 255, 0.04)',
    tabIconDefault: '#6B6B6B',
    tabIconSelected: BrandColors.primary,

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',

    // Shadows (less visible on dark)
    shadowColor: '#000000',
    shadowColorSoft: 'rgba(0, 0, 0, 0.3)',

    // Status bar
    statusBar: 'light',

    // Input fields
    inputBackground: '#2C2C2E',
    inputBorder: '#3A3A3C',
    inputFocusBorder: BrandColors.primary,
    inputPlaceholder: '#6B6B6B',
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
export const Gradients = {
  primary: ['#FF6B00', '#FF8E33'] as const,
  primaryStrong: ['#FF5500', '#FF7700'] as const,
  success: ['#2ED573', '#26DE81'] as const,
  error: ['#FF3B30', '#FF5F57'] as const,
  info: ['#007AFF', '#5AC8FA'] as const,
  gold: ['#FFD700', '#FFA500'] as const,
  sunset: ['#FF6B00', '#FF3B30'] as const,
  ocean: ['#007AFF', '#34C759'] as const,
  dark: ['#1C1C1E', '#2C2C2E'] as const,
  light: ['#FFFFFF', '#F5F5F7'] as const,
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
