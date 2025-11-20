import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import {
  Colors,
  CommonStyles,
  Spacing,
  Dimensions,
  BorderRadius,
} from '@/constants/styleGuide';

const ARROW_ICON_URL = 'http://localhost:3845/assets/625b3c63bbef87e985ad53ac800637cefbecb752.svg';

interface ListItemProps {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  showArrow?: boolean;
}

export default function ListItem({
  name,
  icon,
  onPress,
  showArrow = true,
}: ListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Image source={{ uri: icon }} style={styles.icon} />
      </View>

      <Text style={styles.name}>{name}</Text>

      {showArrow && (
        <View style={styles.arrowContainer}>
          <Image source={{ uri: ARROW_ICON_URL }} style={styles.arrow} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.listItem,
  },
  iconContainer: {
    ...CommonStyles.iconContainer,
  },
  icon: {
    width: Dimensions.icon.small,
    height: Dimensions.icon.small,
  },
  name: {
    ...CommonStyles.listItemText,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: Dimensions.arrow.width,
    height: Dimensions.arrow.height,
  },
});
