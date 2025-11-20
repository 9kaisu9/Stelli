# Stelli Components Documentation

This document provides details on all reusable components and screens in the Stelli app.

## 🎨 Color Conventions

The app uses a simple and consistent color convention for interactive states:

### Interactive State Colors

**Neutral Buttons** - `Colors.button.neutral` (`#aae1e4`)
- Used for: FAB (Floating Action Button), Next buttons, neutral action buttons
- Purpose: Standard pressable buttons that perform neutral actions
- Example: The circular "+" FAB, "Next" button in wizards

**Selected Items** - `Colors.button.selected` (`#73ced3`)
- Used for: Active/selected list items, active tab states
- Purpose: Indicates the currently selected or active state
- Example: Active tab in TabSwitcher, selected list items

**Usage:**
```typescript
import { Colors } from '@/constants/styleGuide';

// For neutral buttons
backgroundColor: Colors.button.neutral

// For selected items
backgroundColor: Colors.button.selected
```

## 📦 Reusable Components

All components are located in the `components/` directory and follow the style guide defined in `constants/styleGuide.ts`.

### Button (`components/Button.tsx`)

A versatile button component with multiple variants and sizes.

**Props:**
- `onPress: () => void` - Callback when button is pressed
- `label: string` - Button text
- `variant?: 'primary' | 'secondary'` - Visual style (default: 'secondary')
- `size?: 'standard' | 'small'` - Button size (default: 'standard')
- `disabled?: boolean` - Disabled state (default: false)
- `fullWidth?: boolean` - Stretch to full width (default: false)

**Usage:**
```typescript
import Button from '@/components/Button';

<Button
  label="Save"
  variant="primary"
  onPress={handleSave}
  fullWidth
/>
```

**Variants:**
- **Primary**: Light blue background (`#aae1e4`)
- **Secondary**: White background (default)

**Sizes:**
- **Standard**: 50px height, 20px font
- **Small**: 24px height, 14px font

---

### ListItem (`components/ListItem.tsx`)

A standardized list item with icon, text, and optional arrow.

**Props:**
- `id: string` - Unique identifier
- `name: string` - Display text
- `icon: string` - Icon URL
- `onPress: () => void` - Callback when pressed
- `showArrow?: boolean` - Show right arrow (default: true)

**Usage:**
```typescript
import ListItem from '@/components/ListItem';

<ListItem
  id="1"
  name="Restaurants"
  icon={RESTAURANT_ICON_URL}
  onPress={handlePress}
/>
```

**Features:**
- 60px height
- Fully rounded (50px border radius)
- Gray circular icon container (42px)
- Auto-sized text area
- Right arrow indicator

---

### StarRating (`components/StarRating.tsx`)

Interactive or display-only star rating component.

**Props:**
- `rating: number` - Current rating (0-5)
- `size?: 'small' | 'medium' | 'large'` - Star size (default: 'medium')
- `readonly?: boolean` - Disable interaction (default: true)
- `onRatingChange?: (rating: number) => void` - Callback when rating changes

**Usage:**
```typescript
import StarRating from '@/components/StarRating';

// Display only
<StarRating rating={4.5} />

// Interactive
<StarRating
  rating={rating}
  size="large"
  readonly={false}
  onRatingChange={setRating}
/>
```

**Features:**
- Supports half stars (e.g., 4.5)
- Three sizes: small (70%), medium (100%), large (150%)
- Click individual stars to set rating (when not readonly)
- Visual feedback with filled/half/empty stars

---

### Card (`components/Card.tsx`)

A container component with consistent styling.

**Props:**
- `children: ReactNode` - Card content
- `style?: ViewStyle` - Additional styles
- `padding?: number` - Custom padding (default: 14)

**Usage:**
```typescript
import Card from '@/components/Card';

<Card>
  <Text>Card content</Text>
</Card>

<Card padding={20}>
  <Text>Custom padding</Text>
</Card>
```

**Features:**
- White background
- Black border (1px)
- 25px border radius
- Default 14px padding

---

### TabSwitcher (`components/TabSwitcher.tsx`)

Tab navigation component with animated active state transitions.

**Props:**
- `tabs: string[]` - Tab labels array
- `activeTab: string` - Currently active tab
- `onTabChange: (tab: string) => void` - Callback when tab changes

**Usage:**
```typescript
import TabSwitcher from '@/components/TabSwitcher';

const [activeTab, setActiveTab] = useState('Mine');

<TabSwitcher
  tabs={['Mine', 'Imported']}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

**Features:**
- Equal width tabs (flex: 1)
- Active tab: teal background (`#73ced3`)
- Inactive tab: gray background (`#d9d9d9`)
- Smooth animated color transition using React Native Reanimated
- 28px height, fully rounded
- 1px black border on each tab
- 4px gap between tabs
- 14px font size (Nunito Bold)
- Haptic feedback on tab change

