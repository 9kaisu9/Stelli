import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import Button from './Button';
import CustomActionSheet, { ActionSheetOption } from './CustomActionSheet';

interface ShareListModalProps {
  visible: boolean;
  listId: string;
  listName: string;
  onClose: () => void;
  onShare: (permissionType: 'view' | 'edit') => Promise<string>; // Returns share URL
}

export default function ShareListModal({
  visible,
  listId,
  listName,
  onClose,
  onShare,
}: ShareListModalProps) {
  const [permissionType, setPermissionType] = useState<'view' | 'edit'>('view');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showCopiedSheet, setShowCopiedSheet] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareToken, setShareToken] = useState('');

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const shareUrl = await onShare(permissionType);

      // Extract the token from the URL (format: stelli://shared/TOKEN)
      const token = shareUrl.split('/').pop() || '';
      setGeneratedUrl(token);

      // Copy full URL to clipboard
      await Clipboard.setStringAsync(shareUrl);

      // Show success message with the token for testing
      setShareToken(token);
      setShowSuccessSheet(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error generating share link:', error);
      setErrorMessage(error.message || 'Failed to generate share link');
      setShowErrorSheet(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Action Sheet Options
  const successOptions: ActionSheetOption[] = [
    {
      label: 'OK',
      icon: 'checkmark-circle-outline',
      onPress: () => {},
    },
  ];

  const copiedOptions: ActionSheetOption[] = [
    {
      label: 'OK',
      icon: 'checkmark-circle-outline',
      onPress: () => {},
    },
  ];

  const errorOptions: ActionSheetOption[] = [
    {
      label: 'OK',
      icon: 'close-circle-outline',
      onPress: () => {},
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={handleClose}
      >
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Share List</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.listName}>{listName}</Text>
            <Text style={styles.description}>
              Generate a shareable link for this list. Choose the permission level:
            </Text>

            {/* Permission Options */}
            <View style={styles.permissionOptions}>
              <TouchableOpacity
                style={[
                  styles.permissionOption,
                  permissionType === 'view' && styles.permissionOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPermissionType('view');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.permissionIconContainer}>
                  <Ionicons
                    name="eye-outline"
                    size={32}
                    color={permissionType === 'view' ? Colors.black : Colors.gray}
                  />
                </View>
                <Text
                  style={[
                    styles.permissionTitle,
                    permissionType === 'view' && styles.permissionTitleActive,
                  ]}
                >
                  View Only
                </Text>
                <Text style={styles.permissionDescription}>
                  Can view entries but not edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.permissionOption,
                  permissionType === 'edit' && styles.permissionOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPermissionType('edit');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.permissionIconContainer}>
                  <Ionicons
                    name="create-outline"
                    size={32}
                    color={permissionType === 'edit' ? Colors.black : Colors.gray}
                  />
                </View>
                <Text
                  style={[
                    styles.permissionTitle,
                    permissionType === 'edit' && styles.permissionTitleActive,
                  ]}
                >
                  Can Edit
                </Text>
                <Text style={styles.permissionDescription}>
                  Can view and add entries
                </Text>
              </TouchableOpacity>
            </View>

            {/* Generated Token Display (for testing) */}
            {generatedUrl && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Share Token (for testing):</Text>
                <TouchableOpacity
                  style={styles.tokenContainer}
                  onPress={async () => {
                    await Clipboard.setStringAsync(generatedUrl);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCopiedSheet(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tokenText}>{generatedUrl}</Text>
                  <Ionicons name="copy-outline" size={20} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.gray} />
              <Text style={styles.infoText}>
                The link will be copied to your clipboard and can be shared with anyone.
              </Text>
            </View>

            {/* Generate Button */}
            <Button
              label={isGenerating ? 'Generating...' : 'Generate & Copy Link'}
              variant="primary"
              onPress={handleGenerateLink}
              disabled={isGenerating}
              fullWidth
            />
          </View>
        </Pressable>
      </Pressable>

      {/* Success Message */}
      <CustomActionSheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        title={`Link Copied!\n\nShare link has been copied to your clipboard.\n\nFor testing in Expo Go, use the token below:\n${shareToken}`}
        options={successOptions}
      />

      {/* Copied Message */}
      <CustomActionSheet
        visible={showCopiedSheet}
        onClose={() => setShowCopiedSheet(false)}
        title="Token copied to clipboard"
        options={copiedOptions}
      />

      {/* Error Message */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Error'}
        options={errorOptions}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding.horizontal,
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
    position: 'relative',
  },
  headerSpacer: {
    width: 40,
    position: 'absolute',
    left: Spacing.padding.card,
  },
  title: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
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
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  content: {
    padding: Spacing.padding.card,
    gap: Spacing.gap.large,
  },
  listName: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionOptions: {
    flexDirection: 'row',
    gap: Spacing.gap.medium,
  },
  permissionOption: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  permissionOptionActive: {
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
    borderWidth: 2,
  },
  permissionIconContainer: {
    marginBottom: Spacing.gap.xs,
  },
  permissionTitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
    textAlign: 'center',
  },
  permissionTitleActive: {
    color: Colors.black,
  },
  permissionDescription: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  tokenBox: {
    gap: Spacing.gap.small,
  },
  tokenLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.gap.medium,
    gap: Spacing.gap.small,
  },
  tokenText: {
    flex: 1,
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.gap.medium,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    lineHeight: 18,
  },
});
