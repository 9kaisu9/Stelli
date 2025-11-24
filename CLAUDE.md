# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stelli** is a React Native mobile app built with Expo Router for iOS and Android. It's a personal database app where users create customizable lists (restaurants, movies, journals, etc.) with custom fields and ratings. Premium features include voice-to-text entry creation with AI field extraction.

**Tech Stack**: React Native 0.81 • Expo SDK 54 • Expo Router • TypeScript • Supabase • TanStack Query • React Native Reanimated • Stripe • PostHog

---

## Code Style Guidelines

### Icons and Emojis
**CRITICAL**: The user does NOT want emojis used in this project. NEVER use emojis in code, UI, or data unless explicitly requested by the user. Always use icons from open-source icon libraries instead.

- **Preferred Icon Library**: `@expo/vector-icons` (includes Ionicons, MaterialIcons, FontAwesome, etc.)
- **Example**: Use `<Ionicons name="restaurant" />` instead of 🍽️ emoji
- **User Preference**: No emojis in icon pickers, default values, or suggestions
- **Only use emojis**: When the user specifically requests them or when editing existing emoji-based code that already contains emojis
- **Icon resources**: https://icons.expo.fyi/

---

## Development Commands

### Running the App
```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run in web browser
```

### Installation
```bash
npm install                        # Install dependencies
npm install <package> --legacy-peer-deps  # If peer dependency conflicts occur
```

**Note**: Due to React 19.1 vs 19.2 peer dependency conflicts, use `--legacy-peer-deps` flag when installing new packages.

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in credentials for:
   - Supabase (URL + anon key)
   - Stripe (publishable key)
   - PostHog (API key)
   - OpenAI (for voice features - Phase 2)

### Database Setup
Generate TypeScript types from Supabase:
```bash
npx supabase gen types typescript --project-id <project-id> --schema public > lib/database.types.ts
```

---

## Architecture

### Provider Hierarchy
All providers are configured in [app/_layout.tsx](app/_layout.tsx):
```
PostHogProvider (analytics)
└── QueryClientProvider (server state)
    └── AuthProvider (authentication)
        └── Expo Router Stack (navigation)
```

### State Management
- **Authentication**: React Context ([lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx))
  - `useAuth()` hook provides `{ user, profile, loading, signOut, refreshProfile }`
  - Session persisted in Expo SecureStore
  - Auto-fetches user profile from Supabase

- **Server State**: TanStack Query ([lib/queryClient.ts](lib/queryClient.ts))
  - 5min stale time, 10min cache time
  - Auto-refetch on reconnect
  - Network state listener via NetInfo

- **Component State**: Local `useState` for UI state

### Data Layer
- **Supabase Client**: [lib/supabase.ts](lib/supabase.ts) - PostgreSQL database + auth
- **Database Types**: [lib/database.types.ts](lib/database.types.ts) - Generated from Supabase schema
- **Analytics**: [lib/posthog.ts](lib/posthog.ts) - Event tracking helpers

### Routing (Expo Router - File-based)
Routes are defined by file structure in `app/` directory:
- `app/index.tsx` → `/` (welcome screen)
- `app/(authenticated)/home.tsx` → `/home` (protected route)
- `app/(authenticated)/list/[id].tsx` → `/list/:id` (dynamic route)

**Navigation**:
```typescript
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/home');
router.push({ pathname: '/entry/[id]', params: { id: '123' } });
```

---

## Design System

### Import Pattern
```typescript
import { Colors, Typography, Spacing, BorderRadius, Dimensions, CommonStyles } from '@/constants/styleGuide';
```

