/**
 * Stelli App Style Guide
 *
 * This file contains all design tokens, colors, typography, spacing, and common styles
 * used throughout the application. Based on Figma designs.
 *
 * Import from this file to maintain consistency across all components.
 */

// ============================================================================
// COLORS
// ============================================================================

export const Colors = {
  // Brand Colors
  background: '#ebfeff',           // Main app background (light cyan)
  primary: '#aae1e4',              // Clickable buttons, accents
  primaryActive: '#73ced3',        // Active state (tabs, pressed states)

  // Neutral Colors
  white: '#ffffff',                // Cards, buttons
  black: '#000000',                // Text, borders, icons
  gray: '#666666',                 // Secondary text color (darker for readability)
  lightGray: '#d9d9d9',            // Icon backgrounds, inactive tabs, UI elements

  // Semantic Colors
  border: '#000000',               // All borders
  error: '#dc2626',                // Error states, delete actions
  text: {
    primary: '#000000',            // Main text color
    secondary: '#000000',          // Secondary text (currently same)
  },

  // Interactive States
  button: {
    neutral: '#aae1e4',            // Neutral pressable buttons (FAB, Next, etc.)
    selected: '#73ced3',           // Selected/active list items
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'Nunito_400Regular',  // Regular weight
    bold: 'Nunito_700Bold',        // Bold weight
    // Note: Nunito needs to be loaded via @expo-google-fonts/nunito
  },

  // Font Sizes
  fontSize: {
    // Headers
    h1: 48,                        // Welcome screen title
    h2: 24,                        // Section headers (Recent entries, Lists)

    // Body Text
    large: 20,                     // Button text, entry names, list names
    medium: 14,                    // Small buttons, tab text
    small: 12,                     // Dates, sign up text
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    title: 50,                     // Welcome title
    body: 24,                      // Subtitle text
    normal: undefined,             // Default line height
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const Spacing = {
  // Screen Padding
  screenPadding: {
    horizontal: 24,                // Left/right padding for most screens
    vertical: 64,                  // Top padding (below status bar area)
    welcomeHorizontal: 62,         // Welcome screen specific
    welcomeVertical: 89,           // Welcome screen specific
  },

  // Component Padding
  padding: {
    button: 13,                    // Vertical padding for buttons
    card: 14,                      // Padding inside cards/containers
    listItem: 22,                  // Horizontal padding for list items
    inList: 8,                     // Padding inside list containers
  },

  // Gaps (spacing between elements)
  gap: {
    xs: 4,                         // Extra small gap
    small: 8,                      // Small gap between sections
    medium: 12,                    // Medium gap (most common)
    large: 16,                     // Large gap
    section: 32,                   // Gap between major sections
    xl: 60,                        // Extra large gap (welcome screen)
  },

  // Form Elements
  form: {
    labelGap: 10,                  // Gap between label and input field
    inputPadding: 12,              // Horizontal padding inside input fields
    fieldGap: 16,                  // Gap between input field containers (vertical spacing)
  },
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const BorderRadius = {
  // Buttons & Containers
  full: 50,                        // Fully rounded buttons (pill shape)
  large: 25,                       // Large containers (recent entries card)
  medium: 21,                      // Icon containers
  circle: 30,                      // Circular add button
};

// ============================================================================
// DIMENSIONS
// ============================================================================

export const Dimensions = {
  // Component Heights
  button: {
    standard: 50,                  // Standard button height
    small: 24,                     // Small button height
    tab: 28,                       // Tab switcher height
  },

  // List Items
  listItem: {
    height: 60,                    // Standard list item height
  },

  // Icons
  icon: {
    small: 24,                     // Standard icon size
    medium: 42,                    // Icon container size
    large: 44,                     // Profile icon size
    add: 60,                       // Add button size
  },

  // Logo
  logo: {
    size: 248,                     // App logo dimensions (square)
  },

  // Stars
  star: {
    width: 19,
    height: 18,
  },

  // Arrows
  arrow: {
    width: 10.43,
    height: 18.56,
  },
};

// ============================================================================
// COMMON COMPONENT STYLES
// ============================================================================

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const CommonStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,

  contentContainer: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 32,
  } as ViewStyle,

  // Cards & Containers
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
  } as ViewStyle,

  // Buttons
  buttonBase: {
    height: Dimensions.button.standard,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.padding.button,
  } as ViewStyle,

  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  } as ViewStyle,

  buttonText: {
    fontSize: Typography.fontSize.large,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
    textAlign: 'center',
  } as TextStyle,

  smallButton: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    height: Dimensions.button.small,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  smallButtonText: {
    fontSize: Typography.fontSize.medium,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
  } as TextStyle,

  // Icon Containers
  iconContainer: {
    width: Dimensions.icon.medium,
    height: Dimensions.icon.medium,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // List Items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Dimensions.listItem.height,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.padding.listItem,
    gap: Spacing.gap.medium,
  } as ViewStyle,

  listItemText: {
    flex: 1,
    fontSize: Typography.fontSize.large,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
  } as TextStyle,

  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  } as ViewStyle,

  // Typography
  title: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.title,
    textAlign: 'center',
    color: Colors.text.primary,
  } as TextStyle,

  sectionTitle: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  } as TextStyle,

  bodyText: {
    fontSize: Typography.fontSize.large,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight.body,
  } as TextStyle,

  smallText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
  } as TextStyle,

  // Tab Switcher
  tab: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    height: Dimensions.button.tab,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  tabActive: {
    backgroundColor: Colors.primaryActive,
  } as ViewStyle,

  tabText: {
    fontSize: Typography.fontSize.medium,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
  } as TextStyle,
});

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

