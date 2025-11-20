import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors, Typography, BorderRadius } from '@/constants/styleGuide';

interface TabSwitcherProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabSwitcher({
  tabs,
  activeTab,
  onTabChange,
}: TabSwitcherProps) {
  const handleTabPress = (tab: string) => {
    if (tab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <AnimatedTab
          key={tab}
          tab={tab}
          isActive={activeTab === tab}
          onPress={() => handleTabPress(tab)}
        />
      ))}
    </View>
  );
}

interface AnimatedTabProps {
  tab: string;
  isActive: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function AnimatedTab({ tab, isActive, onPress }: AnimatedTabProps) {
  const colorProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    colorProgress.value = withSpring(isActive ? 1 : 0, {
      damping: 20,
      stiffness: 500,
      overshootClamping: true,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        colorProgress.value,
        [0, 1],
        [Colors.lightGray, Colors.primaryActive] // lightGray -> teal
      ),
    };
  });

  return (
    <AnimatedTouchable
      style={[styles.tab, animatedStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.tabText}>{tab}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 28,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
});
