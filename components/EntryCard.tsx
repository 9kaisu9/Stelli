import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import { Entry, List } from '@/constants/types';
import StarRating from '@/components/StarRating';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface EntryCardProps {
  entry: Entry;
  list: List;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function EntryCard({ entry, list, onPress, onLongPress }: EntryCardProps) {
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

  // Get rating display
  const getRatingDisplay = () => {
    if (entry.rating === null || entry.rating === undefined) return null;

    if (list.rating_type === 'stars') {
      return <StarRating rating={entry.rating} size="small" readonly />;
    } else if (list.rating_type === 'points') {
      return (
        <View style={styles.pointsRating}>
          <Ionicons name="trophy" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{entry.rating}/100</Text>
        </View>
      );
    } else if (list.rating_type === 'scale') {
      return (
        <View style={styles.scaleRating}>
          <Text style={styles.scaleText}>{entry.rating}/10</Text>
        </View>
      );
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '.');
  };

  // Get first 2-3 custom fields to display as preview
  const customFields = list.field_definitions
    .filter(field => field.id !== '1') // Exclude the Name field
    .slice(0, 2)
    .map(field => ({
      name: field.name,
      value: entry.field_values[field.id],
    }))
    .filter(field => field.value !== null && field.value !== undefined && field.value !== '');

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPressAction}
      activeOpacity={1}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {entryName}
          </Text>
          {getRatingDisplay()}
        </View>

        {customFields.length > 0 && (
          <View style={styles.fieldsPreview}>
            {customFields.map((field, index) => (
              <View key={index} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.name}:</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gray} />
            <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
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
    marginBottom: Spacing.gap.small,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.padding.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.gap.small,
  },
  name: {
    flex: 1,
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginRight: Spacing.gap.medium,
  },
  pointsRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.gap.small,
    paddingVertical: Spacing.gap.xs,
    borderRadius: BorderRadius.full,
  },
  pointsText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  scaleRating: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.gap.small,
    paddingVertical: Spacing.gap.xs,
    borderRadius: BorderRadius.full,
  },
  scaleText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  fieldsPreview: {
    marginBottom: Spacing.gap.small,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.gap.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginRight: Spacing.gap.xs,
  },
  fieldValue: {
    flex: 1,
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.gap.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
  },
  date: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
});