export const LayoutPatterns = {
  // Section with header and content
  section: {
    gap: Spacing.gap.small,
    width: '100%',
  } as ViewStyle,

  // Header with title and optional action button
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.gap.small,
  } as ViewStyle,

  // Horizontal row with items
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.gap.medium,
  } as ViewStyle,

  // Vertical column with items
  column: {
    flexDirection: 'column' as const,
    gap: Spacing.gap.small,
  } as ViewStyle,
};

// ============================================================================
// COMPONENT SPECIFICATIONS
// ============================================================================

/**
 * Button Specifications:
 * - Standard Button: 50px height, fully rounded (50px radius)
 * - Small Button: 24px height, fully rounded (50px radius)
 * - Primary buttons use Colors.primary background
 * - All buttons have 1px black border
 * - Font size: 20px for standard, 14px for small
 */

/**
 * List Item Specifications:
 * - Height: 60px
 * - Fully rounded (50px radius)
 * - White background with 1px black border
 * - Horizontal padding: 22px
 * - Contains: icon (42px circle) + text (flex 1) + arrow (10.43px)
 * - Gap between elements: 12px
 */

/**
 * Icon Container Specifications:
 * - Size: 42x42px
 * - Border radius: 21px (circular)
 * - Background: Colors.gray (#d9d9d9)
 * - Icon inside: 24x24px
 */

/**
 * Card/Container Specifications:
 * - Background: white
 * - Border: 1px solid black
 * - Border radius: 25px
 * - Padding: 14px horizontal, 9px vertical
 */

/**
 * Tab Switcher Specifications:
 * - Two tabs, equal width (flex: 1)
 * - Height: 28px
 * - Fully rounded (50px radius)
 * - 1px black border on each tab
 * - Inactive: Colors.gray background (#d9d9d9)
 * - Active: Colors.primaryActive background (#73ced3)
 * - Animated color transition using React Native Reanimated
 * - Gap between tabs: 4px
 * - Font size: 14px (Nunito Bold)
 */

/**
 * Star Rating Specifications:
 * - Star dimensions: 19x18px
 * - Stars are displayed horizontally
 * - Use filled star for full rating
 * - Use half star for .5 rating
 * - No gap between stars
 */

/**
 * Floating Action Button (FAB) Specifications:
 * - Size: 60x60px (Dimensions.icon.add)
 * - Border radius: 30px (BorderRadius.circle)
 * - Background: Colors.primary (#aae1e4)
 * - 1px black border
 * - No shadow/elevation
 * - Icon: 32px size, black color
 * - Position: Fixed bottom-right (32px from bottom, 24px from right)
 */
