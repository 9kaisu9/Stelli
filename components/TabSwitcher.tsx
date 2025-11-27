import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
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

function AnimatedTab({ tab, isActive, onPress }: AnimatedTabProps) {
  return (
    <TouchableOpacity
      style={[
        styles.tab,
        { backgroundColor: isActive ? Colors.primaryActive : Colors.lightGray },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.tabText}>{tab}</Text>
    </TouchableOpacity>
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
