# Stelli Style Guide

This document explains how to use the style guide in your components to maintain consistency throughout the app.

## 📁 Location

The style guide is located at `constants/styleGuide.ts`

## 🎨 What's Included

### 1. **Colors**
All brand colors, neutral colors, and semantic colors used in the app.

```typescript
import { Colors } from '@/constants/styleGuide';

// Usage
backgroundColor: Colors.background,
color: Colors.text.primary,
borderColor: Colors.border,
```

### 2. **Typography**
Font sizes, weights, line heights, and font families.

**Font Family:** Muli (loaded via @expo-google-fonts/muli)

```typescript
import { Typography } from '@/constants/styleGuide';

// Usage
fontSize: Typography.fontSize.h1,
fontWeight: Typography.fontWeight.bold,
fontFamily: Typography.fontFamily.regular,  // Muli_400Regular
fontFamily: Typography.fontFamily.bold,     // Muli_700Bold
lineHeight: Typography.lineHeight.title,
```

### 3. **Spacing**
Consistent spacing values for padding, margins, and gaps.

```typescript
import { Spacing } from '@/constants/styleGuide';

// Usage
paddingHorizontal: Spacing.screenPadding.horizontal,
gap: Spacing.gap.medium,
padding: Spacing.padding.button,
```

### 4. **Border Radius**
Standard border radius values for different component types.

```typescript
import { BorderRadius } from '@/constants/styleGuide';

// Usage
borderRadius: BorderRadius.full,      // Fully rounded buttons
borderRadius: BorderRadius.large,     // Cards
borderRadius: BorderRadius.medium,    // Icon containers
```

### 5. **Dimensions**
Fixed dimensions for components (buttons, icons, etc.)

```typescript
import { Dimensions } from '@/constants/styleGuide';

// Usage
height: Dimensions.button.standard,
width: Dimensions.icon.medium,
```

### 6. **CommonStyles**
Pre-built style objects that can be reused across components.

```typescript
import { CommonStyles } from '@/constants/styleGuide';

// Usage - spread common styles
const styles = StyleSheet.create({
  myButton: {
    ...CommonStyles.buttonBase,
    // Add custom overrides
    marginTop: 20,
  },
  myTitle: {
    ...CommonStyles.title,
  },
});
```

## 📖 Usage Examples

### Example 1: Creating a Button

```typescript
import { Colors, Spacing, BorderRadius, Dimensions, CommonStyles } from '@/constants/styleGuide';

const styles = StyleSheet.create({
  button: {
    ...CommonStyles.buttonBase,  // Use common button styles
    width: '100%',
  },
  buttonText: {
    ...CommonStyles.buttonText,
  },
});
```

### Example 2: Creating a List Item

```typescript
import { Colors, Spacing, BorderRadius, Dimensions } from '@/constants/styleGuide';

const styles = StyleSheet.create({
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
  },
});
```

### Example 3: Creating a Card Container

```typescript
import { CommonStyles } from '@/constants/styleGuide';

const styles = StyleSheet.create({
  card: {
    ...CommonStyles.card,  // Includes white bg, border, border radius
    padding: 16,
  },
});
```

### Example 4: Custom Screen Layout

```typescript
import { Colors, Spacing } from '@/constants/styleGuide';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
  },
});
```

## 🎯 Best Practices

### ✅ DO:
- **Always use style guide constants** instead of hardcoded values
- **Spread common styles** and override only what's needed
- **Import only what you need** to keep bundle size small
- **Reference the style guide** when creating new components

```typescript
// ✅ Good
backgroundColor: Colors.background,
gap: Spacing.gap.medium,

// ❌ Bad
backgroundColor: '#ebfeff',
gap: 12,
```

### ✅ DO: Use CommonStyles for frequently used patterns

```typescript
// ✅ Good
const styles = StyleSheet.create({
  title: {
    ...CommonStyles.title,
  },
});

// ❌ Bad - reinventing the wheel
const styles = StyleSheet.create({
  title: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 50,
    textAlign: 'center',
    color: '#000000',
  },
});
```

### ✅ DO: Override common styles when needed

```typescript
// ✅ Good - Use common style as base, override specific properties
const styles = StyleSheet.create({
  primaryButton: {
    ...CommonStyles.buttonBase,
    backgroundColor: Colors.primary,  // Override background
  },
});
```

### ✅ DO: Keep component-specific styles in the component file

```typescript
// ✅ Good - Use style guide for standard values, add unique styles locally
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    padding: Spacing.padding.card,
  },
  uniqueElement: {
    // Component-specific style that doesn't belong in CommonStyles
    transform: [{ rotate: '45deg' }],
  },
});
```

## 📝 Component Specifications Reference

### Standard Button
- Height: 50px
- Border radius: 50px (fully rounded)
- Background: white
- Border: 1px solid black
- Font size: 20px
- Padding: 13px vertical

### Small Button
- Height: 24px
- Border radius: 50px
- Background: primary color (#aae1e4)
- Border: 1px solid black
- Font size: 14px

### List Item
- Height: 60px
- Border radius: 50px
- Background: white
- Border: 1px solid black
- Horizontal padding: 22px
- Gap: 12px

### Icon Container
- Size: 42x42px
- Border radius: 21px (circular)
- Background: gray (#d9d9d9)

### Card/Container
- Background: white
- Border: 1px solid black
- Border radius: 25px
- Padding: 14px horizontal, 9px vertical

### Tab Switcher
- Height: 18px
- Border radius: 50px
- Inactive background: gray
- Active background: primary active color (#73ced3)
- Gap between tabs: 12px
- Font size: 14px

## 🔄 Updating the Style Guide

When adding new design tokens or common styles:

1. Add them to the appropriate section in `constants/styleGuide.ts`
2. Update this documentation with examples
3. Refactor existing components to use the new tokens where applicable
4. Ensure consistency across the app

## 📚 See Also

- `constants/types.ts` - TypeScript type definitions
- `app/index.tsx` - Example implementation (Welcome Screen)
- `app/home.tsx` - Example implementation (Main List Screen)

