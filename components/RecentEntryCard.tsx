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

  const renderStars = () => {
    const rating = entry.rating || 0;
    const maxRating = entry.list.rating_config?.max || 5;
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

  return (
    <>
      <AnimatedTouchable
        style={[styles.container, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Left side: Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={getListIcon() as any} size={24} color={Colors.black} />
        </View>

        {/* Middle: Entry info */}
        <View style={styles.content}>
          <Text style={styles.entryName} numberOfLines={1}>
            {getEntryName()}
          </Text>
          <View style={styles.metadataRow}>
            {entry.list.rating_type === 'stars' && renderStars()}
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
