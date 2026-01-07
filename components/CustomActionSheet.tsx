import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Dimensions } from '@/constants/styleGuide';

export interface ActionSheetOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface CustomActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

/**
 * CustomActionSheet Component
 * A styled modal action sheet that matches the app's design system
 * Replaces native Alert.alert and ActionSheetIOS for consistent styling
 */
export default function CustomActionSheet({
  visible,
  onClose,
  title,
  options,
}: CustomActionSheetProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOptionPress = (option: ActionSheetOption) => {
    console.log('🎯 CustomActionSheet: Option pressed:', option.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Execute the option's callback immediately
    console.log('🎯 CustomActionSheet: Executing option callback for:', option.label);
    option.onPress();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.container}>
          {/* Header */}
          {title && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={Colors.black} />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={option.destructive ? Colors.error : Colors.black}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      option.destructive && styles.optionTextDanger,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding.horizontal,
  },
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.gap.large,
    paddingHorizontal: Spacing.padding.card,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.padding.card,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  optionsContainer: {
    padding: Spacing.padding.card,
    gap: Spacing.gap.medium,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Dimensions.button.standard,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.medium,
    width: 140,
    justifyContent: 'flex-start',
  },
  optionText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
    color: Colors.black,
  },
  optionTextDanger: {
    color: Colors.error,
  },
});

