import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/constants/styleGuide';
import { Entry, List } from '@/constants/types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface EntryCardProps {
  entry: Entry;
  list: List;
  onPress: () => void;
  onLongPress?: () => void;
  showDivider?: boolean;
}

export default function EntryCard({ entry, list, onPress, onLongPress, showDivider = true }: EntryCardProps) {
  const scale = useSharedValue(1);

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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPressAction = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get the "Name" field from field_values (should always be field ID "1")
  const entryName = entry.field_values['1'] || 'Untitled';

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get icon from list
  const getListIcon = () => {
    if (list.icon && list.icon.length === 1) {
      // It's an emoji, don't render as Ionicon
      return null;
    }
    return list.icon || 'list';
  };

  // Render stars for rating
  const renderStars = () => {
    if (!entry.rating) return null;

    const rating = entry.rating;
    const maxRating = list.rating_config?.max || 5;
    const stars = [];

    for (let i = 1; i <= maxRating; i++) {
      if (i <= rating) {
        stars.push(
          <Ionicons key={i} name="star" size={18} color={Colors.black} />
        );
      } else if (i - 0.5 <= rating) {
        stars.push(
          <Ionicons key={i} name="star-half" size={18} color={Colors.black} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={18} color={Colors.black} />
        );
      }
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // Render rating based on type
  const renderRating = () => {
    if (entry.rating === null || entry.rating === undefined) return null;

    if (list.rating_type === 'stars') {
      return renderStars();
    } else if (list.rating_type === 'points') {
      return <Text style={styles.ratingText}>{entry.rating}/100</Text>;
    } else if (list.rating_type === 'scale') {
      return <Text style={styles.ratingText}>{entry.rating}/10</Text>;
    }
  };

  const icon = getListIcon();

  return (
    <>
      <AnimatedTouchable
        style={[styles.container, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPressAction}
        activeOpacity={1}
      >
        {/* Left side: Icon */}
        <View style={styles.iconContainer}>
          {icon ? (
            <Ionicons name={icon as any} size={24} color={Colors.black} />
          ) : list.icon ? (
            <Text style={styles.emojiIcon}>{list.icon}</Text>
          ) : (
            <Ionicons name="list" size={24} color={Colors.black} />
          )}
        </View>

        {/* Middle: Entry info */}
        <View style={styles.content}>
          <Text style={styles.entryName} numberOfLines={1}>
            {entryName}
          </Text>
          <View style={styles.metadataRow}>
            {renderRating()}
            <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
          </View>
        </View>

        {/* Right side: Arrow */}
        <Ionicons name="chevron-forward" size={20} color={Colors.black} />
      </AnimatedTouchable>

      {/* Divider line */}
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.padding.inList,
    height: 60,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.gap.medium,
  },
  emojiIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  entryName: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.medium,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 0,
  },
  ratingText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  date: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },
});