**Animation:**
- Uses `interpolateColor` for smooth background transitions
- Spring physics: damping 30, stiffness 400, overshoot clamping enabled
- No bounce effect for precise UI feel

---

### IconButton (`components/IconButton.tsx`)

Circular button with icon, customizable size and background.

**Props:**
- `onPress: () => void` - Callback when pressed
- `icon: string` - Icon URL
- `size?: number` - Button diameter (default: 60)
- `backgroundColor?: string` - Custom background color
- `variant?: 'primary' | 'secondary' | 'gray'` - Predefined color (default: 'primary')

**Usage:**
```typescript
import IconButton from '@/components/IconButton';

<IconButton
  icon={ADD_ICON_URL}
  onPress={handleAdd}
  variant="primary"
/>

<IconButton
  icon={CUSTOM_ICON}
  onPress={handleCustom}
  size={80}
  backgroundColor="#ff0000"
/>
```

**Features:**
- Circular shape
- Icon scales to 40% of button size
- Black border (1px)
- Variant colors: primary (light blue), secondary (white), gray

---

## 📱 Screens

All screens are located in the `app/` directory using Expo Router file-based routing.

### Welcome Screen (`app/index.tsx`)

**Route:** `/` (root)

Initial login/welcome screen with authentication options.

**Features:**
- App logo display (Stella & Eli)
- Welcome message
- Three authentication buttons:
  - Continue with Apple
  - Continue with Google
  - Continue with Email
- Sign up link
- Navigation to home screen

**Navigation:**
```typescript
router.push('/home');
```

---

### Main List Screen (`app/home.tsx`)

**Route:** `/home`

Main dashboard showing recent entries and user lists.

**Features:**
- Profile icon (navigates to `/profile`)
- Recent entries section:
  - Last 3 entries with ratings
  - Entry name, date, star rating
  - Tap to view entry details
- Lists section:
  - Tab switcher (Mine/Imported)
  - User's lists
  - "+ New List" button
  - Add button (circular)
- Star rating display

**Navigation:**
- Profile → `/profile`
- Entry → `/entry-detail`
- List → `/list-detail`
- Add → `/add-entry`

---

### Entry Detail Screen (`app/entry-detail.tsx`)

**Route:** `/entry-detail`

View and edit details of a specific entry.

**Features:**
- Back navigation
- Large entry icon and name
- Creation date
- Interactive star rating
- Details card:
  - Category
  - List
  - Location
- Notes editor (multiline text input)
- Tags display (pill-shaped)
- Action buttons:
  - Save Changes (primary)
  - Delete Entry (secondary)

**Components Used:**
- Button
- StarRating
- Card

---

### List Detail Screen (`app/list-detail.tsx`)

**Route:** `/list-detail`

View all entries in a specific list with sorting and statistics.

**Features:**
- Back navigation
- List header with icon and name
- Statistics cards:
  - Total entries count
  - Average rating
  - Highest rating
- Sort options:
  - TabSwitcher (Date, Rating, Name)
  - Live sorting
- Entries list:
  - Entry icon, name, date
  - Star rating
  - Notes preview
  - Tap to view details
- Add entry button

**Components Used:**
- TabSwitcher
- IconButton
- StarRating

**Sorting Logic:**
- Date: Most recent first
- Rating: Highest first
- Name: Alphabetical

---

### Add Entry Screen (`app/add-entry.tsx`)

**Route:** `/add-entry`

Create a new entry with full details.

**Features:**
- Back navigation
- Form fields:
  - **Name** (required) - Text input
  - **Category** (required) - Three button choices with icons
  - **Rating** (required) - Interactive star rating
  - **List** (required) - Radio button selection
  - **Location** (optional) - Text input
  - **Notes** (optional) - Multiline text area
  - **Tags** (optional) - Add/remove tags dynamically
- Visual validation:
  - Required fields marked with *
  - Save button disabled until required fields filled
- Action buttons:
  - Save Entry (primary, disabled when invalid)
  - Cancel (secondary)

**Components Used:**
- Button
- StarRating
- Card

**Form Validation:**
- Name must not be empty
- Rating must be > 0
- List must be selected

---

### Profile Screen (`app/profile.tsx`)

**Route:** `/profile`

User profile and app settings.

**Features:**
- Back navigation
- Profile header:
  - Large avatar
  - Name and email
  - Edit Profile button
- Statistics cards:
  - Total entries
  - Total lists
  - Average rating
- Settings sections:
  - **Account**: Email, Password, Display Name
  - **App Settings**: Notifications, Dark Mode, Auto Backup, Language
  - **Data Management**: Export, Import, Backup & Restore
  - **About**: Version, Privacy Policy, Terms of Service
- Toggle switches for boolean settings
- Log Out button

**Components Used:**
- Button
- Card

**Setting Types:**
- **Navigation**: Shows arrow, navigates on press
- **Toggle**: Shows switch control
- **Info**: Shows static value