### Key Constants
- **Colors**: `Colors.background` (#ebfeff), `Colors.primary` (#aae1e4), `Colors.primaryActive` (#73ced3)
- **Fonts**: Nunito_400Regular, Nunito_700Bold
- **Spacing**: Screen padding (24h/64v), gaps (xs:4, small:8, medium:12, large:16, xl:60)
- **Border Radius**: full (50px for buttons), large (25px for cards), circle (30px)

### Always Use CommonStyles
Spread common styles and override as needed:
```typescript
const styles = StyleSheet.create({
  button: {
    ...CommonStyles.buttonBase,  // height, border, radius
    backgroundColor: Colors.primary,
  },
  title: {
    ...CommonStyles.title,       // fontSize, weight, alignment
  },
});
```

**Documentation**: See [STYLE_GUIDE.md](STYLE_GUIDE.md) for complete system and [COMPONENTS.md](COMPONENTS.md) for component specs.

---

## Component Patterns

### File Structure
- **Location**: `components/` directory
- **Naming**: PascalCase (e.g., `Button.tsx`)
- **Exports**: Default export
- **Import Path**: `@/components/ComponentName`

### Standard Component Template
```typescript
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, CommonStyles } from '@/constants/styleGuide';

interface ComponentNameProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
}

export default function ComponentName({
  onPress,
  label,
  variant = 'primary',
}: ComponentNameProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[CommonStyles.buttonBase, variant === 'primary' && styles.primary]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={CommonStyles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
  },
});
```

### Existing Components
- **Button** - Primary/secondary variants, haptic feedback
- **TextInput** - Form input with label, error, helper text
- **Card** - Container with standard styling
- **ListItem** - List row with icon, text, arrow
- **StarRating** - Interactive/readonly rating (uses Ionicons)
- **TabSwitcher** - Tab navigation
- **IconButton** - Circular button with icon

### Component Requirements
✅ Add haptic feedback to all interactive components
✅ Use React Native Reanimated for animations (see Animation Patterns below)
✅ Use CommonStyles for base styling
✅ Strong TypeScript typing for props
✅ Use `@/` path aliases for imports
✅ Document in COMPONENTS.md

---

## Animation Patterns

All interactive components use **React Native Reanimated** for smooth, hardware-accelerated animations.

### Setup

**Required Dependencies:**
```bash
npm install react-native-reanimated@~4.1.1 --legacy-peer-deps
npm install react-native-worklets@^0.5.1 --legacy-peer-deps
```

**Babel Configuration** ([babel.config.js](babel.config.js)):
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

### Standard Press Animation

Use for buttons, cards, and interactive elements:

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

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
```

**Scale Values:**
- Button: 0.96 (4% reduction)
- Cards: 0.97 (3% reduction)

### Color Interpolation Animation

Use for state transitions (e.g., TabSwitcher):

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

const colorProgress = useSharedValue(isActive ? 1 : 0);

useEffect(() => {
  colorProgress.value = withSpring(isActive ? 1 : 0, {
    damping: 30,
    stiffness: 400,
    overshootClamping: true,
  });
}, [isActive]);

const animatedStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    colorProgress.value,
    [0, 1],
    ['#d9d9d9', '#73ced3'] // gray -> teal
  ),
}));
```

### Spring Physics Guidelines

**Press Animations:**
- damping: 15 (quick response)
- stiffness: 400 (snappy)

**Color Transitions:**
- damping: 30 (smooth)
- stiffness: 400 (quick)
- overshootClamping: true (no bounce)

**Best Practices:**
- Always set `activeOpacity={1}` when using custom scale animations
- Use `Animated.createAnimatedComponent()` for non-animated components
- Prefer spring physics over timing for natural feel
- Keep animation values consistent across similar components

---

## Data Fetching Patterns

### Query Pattern
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';

const { user } = useAuth();

const { data: lists, isLoading, error } = useQuery({
  queryKey: ['lists', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
  enabled: !!user,  // Only run if user is authenticated
});
```

### Mutation Pattern
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trackEvent } from '@/lib/posthog';

const queryClient = useQueryClient();

const createListMutation = useMutation({
  mutationFn: async (newList: CreateListData) => {
    const { data, error } = await supabase
      .from('lists')
      .insert({
        user_id: user.id,
        ...newList,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['lists'] });
    trackEvent('List Created', { listName: data.name });
  },
});

// Usage
createListMutation.mutate({ name: 'My List', rating_type: 'stars' });
```

### Authentication Pattern
```typescript
const { user, profile, loading, signOut } = useAuth();

// Protect routes
if (loading) return <LoadingScreen />;
if (!user) return <Redirect href="/" />;

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
await signOut();
```

---

## Database Schema

### Tables
**profiles** - User profiles
- `subscription_tier`: 'free' | 'premium'
- `subscription_expires_at`

**lists** - User-created lists
- `rating_type`: 'stars' | 'points' | 'scale'
- `rating_config`: JSON (max, step)
- `field_definitions`: JSON array of FieldDefinition
- `is_template`: boolean

**entries** - List entries
- `rating`: number (main rating)
- `field_values`: JSON object (flexible field data)

**shared_lists** - List sharing
- `permission_type`: 'view' | 'edit'
- `share_token`: unique sharing URL

**list_imports** - Track imported lists from other users

### Field Definitions Structure
```typescript
interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'multi-select' | 'yes-no' | 'rating';
  required: boolean;
  options?: string[];  // for dropdown/multi-select
  ratingConfig?: { max: number; step: number };  // for rating fields
  order: number;
}
```

**Types**: See [constants/types.ts](constants/types.ts) for all data models.

---

## Analytics Integration

### PostHog Helpers
```typescript
import { trackEvent, trackScreenView, identifyUser } from '@/lib/posthog';

// Screen tracking
useEffect(() => {
  trackScreenView('Home Screen');
}, []);

// Event tracking
trackEvent('List Created', { listName, category });

// User identification
useEffect(() => {
  if (user) {
    identifyUser(user.id, {
      email: user.email,
      subscription_tier: profile?.subscription_tier,
    });
  }
}, [user, profile]);
```

---

## Form Handling

### Form Libraries (Not Yet Implemented)
Dependencies installed: `react-hook-form` + `zod`

### Expected Pattern
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  rating: z.number().min(0).max(5),
});

