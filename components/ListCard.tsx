import { TouchableOpacity, View, Text, StyleSheet, Dimensions as RNDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles, Dimensions } from '@/constants/styleGuide';
import { List } from '@/constants/types';

const SCREEN_WIDTH = RNDimensions.get('window').width;
const HORIZONTAL_PADDING = Spacing.screenPadding.horizontal;
const GAP = Spacing.gap.medium;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - GAP) / 2;

interface ListCardProps {
  list: List & { entry_count: number; permission_type?: 'view' | 'edit'; is_owner?: boolean; owner_display_name?: string };
  onPress: () => void;
  onLongPress: () => void;
  containerWidth?: number; // Optional container width for responsive sizing
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * ListCard Component
 * Displays a single list with icon, name, entry count, and last updated date
 */
export default function ListCard({ list, onPress, onLongPress, containerWidth }: ListCardProps) {
  const scale = useSharedValue(1);

  // Calculate card width based on container width if provided, otherwise use default
  const cardWidth = containerWidth
    ? (containerWidth - GAP) / 2
    : CARD_WIDTH;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.97, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Format last updated date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get icon - use custom icon if set, otherwise infer from list name
  const getListIcon = () => {
    // If list has a custom icon
    if (list.icon) {
      // Check if it's an emoji (single character or contains emoji)
      // Emojis have length > 1 when encoded, but we should not use them as Ionicon names
      // Instead, infer from list name when we encounter emojis
      const isEmoji = /\p{Emoji}/u.test(list.icon);
      if (isEmoji) {
        // Don't use emoji, infer from list name instead
        const listName = list.name.toLowerCase();
        if (listName.includes('restaurant') || listName.includes('food')) {
          return 'restaurant';
        } else if (listName.includes('movie') || listName.includes('film')) {
          return 'film';
        } else if (listName.includes('book')) {
          return 'book';
        } else if (listName.includes('travel') || listName.includes('destination')) {
          return 'airplane';
        }
        return 'list';
      }
      // It's a valid Ionicon name
      return list.icon;
    }

    // Otherwise, infer from list name
    const listName = list.name.toLowerCase();
    if (listName.includes('restaurant') || listName.includes('food')) {
      return 'restaurant';
    } else if (listName.includes('movie') || listName.includes('film')) {
      return 'film';
    } else if (listName.includes('book')) {
      return 'book';
    } else if (listName.includes('travel') || listName.includes('destination')) {
      return 'airplane';
    }
    return 'list';
  };

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle, { width: cardWidth }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Icon Container */}
      <View style={styles.iconContainer}>
        <Ionicons name={getListIcon() as any} size={32} color={Colors.black} />
      </View>

      {/* List Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.listName} numberOfLines={2}>
          {list.name}
        </Text>
        <Text style={styles.entryCount}>
          {list.entry_count} {list.entry_count === 1 ? 'entry' : 'entries'}
        </Text>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.gap.medium,
    minHeight: 140,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  listName: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  entryCount: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
});

