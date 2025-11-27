import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput as RNTextInput } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Popular icons for lists - things you can actually make lists about
const ICON_OPTIONS = [
  'list',
  'restaurant',
  'film',
  'book',
  'airplane',
  'car',
  'home',
  'musical-notes',
  'game-controller',
  'fitness',
  'pizza',
  'cafe',
  'wine',
  'beer',
  'ice-cream',
  'fast-food',
  'tv',
  'headphones',
  'camera',
  'umbrella',
  'gift',
  'heart',
  'star',
  'bookmark',
  'flag',
  'trophy',
  'medal',
  'basketball',
  'football',
  'bicycle',
  'boat',
  'train',
  'rocket',
  'briefcase',
  'school',
  'calculator',
  'laptop',
  'phone-portrait',
  'watch',
  'shirt',
  'bag',
  'paw',
  'leaf',
  'flower',
  'sunny',
  'moon',
  'location',
  'map',
  'compass',
  'globe',
  'brush',
  'color-palette',
  'easel',
  'build',
  'construct',
  'hammer',
  'key',
  'magnet',
  'bulb',
  'barbell',
  'pulse',
  'nutrition',
  'water',
  'flame',
  'snow',
  'cloudy',
  'rainy',
  'thunderstorm',
  'partly-sunny',
  'rose',
  'sparkles',
  'diamond',
  'footsteps',
  'walk',
  'hourglass',
  'timer',
  'stopwatch',
  'alarm',
  'calendar',
  'cart',
  'basket',
  'storefront',
  'business',
  'cash',
  'card',
  'wallet',
  'tennisball',
  'baseball',
  'american-football',
  'egg',
  'fish',
  'ribbon',
  'terminal',
  'flask',
  'telescope',
  'planet',
  'earth',
  'pencil',
  'document',
  'folder',
  'newspaper',
  'journal',
  'library',
  'image',
  'albums',
  'musical-note',
  'mic',
  'radio',
  'disc',
  'videocam',
  'desktop',
  'tablet-portrait',
  'dice',
  'bonfire',
  'glasses',
  'people',
  'person',
  'chatbubble',
  'call',
  'mail',
  'megaphone',
  'headset',
  'bed',
  'medkit',
  'bandage',
  'thermometer',
  'shield',
];

interface IconPickerProps {
  selectedIcon: string | null;
  onSelectIcon: (icon: string) => void;
  compact?: boolean; // Compact mode for inline display
}

interface IconButtonProps {
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}

function IconButton({ icon, isSelected, onPress }: IconButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.9, {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[
        styles.iconButton,
        isSelected && styles.iconButtonSelected,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Ionicons
        name={icon as any}
        size={28}
        color={isSelected ? Colors.black : Colors.text.primary}
      />
    </AnimatedTouchable>
  );
}

export default function IconPicker({ selectedIcon, onSelectIcon, compact = false }: IconPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleIconSelect = (icon: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectIcon(icon);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleOpenPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  const handleClosePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(false);
    setSearchQuery('');
  };

  const filteredIcons = searchQuery
    ? ICON_OPTIONS.filter(icon =>
        icon.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ICON_OPTIONS;

  return (
    <>
      {/* Icon Selector Button */}
      {compact ? (
        // Compact version - with label and matching input height
        <View style={styles.compactContainer}>
          <Text style={styles.compactLabel}>Icon</Text>
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleOpenPicker}
            activeOpacity={0.7}
          >
            <View style={styles.compactIconPreview}>
              {selectedIcon ? (
                <Ionicons name={selectedIcon as any} size={28} color={Colors.black} />
              ) : (
                <Ionicons name="add" size={24} color={Colors.gray} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        // Full version - with labels
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={handleOpenPicker}
          activeOpacity={0.7}
        >
          <View style={styles.selectorContent}>
            <View style={styles.iconPreview}>
              {selectedIcon ? (
                <Ionicons name={selectedIcon as any} size={32} color={Colors.black} />
              ) : (
                <Ionicons name="add" size={32} color={Colors.gray} />
              )}
            </View>
            <View style={styles.selectorTextContainer}>
              <Text style={styles.selectorLabel}>List Icon (Optional)</Text>
              <Text style={styles.selectorHint}>
                {selectedIcon ? 'Tap to change' : 'Choose an icon for your list'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.lightGray} />
        </TouchableOpacity>
      )}

      {/* Icon Picker Modal */}
  <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClosePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePicker}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <TouchableOpacity onPress={handleClosePicker} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.lightGray} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search icons..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.lightGray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Icon Grid */}
          <ScrollView contentContainerStyle={styles.iconGrid}>
            {filteredIcons.map((icon) => (
              <IconButton
                key={icon}
                icon={icon}
                isSelected={selectedIcon === icon}
                onPress={() => handleIconSelect(icon)}
              />
            ))}
          </ScrollView>

          {filteredIcons.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyText}>No icons found</Text>
            </View>
          )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    marginBottom: Spacing.form.fieldGap, // Same as TextInput container
  },
  compactLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black, // Match TextInput label color
    marginBottom: Spacing.form.labelGap, // Same as TextInput label
    marginLeft: 6, // Slight offset to align with input field text
  },
  compactButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconPreview: {
    width: 70,
    height: 50, // Match TextInput height exactly
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginBottom: Spacing.gap.medium,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.gap.medium,
  },
  iconPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  selectorHint: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding.horizontal,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.large,
    paddingBottom: Spacing.gap.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerSpacer: {
    width: 40,
  },
  modalTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingVertical: Spacing.gap.medium,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.gap.medium,
    height: 50,
    gap: Spacing.gap.small,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.screenPadding.horizontal,
    gap: Spacing.gap.medium,
    justifyContent: 'center',
  },
  iconButton: {
    width: 70,
    height: 70,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryActive,
    borderWidth: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.gap.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginTop: Spacing.gap.medium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
