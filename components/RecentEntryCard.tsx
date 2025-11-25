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
import { RecentEntryWithList } from '@/lib/hooks/useRecentEntries';

interface RecentEntryCardProps {
  entry: RecentEntryWithList;
  onPress: () => void;
  showDivider?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function RecentEntryCard({ entry, onPress, showDivider = true }: RecentEntryCardProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getEntryName = () => {
    // Try to get name from field_values first
    if (entry.field_values && typeof entry.field_values === 'object') {
      const fieldValues = entry.field_values as Record<string, any>;
      if (fieldValues.name) return fieldValues.name;
    }
    return 'Unnamed Entry';
  };

  const getListIcon = () => {
    // If list has a custom icon, use it
    if (entry.list.icon) {
      return entry.list.icon;
    }

    // Otherwise, infer from list name
    const listName = entry.list.name.toLowerCase();
    if (listName.includes('restaurant') || listName.includes('food')) {
      return 'restaurant';
    } else if (listName.includes('movie') || listName.includes('film')) {
      return 'film';
    } else if (listName.includes('book')) {
      return 'book';
    } else if (listName.includes('travel') || listName.includes('destination')) {
      return 'airplane';
    }
    return 'pencil';
  };

  // Render rating inside icon circle
  const renderRatingIcon = () => {
    if (entry.rating === null || entry.rating === undefined) {
      return <Ionicons name="remove-outline" size={24} color={Colors.gray} />;
    }

    if (entry.list.rating_type === 'stars') {
      const rating = entry.rating;
      const maxRating = entry.list.rating_config?.max || 5;
      const starCount = Math.min(maxRating, 5);

      // For 5 stars, arrange in circular pattern (pentagon)
      if (starCount === 5) {
        return (
          <View style={styles.iconStarsCircular}>
            {Array.from({ length: 5 }).map((_, i) => {
              let starIcon;
              if (i + 1 <= rating) {
                starIcon = 'star';
              } else if (i + 0.5 <= rating) {
                starIcon = 'star-half';
              } else {
                starIcon = 'star-outline';
              }

              // Arrange stars in a circle (pentagon points)
              // Top star (0°), then clockwise
              const positions = [
                { top: 1, left: '50%', marginLeft: -4.5 },    // Top center
                { top: 8, right: 5 },                          // Top right
                { bottom: 4, right: 8 },                       // Bottom right
                { bottom: 4, left: 8 },                        // Bottom left
                { top: 8, left: 5 },                           // Top left
              ];

              return (
                <View key={i} style={[styles.starPosition, positions[i]]}>
                  <Ionicons name={starIcon as any} size={9} color={Colors.black} />
                </View>
              );
            })}
          </View>
        );
      }

      // For other star counts, use row layout
      return (
        <View style={styles.iconStarsContainer}>
          {Array.from({ length: starCount }).map((_, i) => {
            if (i + 1 <= rating) {
              return <Ionicons key={i} name="star" size={10} color={Colors.black} />;
            } else if (i + 0.5 <= rating) {
              return <Ionicons key={i} name="star-half" size={10} color={Colors.black} />;
            } else {
              return <Ionicons key={i} name="star-outline" size={10} color={Colors.black} />;
            }
          })}
        </View>
      );
    } else if (entry.list.rating_type === 'points') {
      return <Text style={styles.ratingIconText}>{entry.rating}</Text>;
    } else if (entry.list.rating_type === 'scale') {
      return <Text style={styles.ratingIconText}>{entry.rating}</Text>;
    }
  };

  return (
    <>
      <AnimatedTouchable
        style={[styles.container, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Left side: Rating Icon */}
        <View style={styles.iconContainer}>
          {renderRatingIcon()}
        </View>

        {/* Middle: Entry info */}
        <View style={styles.content}>
          <Text style={styles.entryName} numberOfLines={1}>
            {getEntryName()}
          </Text>
          <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
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
  date: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  iconStarsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    maxWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconStarsCircular: {
    width: 34,
    height: 30,
    position: 'relative',
  },
  starPosition: {
    position: 'absolute',
  },
  ratingIconText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },
});
