import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Dimensions } from '@/constants/styleGuide';

interface StarRatingProps {
  rating: number; // 0-5
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  size = 'medium',
  readonly = true,
  onRatingChange,
}: StarRatingProps) {
  const handleStarPress = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  // Calculate star size based on size prop
  const starSize = size === 'small'
    ? Dimensions.star.width * 0.7
    : size === 'large'
    ? Dimensions.star.width * 1.5
    : Dimensions.star.width;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      let starIcon: 'star' | 'star-half' | 'star-outline' = 'star-outline';

      if (i < fullStars) {
        starIcon = 'star';
      } else if (i === fullStars && hasHalfStar) {
        starIcon = 'star-half';
      }

      const star = (
        <Ionicons
          key={i}
          name={starIcon}
          size={starSize}
          color={Colors.primary}
          style={styles.star}
        />
      );

      if (readonly) {
        stars.push(star);
      } else {
        stars.push(
          <TouchableOpacity
            key={i}
            onPress={() => handleStarPress(i)}
            activeOpacity={0.7}
          >
            {star}
          </TouchableOpacity>
        );
      }
    }

    return stars;
  };

  return <View style={styles.container}>{renderStars()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 1,
  },
});
