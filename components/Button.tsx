import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, CommonStyles, Dimensions } from '@/constants/styleGuide';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  size?: 'standard' | 'small';
  disabled?: boolean;
  fullWidth?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Button({
  onPress,
  label,
  variant = 'secondary',
  size = 'standard',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, {
        damping: 15,
        stiffness: 400,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const buttonStyle: ViewStyle[] = [
    CommonStyles.buttonBase,
    variant === 'primary' && styles.primaryButton,
    size === 'small' && styles.smallButton,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
  ];

  const textStyle: TextStyle[] = [
    CommonStyles.buttonText,
    size === 'small' && styles.smallButtonText,
    disabled && styles.disabledText,
  ];

  return (
    <AnimatedTouchable
      style={[buttonStyle, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Text style={textStyle}>{label}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  smallButton: {
    height: Dimensions.button.small,
    paddingHorizontal: 16,
  },
  smallButtonText: {
    ...CommonStyles.smallButtonText,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
