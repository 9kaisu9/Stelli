import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, Pressable, TextInput } from 'react-native';
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
import { useImportedLists } from '@/lib/hooks/useImportedLists';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
  const { data: userLists, isLoading: userListsLoading, error: userListsError } = useUserLists(user?.id);
  const { data: importedLists, isLoading: importedListsLoading, error: importedListsError } = useImportedLists();
  const { data: recentEntries, isLoading: entriesLoading } = useRecentEntries(user?.id, 3);
  const { deleteListMutation } = useListActions();

  // Unsubscribe mutation for imported lists
  const unsubscribeMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('list_subscriptions')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribedLists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const [activeTab, setActiveTab] = useState<'Mine' | 'Imported'>('Mine');
  const [refreshing, setRefreshing] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedList, setSelectedList] = useState<{ id: string; name: string; isImported?: boolean; permission_type?: 'view' | 'edit' } | null>(null);
  const [shareToken, setShareToken] = useState('');
  const [showListPickerForEntry, setShowListPickerForEntry] = useState(false);

  // Get the appropriate list based on active tab
  const lists = activeTab === 'Mine' ? userLists : importedLists;
  const listsLoading = activeTab === 'Mine' ? userListsLoading : importedListsLoading;
  const listsError = activeTab === 'Mine' ? userListsError : importedListsError;

  useEffect(() => {
    trackScreenView('Home Screen');
  }, []);

  // Log errors for debugging
  useEffect(() => {
    if (listsError) {
      console.error('useUserLists error:', listsError);
    }
  }, [listsError]);

  // Check if user can create more lists (premium = unlimited, free = max 1)
  const canCreateList = profile?.subscription_tier === 'premium' || (lists?.length || 0) < 1;

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
    router.push(`/(authenticated)/list/${listId}` as any);
  };

  const openActionMenu = (listId: string, listName: string) => {
    // Find the list to check if it's imported
    const list = lists?.find(l => l.id === listId);
    const isImported = activeTab === 'Imported' || !!list?.permission_type;

    setSelectedList({
      id: listId,
      name: listName,
      isImported,
      permission_type: list?.permission_type
    });
    setShowActionMenu(true);
  };

  const handleListLongPress = (listId: string, listName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openActionMenu(listId, listName);
  };

  const handleImportToken = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const trimmedToken = shareToken.trim();

    if (!trimmedToken) {
      Alert.alert(
        'Enter share token',
        'Paste the share token from a list owner to import it.'
      );
      return;
    }

    setShareToken('');
    router.push(`/shared/${trimmedToken}` as any);
  };

  const handleUnsubscribe = (listId: string, listName: string) => {
    Alert.alert(
      'Unsubscribe from List',
      `Are you sure you want to unsubscribe from "${listName}"? You can always re-subscribe later using the share link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: () => {
            unsubscribeMutation.mutate(listId, {
              onSuccess: () => {
                Alert.alert('Success', 'Unsubscribed from list successfully');
              },
              onError: (error: any) => {
                Alert.alert('Error', error.message || 'Failed to unsubscribe from list');
              },
            });
          },
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
      queryClient.invalidateQueries({ queryKey: ['subscribedLists', user?.id] }),
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
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ['userLists', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['subscribedLists', user?.id] });
          }}
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

        {/* Import shared list by token */}
        <View style={styles.importContainer}>
          <TextInput
            style={styles.importInput}
            placeholder="Paste share token"
            placeholderTextColor={Colors.gray}
            value={shareToken}
            onChangeText={setShareToken}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleImportToken}
          />
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportToken}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={18} color={Colors.black} />
            <Text style={styles.importButtonText}>Import List</Text>
          </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>
              {activeTab === 'Mine' ? 'No lists yet' : 'No imported lists'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'Mine'
                ? 'Create your first list to get started tracking your favorite restaurants, movies, books, or anything else!'
                : 'When you import lists shared by others, they will appear here.'}
            </Text>
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowListPickerForEntry(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={32} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {/* List Action Menu */}
      <Modal
        visible={showActionMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionMenu(false)}
      >
        <Pressable
          style={styles.actionMenuOverlay}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowActionMenu(false);
          }}
        >
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>{selectedList?.name || 'List Options'}</Text>
              <TouchableOpacity
                style={styles.actionMenuCloseButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowActionMenu(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionMenuDivider} />

            <View style={styles.actionMenuButtonsContainer}>
              {/* Show different options based on whether it's an imported list */}
              {selectedList?.isImported ? (
                // Imported list: Show unsubscribe option
                <TouchableOpacity
                  style={styles.actionMenuButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowActionMenu(false);
                    if (selectedList) {
                      handleUnsubscribe(selectedList.id, selectedList.name);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionMenuButtonContent}>
                    <Ionicons name="log-out-outline" size={24} color={Colors.error} />
                    <Text style={[styles.actionMenuButtonText, styles.actionMenuButtonTextDanger]}>Unsubscribe</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                // Own list: Show edit, share, and delete options
                <>
                  <TouchableOpacity
                    style={styles.actionMenuButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowActionMenu(false);
                      if (selectedList) {
                        trackEvent('Edit List Initiated', { listId: selectedList.id });
                        router.push(`/edit-list/${selectedList.id}` as any);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionMenuButtonContent}>
                      <Ionicons name="create-outline" size={24} color={Colors.black} />
                      <Text style={styles.actionMenuButtonText}>Edit List</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionMenuButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowActionMenu(false);
                      if (selectedList) {
                        trackEvent('Share List Initiated', { listId: selectedList.id });
                        Alert.alert('Coming Soon', 'Sharing feature will be available soon!');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionMenuButtonContent}>
                      <Ionicons name="share-outline" size={24} color={Colors.black} />
                      <Text style={styles.actionMenuButtonText}>Share List</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionMenuButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowActionMenu(false);
                      if (selectedList) {
                        handleDeleteConfirm(selectedList.id, selectedList.name);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionMenuButtonContent}>
                      <Ionicons name="trash-outline" size={24} color={Colors.error} />
                      <Text style={[styles.actionMenuButtonText, styles.actionMenuButtonTextDanger]}>Delete List</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* List Picker for New Entry */}
      <Modal
        visible={showListPickerForEntry}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowListPickerForEntry(false)}
      >
        <Pressable
          style={styles.actionMenuOverlay}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowListPickerForEntry(false);
          }}
        >
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>Add Entry To...</Text>
              <TouchableOpacity
                style={styles.actionMenuCloseButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowListPickerForEntry(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionMenuDivider} />

            <ScrollView style={styles.listPickerScroll} contentContainerStyle={styles.listPickerContent}>
              {/* Show all lists (both owned and imported with edit permission) */}
              {userLists && userLists.length > 0 && (
                <>
                  <Text style={styles.listPickerSectionTitle}>My Lists</Text>
                  <View style={styles.listPickerListsContainer}>
                    {userLists.map((list) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowListPickerForEntry(false);
                          router.push(`/add-entry/${list.id}` as any);
                        }}
                        onLongPress={() => {}}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Show imported lists with edit permission */}
              {importedLists && importedLists.filter(l => l.permission_type === 'edit').length > 0 && (
                <>
                  <Text style={styles.listPickerSectionTitle}>Imported Lists (Can Edit)</Text>
                  <View style={styles.listPickerListsContainer}>
                    {importedLists.filter(l => l.permission_type === 'edit').map((list) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowListPickerForEntry(false);
                          router.push(`/add-entry/${list.id}` as any);
                        }}
                        onLongPress={() => {}}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* No lists available */}
              {(!userLists || userLists.length === 0) &&
               (!importedLists || importedLists.filter(l => l.permission_type === 'edit').length === 0) && (
                <View style={styles.noListsContainer}>
                  <Ionicons name="list-outline" size={48} color={Colors.gray} />
                  <Text style={styles.noListsText}>No lists available</Text>
                  <Text style={styles.noListsSubtext}>Create a list first to add entries</Text>
                  <TouchableOpacity
                    style={styles.createListButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowListPickerForEntry(false);
                      handleCreateList();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.createListButtonText}>Create List</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  importContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
    marginBottom: Spacing.gap.medium,
  },
  importInput: {
    flex: 1,
    height: Dimensions.button.standard,
    paddingHorizontal: Spacing.gap.medium,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.xs,
    paddingHorizontal: Spacing.gap.medium,
    height: Dimensions.button.standard,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  importButtonText: {
    fontSize: Typography.fontSize.small,
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
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding.horizontal,
  },
  actionMenuContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.gap.large,
    paddingHorizontal: Spacing.padding.card,
    backgroundColor: Colors.background,
  },
  actionMenuTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
    textAlign: 'center',
  },
  actionMenuCloseButton: {
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
  actionMenuDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  actionMenuButtonsContainer: {
    padding: Spacing.padding.card,
    gap: Spacing.gap.medium,
  },
  actionMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Dimensions.button.standard,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  actionMenuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.medium,
    width: 140,
    justifyContent: 'flex-start',
  },
  actionMenuButtonText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  actionMenuButtonTextDanger: {
    color: Colors.error,
  },
  listPickerScroll: {
    maxHeight: 400,
  },
  listPickerContent: {
    padding: Spacing.padding.card,
  },
  listPickerSectionTitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
    marginTop: Spacing.gap.medium,
    marginBottom: Spacing.gap.small,
  },
  listPickerListsContainer: {
    gap: Spacing.gap.small,
  },
  noListsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.gap.xl,
  },
  noListsText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginTop: Spacing.gap.medium,
    marginBottom: Spacing.gap.small,
  },
  noListsSubtext: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.gap.large,
  },
  createListButton: {
    paddingHorizontal: Spacing.gap.large,
    paddingVertical: Spacing.gap.medium,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  createListButtonText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
});
