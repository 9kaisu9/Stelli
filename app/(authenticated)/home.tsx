import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserLists } from '@/lib/hooks/useUserLists';
import { useRecentEntries } from '@/lib/hooks/useRecentEntries';
import { useListActions } from '@/lib/hooks/useListActions';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius, Dimensions } from '@/constants/styleGuide';
import Button from '@/components/Button';
import ListCard from '@/components/ListCard';
import RecentEntryCard from '@/components/RecentEntryCard';
import TabSwitcher from '@/components/TabSwitcher';
import { trackScreenView, trackEvent } from '@/lib/posthog';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: lists, isLoading: listsLoading, error: listsError } = useUserLists(user?.id);
  const { data: recentEntries, isLoading: entriesLoading } = useRecentEntries(user?.id, 3);
  const { deleteListMutation } = useListActions();
  const [activeTab, setActiveTab] = useState<'Mine' | 'Imported'>('Mine');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    trackScreenView('Home Screen');
  }, []);

  // Log errors for debugging
  useEffect(() => {
    if (listsError) {
      console.error('useUserLists error:', listsError);
    }
  }, [listsError]);

  // TEMP: Allow unlimited lists for testing (remove this line later)
  const canCreateList = true; // profile?.subscription_tier === 'premium' || (lists?.length || 0) < 1;

  const isLoading = listsLoading || entriesLoading;
  const error = listsError;

  const handleCreateList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!canCreateList) {
      trackEvent('Free Tier Limit Reached', { feature: 'list_creation_button' });
      Alert.alert(
        'Upgrade to Premium',
        'Free tier users can only create 1 list. Upgrade to Premium for unlimited lists!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription' as any) },
        ]
      );
      return;
    }

    router.push('/create-list' as any);
  };

  // New List Button Component with animations
  const NewListButton = () => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withTiming(0.95, {
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
        onPress={handleCreateList}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.newListButton, animatedStyle]}
      >
        <Text style={styles.newListButtonText}>+ New List</Text>
      </AnimatedTouchable>
    );
  };

  const handleListPress = (listId: string) => {
    router.push(`/list/${listId}` as any);
  };

  const handleListLongPress = (listId: string, listName: string) => {
    Alert.alert(
      listName,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () => {
            trackEvent('Edit List Initiated', { listId });
            router.push(`/edit-list/${listId}` as any);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteConfirm(listId, listName),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDeleteConfirm = (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"? This will also delete all entries in this list. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteListMutation.mutate(listId, {
              onSuccess: () => {
                Alert.alert('Success', 'List deleted successfully');
              },
              onError: (error: any) => {
                Alert.alert('Error', error.message || 'Failed to delete list');
              },
            });
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userLists', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['recentEntries', user?.id] }),
    ]);
    setRefreshing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your lists...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Colors.gray} />
        <Text style={styles.errorText}>Failed to load lists</Text>
        <Button
          label="Try Again"
          variant="primary"
          onPress={() => window.location.reload()}
        />
      </View>
    );
  }

  // Main view
  return (
    <View style={CommonStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/profile' as any);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={32} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Recent Entries Section */}
        {recentEntries && recentEntries.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/all-entries' as any);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Recent Entries</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.black} style={styles.headerArrow} />
            </TouchableOpacity>
            <View style={styles.recentEntriesContainer}>
              {recentEntries.map((entry, index) => (
                <RecentEntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}` as any)}
                  showDivider={index < recentEntries.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Lists Section Header */}
        <View style={styles.listsHeader}>
          <Text style={styles.sectionTitle}>Lists</Text>
          <NewListButton />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcherContainer}>
          <TabSwitcher
            tabs={['Mine', 'Imported']}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as 'Mine' | 'Imported')}
          />
        </View>

        {/* Empty state */}
        {(!lists || lists.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={80} color={Colors.gray} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first list to get started tracking your favorite restaurants, movies, books, or anything else!
            </Text>
            <Button
              label="Create Your First List"
              variant="primary"
              onPress={handleCreateList}
              fullWidth
            />
          </View>
        )}

        {/* List Cards */}
        {lists && lists.length > 0 && (
          <View style={styles.listsContainer}>
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onPress={() => handleListPress(list.id)}
                onLongPress={() => handleListLongPress(list.id, list.name)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateList}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={32} color={Colors.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 100, // Extra padding for FAB
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding.horizontal,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: Spacing.gap.large,
  },
  profileButton: {
    padding: Spacing.gap.small,
  },
  section: {
    marginBottom: Spacing.gap.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.gap.medium,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  headerArrow: {
    marginLeft: Spacing.gap.small,
  },
  recentEntriesContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  listsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.gap.medium,
  },
  newListButton: {
    paddingHorizontal: Spacing.gap.medium,
    paddingVertical: Spacing.gap.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newListButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  tabSwitcherContainer: {
    marginBottom: Spacing.gap.large,
  },
  listsContainer: {
    gap: Spacing.gap.small,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.gap.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.gap.large,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.gap.xl,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginTop: Spacing.gap.medium,
  },
  errorText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginVertical: Spacing.gap.large,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: Dimensions.icon.add,
    height: Dimensions.icon.add,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