---

## 🔗 Navigation Flow

```
Welcome Screen (/)
    ↓
Home Screen (/home)
    ├── Profile Icon → Profile Screen (/profile)
    ├── Recent Entry → Entry Detail (/entry-detail)
    ├── List → List Detail (/list-detail)
    └── Add Button → Add Entry (/add-entry)

List Detail (/list-detail)
    ├── Entry → Entry Detail (/entry-detail)
    └── Add Button → Add Entry (/add-entry)

Entry Detail (/entry-detail)
    └── Delete → Back to previous screen

Add Entry (/add-entry)
    ├── Save → Back to previous screen
    └── Cancel → Back to previous screen

Profile (/profile)
    └── Log Out → Welcome Screen (/)
```

---

## 🎨 Consistent Patterns

All screens follow these patterns:

### Header Pattern
```typescript
<View style={styles.header}>
  <TouchableOpacity onPress={handleBack}>
    {/* Back arrow */}
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Title</Text>
  <View style={styles.headerSpacer} />
</View>
```

### Card Pattern
```typescript
<Card style={styles.section}>
  <Text style={styles.sectionTitle}>Section Title</Text>
  {/* Content */}
</Card>
```

### Action Buttons Pattern
```typescript
<View style={styles.actionButtons}>
  <Button label="Primary Action" variant="primary" onPress={handleSave} fullWidth />
  <Button label="Secondary Action" onPress={handleCancel} fullWidth />
</View>
```

---

## 🎬 Animation System

All interactive components use **React Native Reanimated** for smooth, hardware-accelerated animations.

### Installed Dependencies
- `react-native-reanimated`: ~4.1.1
- `react-native-worklets`: ^0.5.1 (peer dependency)

### Animation Patterns

#### Press Scale Animation
Used in: Button, ListCard, RecentEntryCard

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function Component() {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Content */}
    </AnimatedTouchable>
  );
}
```

**Scale values:**
- Button: 0.96 (4% reduction)
- ListCard & RecentEntryCard: 0.97 (3% reduction)

#### Color Interpolation Animation
Used in: TabSwitcher

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

function AnimatedTab({ isActive }: { isActive: boolean }) {
  const colorProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    colorProgress.value = withSpring(isActive ? 1 : 0, {
      damping: 30,
      stiffness: 400,
      overshootClamping: true,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        colorProgress.value,
        [0, 1],
        ['#d9d9d9', '#73ced3'] // gray -> teal
      ),
    };
  });

  return (
    <Animated.View style={[styles.tab, animatedStyle]}>
      {/* Tab content */}
    </Animated.View>
  );
}
```

### Spring Physics Settings

All animations use spring physics for natural motion:

**Standard Press Animations:**
- `damping: 15` - Quick response
- `stiffness: 400` - Snappy feel

**Color Transitions (TabSwitcher):**
- `damping: 30` - Smooth, controlled
- `stiffness: 400` - Quick transition
- `overshootClamping: true` - No bounce

### Best Practices

1. **Always use Animated components**
   ```typescript
   const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
   ```

2. **Shared values for animation state**
   ```typescript
   const scale = useSharedValue(1);
   ```

3. **useAnimatedStyle for computed styles**
   ```typescript
   const animatedStyle = useAnimatedStyle(() => ({
     transform: [{ scale: scale.value }],
   }));
   ```

4. **withSpring for all animations** (consistent feel)

5. **Set activeOpacity={1}** when using custom scale animations

---

## 💡 Best Practices

### Using Components

1. **Always import from `@/components/`**
   ```typescript
   import Button from '@/components/Button';
   ```

2. **Use style guide constants**
   ```typescript
   import { Colors, Spacing } from '@/constants/styleGuide';
   ```

3. **Spread common styles**
   ```typescript
   style={[CommonStyles.buttonBase, customStyles]}
   ```

### Navigation

1. **Use Expo Router**
   ```typescript
   const router = useRouter();
   router.push('/screen-name');
   router.back();
   ```

2. **Pass parameters** (for future implementation)
   ```typescript
   router.push({
     pathname: '/entry-detail',
     params: { id: entryId }
   });
   ```

### Form Handling

1. **Use controlled components**
   ```typescript
   const [value, setValue] = useState('');
   <TextInput value={value} onChangeText={setValue} />
   ```

2. **Validate before save**
   ```typescript
   <Button disabled={!name || !rating} />
   ```

---

## 🔄 State Management

Currently using local component state (`useState`). For production:

- Consider Context API for global state (user, theme)
- Use async storage for persistence
- Implement proper data fetching/caching

---

## 📝 TypeScript Types

All TypeScript types are defined in `constants/types.ts`:

- `RecentEntry`
- `ListItem`
- `User`
- Component prop interfaces
- API response types
- Form data types

Import and use consistently:
```typescript
import { RecentEntry, ListItem } from '@/constants/types';
```