type FormData = z.infer<typeof schema>;

const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

const onSubmit = (data: FormData) => {
  createMutation.mutate(data);
};
```

**Validation schemas** should be created in `lib/validation/` directory.

---

## Important Conventions

### Path Aliases
Always use `@/` path alias (configured in [tsconfig.json](tsconfig.json)):
```typescript
// ✅ DO THIS
import Button from '@/components/Button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Colors } from '@/constants/styleGuide';

// ❌ DON'T DO THIS
import Button from '../../components/Button';
```

### File Naming
- **Components**: PascalCase (`Button.tsx`, `StarRating.tsx`)
- **Screens**: lowercase (`index.tsx`, `home.tsx`)
- **Dynamic routes**: `[id].tsx`, `[listId].tsx`
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useLists.ts`)
- **Utils**: camelCase (`formatDate.ts`, `validation.ts`)

### Type Definitions
- Define in `constants/types.ts` or inline with component
- All props interfaces must be strongly typed
- No `any` types

### Styling
- Use CommonStyles as base
- Never hardcode colors/spacing - use styleGuide constants
- StyleSheet.create() at file bottom
- Responsive to different screen sizes

---

## Protected Routes

### Pattern (To Be Implemented)
Create `app/(authenticated)/_layout.tsx`:
```typescript
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/" />;

  return <Slot />;
}
```

All screens inside `app/(authenticated)/` are protected.

---

## Subscription & Premium Features

### Free Tier Limits
- 1 list maximum
- 20 entries per list
- No voice memo feature

### Premium Tier
- Unlimited lists and entries
- Voice-to-text entry creation with AI field extraction (OpenAI Whisper + GPT-4o-mini)
- Future: Photo attachments, location fields

### Checking Subscription
```typescript
const { profile } = useAuth();
const isPremium = profile?.subscription_tier === 'premium';

if (!isPremium && listCount >= 1) {
  // Show upgrade prompt
  router.push('/subscription');
}
```

---

## Screen Creation Checklist

When implementing a new screen:

1. ✅ Create file in `app/(authenticated)/` for protected routes
2. ✅ Use `useAuth()` to access user/profile
3. ✅ Implement loading state (`isLoading` from queries)
4. ✅ Add error handling for queries/mutations
5. ✅ Use React Query for data fetching
6. ✅ Follow layout patterns from STYLE_GUIDE.md
7. ✅ Add PostHog screen tracking on mount
8. ✅ Use CommonStyles for consistent styling
9. ✅ Add haptic feedback to interactions
10. ✅ Handle empty states (no data)

---

## Testing

**Current Status**: No testing infrastructure set up.

**Future**: Add Jest + React Native Testing Library when implementing tests.

---

## Known Issues

1. **Peer Dependencies**: React 19.1 vs 19.2 conflicts - use `--legacy-peer-deps` when installing packages
2. **Environment Variables**: `.env` file must be created from `.env.example` before running
3. **Supabase Setup**: Database schema and RLS policies must be created before app functions
4. **No README**: Project lacks README - should be created for onboarding

---

## Reference Documentation

- [STYLE_GUIDE.md](STYLE_GUIDE.md) - Complete design system
- [COMPONENTS.md](COMPONENTS.md) - Component specifications and usage
- [constants/types.ts](constants/types.ts) - All TypeScript types
- [.env.example](.env.example) - Required environment variables

---

## Key Files Reference

| File | Purpose |
|------|---------|
| [app/_layout.tsx](app/_layout.tsx) | Root layout with all providers |
| [lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx) | Authentication context |
| [lib/supabase.ts](lib/supabase.ts) | Supabase client setup |
| [lib/queryClient.ts](lib/queryClient.ts) | React Query configuration |
| [lib/posthog.ts](lib/posthog.ts) | Analytics helpers |
| [constants/styleGuide.ts](constants/styleGuide.ts) | Design system constants |
| [constants/types.ts](constants/types.ts) | TypeScript type definitions |
