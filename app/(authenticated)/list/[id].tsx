import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
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

interface FilterCriteria {
  id: string;
  key: FilterOption;
  label: string;
  icon: string;
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
  const [sortBy, setSortBy] = useState<SortOption>('date');
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

  // Applied filter criteria
  const [appliedFilterCriteria, setAppliedFilterCriteria] = useState<FilterCriteria[]>([
    { id: 'f1', key: 'all', label: 'All', icon: 'apps-outline' },
  ]);

  // Non-applied filter criteria
  const [nonAppliedFilterCriteria, setNonAppliedFilterCriteria] = useState<FilterCriteria[]>([
    { id: 'f2', key: 'highRated', label: 'High Rated', icon: 'trophy-outline' },
    { id: 'f3', key: 'recent', label: 'Recent', icon: 'time-outline' },
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

          {/* Tab Switcher */}
          <View style={styles.modalTabSwitcherWrapper}>
            <TabSwitcher
              tabs={['Sort', 'Filter']}
              activeTab={modalTab === 'sort' ? 'Sort' : 'Filter'}
              onTabChange={(tab) => setModalTab(tab === 'Sort' ? 'sort' : 'filter')}
            />
          </View>

          {/* Sort Options - No ScrollView wrapper to avoid nesting VirtualizedList */}
          {modalTab === 'sort' && (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={styles.modalContent}>
                <View style={styles.sortContainer}>
                  {/* Active Sort Criteria Section */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>Active Sort</Text>
                    <Text style={styles.sortSectionSubtitle}>
                      Drag to reorder priority (top = highest priority)
                    </Text>
                    <DraggableFlatList
                      data={appliedSortCriteria}
                      onDragEnd={({ data }) => setAppliedSortCriteria(data)}
                      keyExtractor={(item) => item.id}
                      containerStyle={styles.draggableContainer}
                      contentContainerStyle={styles.draggableContentContainer}
                      renderItem={({ item, drag, isActive }) => (
                          <Pressable
                            onLongPress={drag}
                            delayLongPress={150}
                            style={[
                              styles.sortCriteriaItem,
                              styles.sortCriteriaItemActive,
                              isActive && styles.sortCriteriaItemDragging,
                            ]}
                          >
                            <Pressable
                              onPressIn={drag}
                              style={styles.dragHandleButton}
                            >
                              <Ionicons
                                name="reorder-three"
                                size={20}
                                color={Colors.gray}
                                style={styles.dragHandle}
                              />
                            </Pressable>
                            <Ionicons
                              name={item.icon as any}
                              size={20}
                              color={Colors.black}
                            />
                            <Text style={styles.sortCriteriaText}>{item.label}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAppliedSortCriteria(
                                  appliedSortCriteria.map((c) =>
                                    c.id === item.id
                                      ? { ...c, direction: c.direction === 'asc' ? 'desc' : 'asc' }
                                      : c
                                  )
                                );
                              }}
                              style={styles.directionButton}
                            >
                              <Ionicons
                                name={item.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                                size={20}
                                color={Colors.black}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                // Move to non-applied section
                                setNonAppliedSortCriteria([...nonAppliedSortCriteria, item]);
                                setAppliedSortCriteria(
                                  appliedSortCriteria.filter((c) => c.id !== item.id)
                                );
                              }}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close-circle" size={20} color={Colors.gray} />
                            </TouchableOpacity>
                          </Pressable>
                      )}
                    />
                    {appliedSortCriteria.length === 0 && (
                      <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>
                          No active sort criteria. Add from below.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Non-Active Sort Criteria Section */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>Available Sort Options</Text>
                    <Text style={styles.sortSectionSubtitle}>Tap to add to active sort</Text>
                    <View style={styles.nonActiveSortContainer}>
                      {nonAppliedSortCriteria.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // Move to applied section
                            setAppliedSortCriteria([...appliedSortCriteria, item]);
                            setNonAppliedSortCriteria(
                              nonAppliedSortCriteria.filter((c) => c.id !== item.id)
                            );
                          }}
                          style={styles.sortCriteriaItem}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={Colors.gray}
                          />
                          <Text style={[styles.sortCriteriaText, styles.sortCriteriaTextInactive]}>
                            {item.label}
                          </Text>
                          <Ionicons name="add-circle-outline" size={20} color={Colors.gray} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {nonAppliedSortCriteria.length === 0 && (
                      <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>
                          All sort options are active
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </GestureHandlerRootView>
          )}

          {/* Filter Options - No ScrollView wrapper to avoid nesting VirtualizedList */}
          {modalTab === 'filter' && (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={styles.modalContent}>
                <View style={styles.sortContainer}>
                  {/* Active Filter Criteria Section */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>Active Filters</Text>
                    <Text style={styles.sortSectionSubtitle}>
                      Drag to reorder priority (top = highest priority)
                    </Text>
                    <DraggableFlatList
                      data={appliedFilterCriteria}
                      onDragEnd={({ data }) => setAppliedFilterCriteria(data)}
                      keyExtractor={(item) => item.id}
                      containerStyle={styles.draggableContainer}
                      contentContainerStyle={styles.draggableContentContainer}
                      renderItem={({ item, drag, isActive }) => (
                          <Pressable
                            onLongPress={drag}
                            delayLongPress={150}
                            style={[
                              styles.sortCriteriaItem,
                              styles.sortCriteriaItemActive,
                              isActive && styles.sortCriteriaItemDragging,
                            ]}
                          >
                            <Pressable
                              onPressIn={drag}
                              style={styles.dragHandleButton}
                            >
                              <Ionicons
                                name="reorder-three"
                                size={20}
                                color={Colors.gray}
                                style={styles.dragHandle}
                              />
                            </Pressable>
                            <Ionicons
                              name={item.icon as any}
                              size={20}
                              color={Colors.black}
                            />
                            <Text style={styles.sortCriteriaText}>{item.label}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                // Move to non-applied section
                                setNonAppliedFilterCriteria([...nonAppliedFilterCriteria, item]);
                                setAppliedFilterCriteria(
                                  appliedFilterCriteria.filter((c) => c.id !== item.id)
                                );
                              }}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close-circle" size={20} color={Colors.gray} />
                            </TouchableOpacity>
                          </Pressable>
                      )}
                    />
                    {appliedFilterCriteria.length === 0 && (
                      <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>
                          No active filters. Add from below.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Non-Active Filter Criteria Section */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>Available Filter Options</Text>
                    <View style={styles.modalOptionsContainer}>
                      {nonAppliedFilterCriteria.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.sortCriteriaItem}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // Move to applied section
                            setAppliedFilterCriteria([...appliedFilterCriteria, item]);
                            setNonAppliedFilterCriteria(
                              nonAppliedFilterCriteria.filter((c) => c.id !== item.id)
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={Colors.gray}
                          />
                          <Text style={[styles.sortCriteriaText, { color: Colors.gray }]}>
                            {item.label}
                          </Text>
                          <Ionicons
                            name="add-circle"
                            size={20}
                            color={Colors.gray}
                            style={styles.addIcon}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {nonAppliedFilterCriteria.length === 0 && (
                      <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>
                          All filter options are active
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </GestureHandlerRootView>
          )}

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
  modalTabSwitcherWrapper: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.section,
    paddingBottom: Spacing.gap.medium,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingBottom: 120,
    overflow: 'visible',
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
  // Sort & Drag Styles
  sortContainer: {
    flex: 1,
    gap: Spacing.gap.section,
    overflow: 'visible',
  },
  sortSection: {
    marginBottom: Spacing.gap.large,
    overflow: 'visible',
  },
  sortSectionTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.xs,
  },
  sortSectionSubtitle: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.medium,
  },
  sortCriteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    gap: Spacing.gap.small,
    marginBottom: Spacing.gap.small,
  },
  sortCriteriaItemActive: {
    backgroundColor: Colors.primary,
  },
  sortCriteriaItemDragging: {
    backgroundColor: Colors.primaryActive,
  },
  dragHandle: {
    marginRight: Spacing.gap.xs,
  },
  sortCriteriaText: {
    flex: 1,
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  sortCriteriaTextInactive: {
    color: Colors.gray,
  },
  directionButton: {
    padding: Spacing.gap.xs,
    marginLeft: Spacing.gap.xs,
  },
  removeButton: {
    padding: Spacing.gap.xs,
  },
  nonActiveSortContainer: {
    gap: Spacing.gap.small,
  },
  emptySection: {
    padding: Spacing.gap.large,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  draggableContainer: {
  },
  draggableContentContainer: {
  },
  dragHandleButton: {
    padding: Spacing.gap.xs,
    marginRight: Spacing.gap.xs,
  },
});
