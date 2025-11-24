import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useListDetail, useListEntries } from '@/lib/hooks/useListEntries';
import { useListActions } from '@/lib/hooks/useListActions';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius, Dimensions } from '@/constants/styleGuide';
import Card from '@/components/Card';
import EntryCard from '@/components/EntryCard';
import TabSwitcher from '@/components/TabSwitcher';
import Button from '@/components/Button';
import { trackScreenView, trackEvent } from '@/lib/posthog';
import { Entry } from '@/constants/types';

type SortOption = 'date' | 'rating' | 'name';
type FilterOption = 'all' | 'highRated' | 'recent';

interface SortCriteria {
  id: string;
  key: SortOption;
  label: string;
  icon: string;
  direction: 'asc' | 'desc';
}

const AVAILABLE_SORT_OPTIONS: Omit<SortCriteria, 'id' | 'direction'>[] = [
  { key: 'date', label: 'Date', icon: 'calendar-outline' },
  { key: 'rating', label: 'Rating', icon: 'star-outline' },
  { key: 'name', label: 'Name', icon: 'text-outline' },
];

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [showSortFilterModal, setShowSortFilterModal] = useState(false);
  const [modalTab, setModalTab] = useState<'sort' | 'filter'>('sort');

  // Applied sort criteria (order matters - first has highest priority)
  const [appliedSortCriteria, setAppliedSortCriteria] = useState<SortCriteria[]>([
    { id: '1', key: 'date', label: 'Date', icon: 'calendar-outline', direction: 'desc' },
  ]);

  // Non-applied sort criteria
  const [nonAppliedSortCriteria, setNonAppliedSortCriteria] = useState<SortCriteria[]>([
    { id: '2', key: 'rating', label: 'Rating', icon: 'star-outline', direction: 'desc' },
    { id: '3', key: 'name', label: 'Name', icon: 'text-outline', direction: 'asc' },
  ]);

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

  const handleOpenSortFilterModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortFilterModal(true);
  };

  const handleCloseSortFilterModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortFilterModal(false);
  };

  const handleApplySortFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Apply sort and filter logic
    setShowSortFilterModal(false);
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
          <View style={styles.headerRightButtons}>
            <TouchableOpacity onPress={handleOpenSortFilterModal} style={styles.headerButton}>
              <Ionicons name="funnel-outline" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMoreOptions} style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* List Title */}
        <View style={styles.titleSection}>
          <Text style={styles.listName}>{list.name}</Text>
        </View>

        {/* List Description */}
        {list.description && (
          <Text style={styles.listDescription}>{list.description}</Text>
        )}

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

      {/* Sort & Filter Modal */}
      <Modal
        visible={showSortFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseSortFilterModal}
      >
        <View style={CommonStyles.screenContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderSpacer} />
            <Text style={styles.modalHeaderTitle}>Sort & Filter</Text>
            <TouchableOpacity onPress={handleCloseSortFilterModal} style={styles.modalCancelButton}>
              <Ionicons name="close" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            {/* Tab Switcher */}
            <View style={styles.modalTabSwitcher}>
              <TabSwitcher
                tabs={['Sort', 'Filter']}
                activeTab={modalTab === 'sort' ? 'Sort' : 'Filter'}
                onTabChange={(tab) => setModalTab(tab === 'Sort' ? 'sort' : 'filter')}
              />
            </View>

            {/* Sort Options */}
            {modalTab === 'sort' && (
              <View style={styles.modalOptionsContainer}>
                <TouchableOpacity
                  style={[styles.modalOption, sortBy === 'date' && styles.modalOptionActive]}
                  onPress={() => handleSortChange('date')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={sortBy === 'date' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, sortBy === 'date' && styles.modalOptionTextActive]}>
                    Date
                  </Text>
                  {sortBy === 'date' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, sortBy === 'rating' && styles.modalOptionActive]}
                  onPress={() => handleSortChange('rating')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="star-outline"
                    size={24}
                    color={sortBy === 'rating' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, sortBy === 'rating' && styles.modalOptionTextActive]}>
                    Rating
                  </Text>
                  {sortBy === 'rating' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, sortBy === 'name' && styles.modalOptionActive]}
                  onPress={() => handleSortChange('name')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="text-outline"
                    size={24}
                    color={sortBy === 'name' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, sortBy === 'name' && styles.modalOptionTextActive]}>
                    Name
                  </Text>
                  {sortBy === 'name' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Filter Options */}
            {modalTab === 'filter' && (
              <View style={styles.modalOptionsContainer}>
                <TouchableOpacity
                  style={[styles.modalOption, filterBy === 'all' && styles.modalOptionActive]}
                  onPress={() => handleFilterChange('all')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="apps-outline"
                    size={24}
                    color={filterBy === 'all' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, filterBy === 'all' && styles.modalOptionTextActive]}>
                    All
                  </Text>
                  {filterBy === 'all' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, filterBy === 'highRated' && styles.modalOptionActive]}
                  onPress={() => handleFilterChange('highRated')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trophy-outline"
                    size={24}
                    color={filterBy === 'highRated' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, filterBy === 'highRated' && styles.modalOptionTextActive]}>
                    High Rated
                  </Text>
                  {filterBy === 'highRated' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, filterBy === 'recent' && styles.modalOptionActive]}
                  onPress={() => handleFilterChange('recent')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={filterBy === 'recent' ? Colors.black : Colors.gray}
                  />
                  <Text style={[styles.modalOptionText, filterBy === 'recent' && styles.modalOptionTextActive]}>
                    Recent
                  </Text>
                  {filterBy === 'recent' && (
                    <Ionicons name="checkmark" size={20} color={Colors.black} style={styles.modalCheckmark} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.modalBottomActions}>
            <Button
              label="Apply"
              variant="primary"
              onPress={handleApplySortFilter}
              fullWidth
            />
          </View>
        </View>
      </Modal>

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
  headerRightButtons: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
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
  titleSection: {
    marginBottom: Spacing.gap.small,
  },
  listName: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  listDescription: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.large,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: Spacing.gap.medium,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
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
  sortFilterIcon: {
    padding: Spacing.gap.xs,
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
  modalCancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalScrollContent: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.section,
    paddingBottom: 120,
  },
  modalTabSwitcher: {
    marginBottom: Spacing.gap.large,
  },
  modalOptionsContainer: {
    gap: Spacing.gap.small,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    gap: Spacing.gap.small,
  },
  modalOptionActive: {
    backgroundColor: Colors.primary,
  },
  modalOptionText: {
    flex: 1,
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
  },
  modalOptionTextActive: {
    color: Colors.black,
  },
  modalCheckmark: {
    marginLeft: 'auto',
  },
  modalBottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenPadding.horizontal,
    paddingBottom: 32,
    zIndex: 10,
  },
});
