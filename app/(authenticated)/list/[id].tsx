import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useListDetail, useListEntries } from '@/lib/hooks/useListEntries';
import { useListActions } from '@/lib/hooks/useListActions';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius, Dimensions } from '@/constants/styleGuide';
import Card from '@/components/Card';
import EntryCard from '@/components/EntryCard';
import { trackScreenView, trackEvent } from '@/lib/posthog';

type SortOption = 'date' | 'rating' | 'name';
type FilterOption = 'all' | 'highRated' | 'recent';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showSortFilter, setShowSortFilter] = useState(false);

  const { data: list, isLoading: listLoading, error: listError } = useListDetail(id);
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useListEntries(id);
  const { deleteListMutation } = useListActions();

  useEffect(() => {
    trackScreenView('List Detail Screen', { listId: id });
  }, [id]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleAddEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('Add Entry Initiated', { listId: id });
    router.push(`/add-entry/${id}` as any);
  };

  const handleEntryPress = (entryId: string) => {
    trackEvent('Entry Opened', { entryId, listId: id });
    router.push(`/entry/${entryId}` as any);
  };

  const handleEntryLongPress = (entryId: string, entryName: string) => {
    Alert.alert(
      entryName,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () => {
            trackEvent('Edit Entry Initiated', { entryId });
            router.push(`/entry/${entryId}` as any);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteEntry(entryId, entryName),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDeleteEntry = (entryId: string, entryName: string) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entryName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement delete entry mutation
            trackEvent('Entry Deleted', { entryId, listId: id });
            Alert.alert('Success', 'Entry deleted successfully');
          },
        },
      ]
    );
  };

  const handleEditList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('Edit List Initiated', { listId: id });
    router.push(`/edit-list/${id}` as any);
  };

  const handleDeleteList = () => {
    if (!list) return;

    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This will also delete all ${entries?.length || 0} entries. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteListMutation.mutate(id, {
              onSuccess: () => {
                trackEvent('List Deleted', { listId: id });
                Alert.alert('Success', 'List deleted successfully', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
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

  const handleMoreOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      list?.name || 'List Options',
      'Choose an action',
      [
        {
          text: 'Edit List',
          onPress: handleEditList,
        },
        {
          text: 'Share List',
          onPress: () => {
            trackEvent('Share List Initiated', { listId: id });
            Alert.alert('Coming Soon', 'Sharing feature will be available soon!');
          },
        },
        {
          text: 'Delete List',
          style: 'destructive',
          onPress: handleDeleteList,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSortFilterToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortFilter(!showSortFilter);
  };

  const handleSortChange = (option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
    // TODO: Implement sorting logic
  };

  const handleFilterChange = (option: FilterOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterBy(option);
    // TODO: Implement filtering logic
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['listDetail', id] }),
      queryClient.invalidateQueries({ queryKey: ['listEntries', id] }),
    ]);
    setRefreshing(false);
  };

  const isLoading = listLoading || entriesLoading;
  const error = listError || entriesError;

  // Loading state
  if (isLoading) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading list...</Text>
      </View>
    );
  }

  // Error state
  if (error || !list) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Colors.gray} />
        <Text style={styles.errorText}>Failed to load list</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ['listDetail', id] });
            queryClient.invalidateQueries({ queryKey: ['listEntries', id] });
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const entryCount = entries?.length || 0;

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
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            {list.icon && (
              <Text style={styles.headerIcon}>{list.icon}</Text>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{list.name}</Text>
          </View>
          <TouchableOpacity onPress={handleMoreOptions} style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Description Card (only if description exists) */}
        {list.description && (
          <Card style={styles.descriptionCard}>
            <Text style={styles.description}>{list.description}</Text>
          </Card>
        )}

        {/* Sort & Filter Bar */}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={styles.sortFilterButton}
            onPress={handleSortFilterToggle}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={20} color={Colors.text.primary} />
            <Text style={styles.sortFilterButtonText}>Sort & Filter</Text>
            <Ionicons
              name={showSortFilter ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Sort & Filter Options (Expandable) */}
        {showSortFilter && (
          <Card style={styles.sortFilterCard}>
            {/* Sort Options */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Sort by</Text>
              <View style={styles.optionButtons}>
                <TouchableOpacity
                  style={[styles.optionButton, sortBy === 'date' && styles.optionButtonActive]}
                  onPress={() => handleSortChange('date')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={sortBy === 'date' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, sortBy === 'date' && styles.optionButtonTextActive]}>
                    Date
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, sortBy === 'rating' && styles.optionButtonActive]}
                  onPress={() => handleSortChange('rating')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="star-outline"
                    size={18}
                    color={sortBy === 'rating' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, sortBy === 'rating' && styles.optionButtonTextActive]}>
                    Rating
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, sortBy === 'name' && styles.optionButtonActive]}
                  onPress={() => handleSortChange('name')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="text-outline"
                    size={18}
                    color={sortBy === 'name' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, sortBy === 'name' && styles.optionButtonTextActive]}>
                    Name
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Options */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Filter</Text>
              <View style={styles.optionButtons}>
                <TouchableOpacity
                  style={[styles.optionButton, filterBy === 'all' && styles.optionButtonActive]}
                  onPress={() => handleFilterChange('all')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="apps-outline"
                    size={18}
                    color={filterBy === 'all' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, filterBy === 'all' && styles.optionButtonTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, filterBy === 'highRated' && styles.optionButtonActive]}
                  onPress={() => handleFilterChange('highRated')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trophy-outline"
                    size={18}
                    color={filterBy === 'highRated' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, filterBy === 'highRated' && styles.optionButtonTextActive]}>
                    High Rated
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, filterBy === 'recent' && styles.optionButtonActive]}
                  onPress={() => handleFilterChange('recent')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={filterBy === 'recent' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.optionButtonText, filterBy === 'recent' && styles.optionButtonTextActive]}>
                    Recent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}

        {/* Entries Section */}
        <View style={styles.entriesSection}>
          {/* Entries Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Entries</Text>
            {entryCount > 0 && (
              <Text style={styles.entryCount}>{entryCount}</Text>
            )}
          </View>

          {/* Empty State */}
          {entryCount === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={80} color={Colors.gray} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button below to add your first entry to this list
              </Text>
            </View>
          )}

          {/* Entry Cards Container */}
          {entries && entries.length > 0 && (
            <View style={styles.entriesContainer}>
              {entries.map((entry, index) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  list={list}
                  onPress={() => handleEntryPress(entry.id)}
                  onLongPress={() => handleEntryLongPress(entry.id, entry.field_values['1'] || 'Untitled')}
                  showDivider={index < entries.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEntry}
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
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.gap.large,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.small,
    marginHorizontal: Spacing.gap.medium,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  descriptionCard: {
    marginBottom: Spacing.gap.medium,
  },
  description: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
    lineHeight: 20,
  },
  controlsBar: {
    marginBottom: Spacing.gap.medium,
  },
  sortFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.small,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.gap.medium,
    paddingHorizontal: Spacing.gap.large,
  },
  sortFilterButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  sortFilterCard: {
    marginBottom: Spacing.gap.medium,
  },
  optionSection: {
    marginBottom: Spacing.gap.large,
  },
  optionSectionTitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
    flexWrap: 'wrap',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.gap.small,
    paddingHorizontal: Spacing.gap.medium,
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
  },
  optionButtonText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  optionButtonTextActive: {
    color: Colors.black,
    fontFamily: 'Nunito_700Bold',
  },
  entriesSection: {
    marginBottom: Spacing.gap.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.gap.medium,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  entryCount: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.gap.small,
    paddingVertical: Spacing.gap.xs,
    borderRadius: BorderRadius.full,
  },
  entriesContainer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
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
    lineHeight: 24,
    maxWidth: 300,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding.horizontal,
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
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.gap.large,
    paddingVertical: Spacing.gap.medium,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
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
