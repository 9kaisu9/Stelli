import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius, Dimensions } from '@/constants/styleGuide';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserLists } from '@/lib/hooks/useUserLists';
import { useImportedLists } from '@/lib/hooks/useImportedLists';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import { trackScreenView, trackEvent } from '@/lib/posthog';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { data: ownedLists, isLoading: ownedListsLoading } = useUserLists(user?.id);
  const { data: importedLists, isLoading: importedListsLoading } = useImportedLists();
  const [displayNameInput, setDisplayNameInput] = useState(profile?.display_name || '');
  const [editingName, setEditingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  useEffect(() => {
    setDisplayNameInput(profile?.display_name || '');
  }, [profile?.display_name]);

  useEffect(() => {
    trackScreenView('Profile Screen');
    // Request permissions upfront for instant picker access
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const ownedCount = ownedLists?.length || 0;
  const importedCount = importedLists?.length || 0;
  const totalEntries =
    (ownedLists || []).reduce((sum, list) => sum + (list.entry_count || 0), 0) +
    (importedLists || []).reduce((sum, list) => sum + (list.entry_count || 0), 0);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Your profile';
  const initials = (profile?.display_name || user?.email || 'S')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const email = user?.email || 'Unknown email';
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—';
  const subscriptionTier = profile?.subscription_tier || 'free';
  const subscriptionLabel = subscriptionTier === 'premium' ? 'Premium' : 'Free';

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleManageSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('Manage Subscription Clicked');
    router.push('/subscription' as any);
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = newName.trim();
      if (!trimmed) throw new Error('Display name cannot be empty');

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', user.id);

      if (error) throw error;
      return trimmed;
    },
    onSuccess: async (newName) => {
      await refreshProfile();
      trackEvent('Display Name Updated', { newName });
      setEditingName(false);
      Alert.alert('Saved', 'Your display name has been updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Could not update display name.');
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      if (!user) throw new Error('Not authenticated');

      // Read the image file as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Generate unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return avatarUrl;
    },
    onSuccess: async () => {
      await refreshProfile();
      trackEvent('Avatar Updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your profile picture has been updated!');
    },
    onError: (error: any) => {
      console.error('Avatar upload error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Could not update profile picture.');
    },
  });

  const handleSaveName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNameMutation.mutate(displayNameInput);
  };

  const handleCancelNameEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDisplayNameInput(profile?.display_name || '');
    setEditingName(false);
  };

  const handleRefreshProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshProfile();
    trackEvent('Profile Refreshed');
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              trackEvent('Signed Out');
              router.replace('/' as any);
            } catch (error) {
              Alert.alert('Error', 'Unable to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleChangeAvatar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPickingImage(true);
    await pickImageFromLibrary();
    setIsPickingImage(false);
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        trackEvent('Avatar Photo Taken');
        updateAvatarMutation.mutate(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        trackEvent('Avatar Photo Selected');
        updateAvatarMutation.mutate(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  // Avatar picker options
  const avatarPickerOptions: ActionSheetOption[] = [
    {
      label: 'Take Photo',
      icon: 'camera-outline',
      onPress: pickImageFromCamera,
    },
    {
      label: 'Choose from Library',
      icon: 'images-outline',
      onPress: pickImageFromLibrary,
    },
  ];

  return (
    <View style={CommonStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangeAvatar}
            activeOpacity={0.8}
            disabled={isPickingImage || updateAvatarMutation.isPending}
          >
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              {(isPickingImage || updateAvatarMutation.isPending) && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                placeholder="Display name"
                value={displayNameInput}
                onChangeText={setDisplayNameInput}
                autoCapitalize="words"
                autoCorrect
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                style={styles.inlineNameInput}
              />
              <View style={styles.nameEditActions}>
                <TouchableOpacity
                  onPress={handleSaveName}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  disabled={updateNameMutation.isPending}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.black} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelNameEdit}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  disabled={updateNameMutation.isPending}
                >
                  <Ionicons name="close" size={18} color={Colors.black} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditingName(true);
                }}
                style={styles.editNameButton}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={Colors.black} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.email}>{email}</Text>
          <View style={styles.subscriptionBadge}>
            <Ionicons
              name={subscriptionTier === 'premium' ? 'star' : 'leaf-outline'}
              size={16}
              color={Colors.black}
            />
            <Text style={styles.subscriptionText}>{subscriptionLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {ownedListsLoading ? '—' : ownedCount}
              </Text>
              <Text style={styles.statLabel}>Owned Lists</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {importedListsLoading ? '—' : importedCount}
              </Text>
              <Text style={styles.statLabel}>Imported</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {ownedListsLoading || importedListsLoading ? '—' : totalEntries}
              </Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id || '—'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{joinedDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subscription</Text>
              <Text style={styles.infoValue}>{subscriptionLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Manage Subscription"
            variant="primary"
            onPress={handleManageSubscription}
            fullWidth
          />
          <Button
            label={ownedListsLoading || importedListsLoading ? 'Refreshing...' : 'Refresh Profile'}
            variant="secondary"
            onPress={handleRefreshProfile}
            fullWidth
            disabled={ownedListsLoading || importedListsLoading}
          />
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <CustomActionSheet
        visible={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        title="Change Profile Picture"
        options={avatarPickerOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 48,
    gap: Spacing.gap.section,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  topSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  name: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  editNameButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
    width: '100%',
    justifyContent: 'center',
  },
  inlineNameInput: {
    flex: 1,
    minWidth: 0,
  },
  nameEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.gap.medium,
    paddingVertical: Spacing.gap.xs,
    marginTop: Spacing.gap.small,
  },
  subscriptionText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  section: {
    gap: Spacing.gap.medium,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.gap.medium,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.gap.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  statLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    gap: Spacing.gap.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  infoLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  actions: {
    gap: Spacing.gap.medium,
  },
  signOutButton: {
    height: Dimensions.button.standard,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.small,
  },
  signOutText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.error,
  },
});
