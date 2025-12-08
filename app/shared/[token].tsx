import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSharedList } from '@/lib/hooks/useShareList';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import EntryCard from '@/components/EntryCard';
import { trackScreenView, trackEvent } from '@/lib/posthog';

export default function SharedListScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: sharedListData, isLoading, error } = useSharedList(token);

  // Fetch entries for the shared list (preview)
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['sharedListEntries', sharedListData?.lists?.id],
    queryFn: async () => {
      if (!sharedListData?.lists?.id) return [];

      console.log('📋 Fetching entries for list:', sharedListData.lists.id);

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('list_id', sharedListData.lists.id)
        .order('created_at', { ascending: false }); // Show ALL entries

      if (error) {
        console.error('❌ Error fetching entries:', error);
        throw error;
      }

      console.log('📋 Entries fetched:', data?.length || 0, 'entries');
      console.log('📋 Entries data:', data);
      return data || [];
    },
    enabled: !!sharedListData?.lists?.id,
  });

  useEffect(() => {
    trackScreenView('Shared List View', { shareToken: token });
  }, [token]);

  const subscribeToListMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to subscribe to this list');
      if (!sharedListData) throw new Error('Shared list not found');

      const listId = sharedListData.lists.id;
      const permissionType = sharedListData.permission_type;

      // Create a subscription to the list
      const { error: subscriptionError } = await supabase
        .from('list_subscriptions')
        .insert({
          list_id: listId,
          user_id: user.id,
          permission_type: permissionType,
        });

      if (subscriptionError) {
        // Check if already subscribed
        if (subscriptionError.code === '23505') {
          throw new Error('You are already subscribed to this list');
        }
        throw subscriptionError;
      }

      return { listId, permissionType };
    },
    onSuccess: ({ listId, permissionType }) => {
      trackEvent('List Subscribed', {
        listId,
        permissionType,
      });
      queryClient.invalidateQueries({ queryKey: ['subscribedLists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Subscribed!',
        'This list is now in your "Imported" tab. You can view all entries anytime.',
        [
          {
            text: 'View List',
            onPress: () => router.replace(`/list/${listId}` as any),
          },
          {
            text: 'Go to Home',
            onPress: () => router.replace('/home' as any),
          },
        ]
      );
    },
    onError: (error: any) => {
      console.error('Error subscribing to list:', error);
      Alert.alert('Error', error.message || 'Failed to subscribe to list');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isViewOnly = sharedListData?.permission_type === 'view';
    const message = isViewOnly
      ? 'This list will be bookmarked in your "Imported" tab for quick access. You can view all entries, but cannot edit or add to this list.'
      : 'This list will be bookmarked in your "Imported" tab for quick access. You can view and edit all entries.';

    Alert.alert(
      'Subscribe to List',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => subscribeToListMutation.mutate(),
        },
      ]
    );
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/');
  };

  const handleEntryPress = (entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('Entry Opened from Import Preview', { entryId, listId: sharedListData?.lists?.id });
    router.push(`/entry/${entryId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading shared list...</Text>
      </View>
    );
  }

  if (error || !sharedListData || !sharedListData.lists) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.gray} />
        <Text style={styles.errorTitle}>List Not Found</Text>
        <Text style={styles.errorText}>
          This share link is invalid or has expired.
        </Text>
        <Button label="Go Home" variant="secondary" onPress={() => router.push('/home')} />
      </View>
    );
  }

  const list = sharedListData.lists;
  const permissionType = sharedListData.permission_type;
  const isViewOnly = permissionType === 'view';
  const sharedBy =
    sharedListData.profiles?.display_name || 'Someone';

  console.log('🎨 Rendering shared list screen');
  console.log('🎨 entriesLoading:', entriesLoading);
  console.log('🎨 entries:', entries);
  console.log('🎨 entries?.length:', entries?.length);
  console.log('🎨 Should render entries?', !entriesLoading && entries && entries.length > 0);

  return (
    <View style={CommonStyles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        <View style={styles.shareIndicator}>
          <Ionicons name="link-outline" size={16} color={Colors.gray} />
          <Text style={styles.shareIndicatorText}>Shared by {sharedBy}</Text>
        </View>
        </View>

        {/* Permission Badge */}
        <View style={styles.permissionBadge}>
          <Ionicons
            name={isViewOnly ? 'eye-outline' : 'create-outline'}
            size={20}
            color={Colors.black}
          />
          <Text style={styles.permissionText}>
            {isViewOnly ? 'View Only' : 'Can Edit'}
          </Text>
        </View>

        {/* List Info */}
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{list.name}</Text>
          <Text style={styles.ownerText}>by {sharedBy}</Text>
          {list.description && (
            <Text style={styles.listDescription}>{list.description}</Text>
          )}
        </View>

        {/* All Entries */}
        {!entriesLoading && entries && entries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>{entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}</Text>
            <View style={styles.entriesContainer}>
              {entries.map((entry, index) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  list={list}
                  onPress={() => handleEntryPress(entry.id)}
                  showDivider={index < entries.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.gray} />
          <Text style={styles.infoText}>
            {permissionType === 'view'
              ? 'Subscribe to bookmark this list in your "Imported" tab for quick access. You can view all entries, but cannot edit or add to this list.'
              : 'Subscribe to bookmark this list in your "Imported" tab for quick access. You can view and edit all entries.'}
          </Text>
        </View>

        {/* Actions */}
        {user ? (
          <View style={styles.actions}>
            <Button
              label={subscribeToListMutation.isPending ? 'Subscribing...' : 'Subscribe to List'}
              variant="primary"
              onPress={handleSubscribe}
              disabled={subscribeToListMutation.isPending}
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={styles.signInPrompt}>Sign in to subscribe to this list</Text>
            <Button
              label="Sign In"
              variant="primary"
              onPress={handleSignIn}
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.gap.medium,
  },
  loadingText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.screenPadding.horizontal,
    gap: Spacing.gap.large,
  },
  errorTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.gap.large,
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
  shareIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.gap.medium,
    paddingVertical: Spacing.gap.xs,
  },
  shareIndicatorText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.gap.large,
    paddingVertical: Spacing.gap.small,
    alignSelf: 'flex-start',
    marginBottom: Spacing.gap.large,
  },
  permissionText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  listInfo: {
    marginBottom: Spacing.gap.large,
  },
  listName: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  listDescription: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    lineHeight: 24,
  },
  ownerText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.xs,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginBottom: Spacing.gap.large,
    gap: Spacing.gap.medium,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  detailValue: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  entriesSection: {
    marginBottom: Spacing.gap.large,
  },
  entriesContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  entryDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  moreEntriesHint: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.gap.small,
  },
  fieldsSection: {
    marginBottom: Spacing.gap.large,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.medium,
  },
  fieldsCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.padding.card,
    paddingVertical: Spacing.gap.medium,
  },
  fieldName: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    flex: 1,
  },
  fieldMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  fieldType: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  requiredBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.gap.small,
    paddingVertical: 2,
  },
  requiredText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.white,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.border,
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
    marginBottom: Spacing.gap.large,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    lineHeight: 18,
  },
  actions: {
    gap: Spacing.gap.medium,
  },
  signInPrompt: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
});
