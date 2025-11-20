import { TouchableOpacity, Image, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius } from '@/constants/styleGuide';

interface IconButtonProps {
  onPress: () => void;
  icon: string;
  size?: number;
  backgroundColor?: string;
  variant?: 'primary' | 'secondary' | 'gray';
}

export default function IconButton({
  onPress,
  icon,
  size = 60,
  backgroundColor,
  variant = 'primary',
}: IconButtonProps) {
  const handlePress = () => {
    // Trigger light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'secondary':
        return Colors.white;
      case 'gray':
        return Colors.gray;
      default:
        return Colors.primary;
    }
  };

  const buttonStyle: ViewStyle = {
    width: size,
    height: size,
    backgroundColor: getBackgroundColor(),
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: icon }}
        style={{ width: size * 0.4, height: size * 0.4 }}
      />
    </TouchableOpacity>
  );
}
