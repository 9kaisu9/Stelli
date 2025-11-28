import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
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

interface ListCardProps {
  list: List & { entry_count: number; permission_type?: 'view' | 'edit'; is_owner?: boolean; owner_display_name?: string };
  onPress: () => void;
  onLongPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * ListCard Component
 * Displays a single list with icon, name, entry count, and last updated date
 */
export default function ListCard({ list, onPress, onLongPress }: ListCardProps) {
  const scale = useSharedValue(1);

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
      const isEmoji = /\p{Emoji}/u.test(list.icon) || list.icon.length <= 2;
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
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Icon Container */}
      <View style={styles.iconContainer}>
        <Ionicons name={getListIcon() as any} size={24} color={Colors.black} />
      </View>

      {/* List Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.listName} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={styles.metaText} numberOfLines={2}>
          {[
            `${list.entry_count} ${list.entry_count === 1 ? 'entry' : 'entries'}`,
            !list.is_owner && list.owner_display_name ? `by ${list.owner_display_name}` : null,
            `Updated ${formatDate(list.updated_at)}`,
          ]
            .filter(Boolean)
            .join(' • ')}
        </Text>
      </View>

      {/* Arrow Icon */}
      <Ionicons name="chevron-forward" size={20} color={Colors.black} />
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.listItem,
    paddingHorizontal: Spacing.padding.inList, // Override to match recent entries
    marginBottom: Spacing.gap.small,
  },
  iconContainer: {
    ...CommonStyles.iconContainer,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  listName: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  metaText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
});
