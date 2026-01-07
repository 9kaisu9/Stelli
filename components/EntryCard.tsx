import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import { Entry, List, FieldDefinition } from '@/constants/types';

interface EntryCardProps {
  entry: Entry;
  list: List;
  onPress: () => void;
  onLongPress?: () => void;
}

// Tag component for custom field values
const Tag = ({ text, icon }: { text: string; icon?: string }) => (
  <View style={styles.tag}>
    {icon && <Ionicons name={icon as any} size={12} color={Colors.black} style={styles.tagIcon} />}
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

export default function EntryCard({ entry, list, onPress, onLongPress }: EntryCardProps) {
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

  // Get the "Name" field from field_values
  const entryName = entry.field_values?.name || 'Unnamed Entry';

  // Format date for row 2
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format date for tags (more compact)
  const formatDateForTag = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Render inline rating for row 2 (compact version)
  const renderRatingInline = () => {
    if (entry.rating === null || entry.rating === undefined) {
      return null;
    }

    // Format rating: show 1 decimal if needed, otherwise show as integer
    const formattedRating = entry.rating % 1 === 0 ? entry.rating.toString() : entry.rating.toFixed(1);

    if (list.rating_type === 'stars') {
      return (
        <View style={styles.inlineRating}>
          <Ionicons name="star" size={12} color={Colors.black} style={styles.ratingIcon} />
          <Text style={styles.inlineRatingText}>{formattedRating} / 5</Text>
        </View>
      );
    } else if (list.rating_type === 'points') {
      const maxPoints = list.rating_config?.max || 100;
      return (
        <View style={styles.inlineRating}>
          <Ionicons name="trophy" size={12} color={Colors.black} style={styles.ratingIcon} />
          <Text style={styles.inlineRatingText}>{formattedRating} / {maxPoints}</Text>
        </View>
      );
    } else if (list.rating_type === 'scale') {
      const maxScale = list.rating_config?.max || 10;
      return (
        <View style={styles.inlineRating}>
          <Ionicons name="analytics" size={12} color={Colors.black} style={styles.ratingIcon} />
          <Text style={styles.inlineRatingText}>{formattedRating} / {maxScale}</Text>
        </View>
      );
    }

    return null;
  };

  // Render custom field tags
  const renderCustomFieldTags = () => {
    const tags: JSX.Element[] = [];

    // Sort fields by order
    const sortedFields = [...list.field_definitions].sort((a, b) => a.order - b.order);

    sortedFields.forEach((field: FieldDefinition) => {
      const value = entry.field_values[field.id];

      // Skip empty values
      if (value === null || value === undefined || value === '') return;

      switch (field.type) {
        case 'text':
        case 'dropdown':
          if (String(value).length <= 15) {
            tags.push(<Tag key={field.id} text={String(value)} />);
          }
          break;

        case 'number':
          tags.push(<Tag key={field.id} text={String(value)} />);
          break;

        case 'date':
          const formattedDate = formatDateForTag(value);
          if (formattedDate.length <= 15) {
            tags.push(<Tag key={field.id} text={formattedDate} />);
          }
          break;

        case 'multi-select':
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (String(item).length <= 15) {
                tags.push(<Tag key={`${field.id}-${index}`} text={String(item)} />);
              }
            });
          }
          break;

        case 'yes-no':
          if (value === true || value === 'yes') {
            tags.push(
              <Tag
                key={field.id}
                text={field.name}
              />
            );
          }
          break;

        case 'rating':
          // Display custom rating field with icon and max value
          const ratingValue = Number(value);
          const maxRating = field.ratingConfig?.max || 5;
          // Format: remove .0 if whole number
          const formattedRating = ratingValue % 1 === 0 ? ratingValue.toString() : ratingValue.toFixed(1);
          const ratingText = `${formattedRating} / ${maxRating}`;
          tags.push(
            <Tag
              key={field.id}
              text={ratingText}
            />
          );
          break;

        case 'photos':
          // Skip - photos are shown as main image
          break;
      }
    });

    return tags;
  };

  const hasImage = !!entry.main_image_url;
  const hasRating = entry.rating !== null && entry.rating !== undefined;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Clickable background layer */}
      <TouchableWithoutFeedback
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPressAction}
      >
        <View style={styles.clickableArea}>
          {/* Left side: 3-row layout */}
          <View style={styles.leftContent}>
            {/* Row 1: Title */}
            <Text style={styles.entryName} numberOfLines={1}>
              {entryName}
            </Text>

            {/* Row 2: Rating and Date */}
            <View style={styles.dateRatingRow}>
              {hasRating && (
                <View style={styles.ratingBorder}>
                  {renderRatingInline()}
                </View>
              )}
              {hasRating && <Text style={styles.separator}> | </Text>}
              <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
            </View>

            {/* Row 3: Placeholder for tags height */}
            <View style={styles.tagsScrollContainer} />
          </View>

          {/* Right side: Image thumbnail (if exists) */}
          {hasImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: entry.main_image_url! }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Row 3: Custom Field Tags - Positioned absolutely to avoid touch conflicts */}
      <View
        style={[
          styles.tagsAbsoluteContainer,
          { right: hasImage ? 100 + Spacing.gap.medium * 2 : Spacing.gap.medium }
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScrollView}
          contentContainerStyle={styles.tagsContent}
        >
          {renderCustomFieldTags()}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clickableArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.gap.medium,
    minHeight: 120,
  },
  leftContent: {
    flex: 1,
    justifyContent: 'space-between',
    marginRight: Spacing.gap.medium,
  },
  entryName: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  dateRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBorder: {
    backgroundColor: Colors.rating,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  date: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  separator: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  inlineRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    marginRight: 3,
  },
  inlineRatingText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
  tagsScrollContainer: {
    height: 28,
  },
  tagsAbsoluteContainer: {
    position: 'absolute',
    bottom: Spacing.gap.medium,
    left: Spacing.gap.medium,
    height: 28,
  },
  tagsScrollView: {
    flexGrow: 0,
  },
  tagsContent: {
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.black,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
});

