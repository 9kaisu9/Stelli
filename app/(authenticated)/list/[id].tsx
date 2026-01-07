import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useListDetail, useListEntries } from '@/lib/hooks/useListEntries';
import { useListActions } from '@/lib/hooks/useListActions';
import { useShareList } from '@/lib/hooks/useShareList';
import { useListPermissions } from '@/lib/hooks/useListPermissions';
import { useEntryActions } from '@/lib/hooks/useEntryActions';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius, Dimensions } from '@/constants/styleGuide';
import EntryCard from '@/components/EntryCard';
import TabSwitcher from '@/components/TabSwitcher';
import Button from '@/components/Button';
import ShareListModal from '@/components/ShareListModal';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import { trackScreenView, trackEvent } from '@/lib/posthog';
import { Entry } from '@/constants/types';

type SortOption = 'date' | 'rating' | 'name';
type FilterType = 'rating' | 'date';
type RatingFilterMode = 'above' | 'below' | 'between' | 'unrated';

interface SortCriteria {
  id: string;
  key: SortOption;
  label: string;
  icon: string;
  direction: 'asc' | 'desc';
}

interface RatingRange {
  min: number;
  max: number;
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface FilterCriteria {
  id: string;
  type: FilterType;
  label: string;
  icon: string;
  // Configuration based on type
  ratingFilterMode?: RatingFilterMode;
  ratingRange?: RatingRange;
  dateRange?: DateRange;
  datePreset?: '7days' | '30days' | '90days' | 'custom';
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
  const [showSortFilterModal, setShowSortFilterModal] = useState(false);
  const [modalTab, setModalTab] = useState<'sort' | 'filter'>('sort');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewOnlySheet, setShowViewOnlySheet] = useState(false);
  const [showEntryActionsSheet, setShowEntryActionsSheet] = useState(false);
  const [showDeleteEntrySheet, setShowDeleteEntrySheet] = useState(false);
  const [showDeleteListSheet, setShowDeleteListSheet] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter configuration state - inline expansion
  const [expandedFilterId, setExpandedFilterId] = useState<string | null>(null);
  const [activeDateFilterId, setActiveDateFilterId] = useState<string | null>(null);
  const [activeDateField, setActiveDateField] = useState<'from' | 'to' | null>(null);
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);
  // Temp rating input values (for allowing empty during editing)
  const [tempRatingInputs, setTempRatingInputs] = useState<Record<string, { min: string; max: string }>>({});

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
  const [appliedFilterCriteria, setAppliedFilterCriteria] = useState<FilterCriteria[]>([]);

  // Non-applied filter criteria (available to add)
  const [nonAppliedFilterCriteria, setNonAppliedFilterCriteria] = useState<FilterCriteria[]>([
    { id: 'f1', type: 'rating', label: 'Rating', icon: 'star-outline' },
    { id: 'f2', type: 'date', label: 'Date Range', icon: 'calendar-outline' },
  ]);

  const { data: list, isLoading: listLoading, error: listError } = useListDetail(id);
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useListEntries(id);
  const { deleteListMutation } = useListActions();
  const { deleteEntryMutation } = useEntryActions();
  const { generateShareUrl } = useShareList(id);
  const { data: permission, isLoading: permissionLoading } = useListPermissions(id);

  // Permission checks - owners and users with 'edit' permission can edit
  const isOwner = permission === 'owner';
  const canEdit = isOwner || permission === 'edit'; // Owners and edit permission can edit

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
    if (!canEdit) {
      setShowViewOnlySheet(true);
      return;
    }

    setSelectedEntry({ id: entryId, name: entryName });
    setShowEntryActionsSheet(true);
  };

  const handleDeleteEntry = (entryId: string, entryName: string) => {
    setSelectedEntry({ id: entryId, name: entryName });
    setShowDeleteEntrySheet(true);
  };

  const handleConfirmDeleteEntry = async () => {
    if (!selectedEntry) return;

    deleteEntryMutation.mutate(selectedEntry.id, {
      onSuccess: () => {
        trackEvent('Entry Deleted', { entryId: selectedEntry.id, listId: id });
        setShowSuccessSheet(true);
        setSelectedEntry(null);
      },
      onError: (error: any) => {
        setErrorMessage(error.message || 'Failed to delete entry');
        setShowErrorSheet(true);
      },
    });
  };

  const handleEditList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent('Edit List Initiated', { listId: id });
    router.push(`/edit-list/${id}` as any);
  };

  const handleDeleteList = () => {
    if (!list) return;
    setShowDeleteListSheet(true);
  };

  const handleConfirmDeleteList = () => {
    deleteListMutation.mutate(id, {
      onSuccess: () => {
        trackEvent('List Deleted', { listId: id });
        setShowSuccessSheet(true);
        setTimeout(() => {
          router.back();
        }, 1500);
      },
      onError: (error: any) => {
        setErrorMessage(error.message || 'Failed to delete list');
        setShowErrorSheet(true);
      },
    });
  };

  const handleMoreOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionMenu(true);
  };

  const resetDatePickerState = () => {
    setActiveDateFilterId(null);
    setActiveDateField(null);
    setTempFromDate(null);
    setTempToDate(null);
  };

  const handleOpenSortFilterModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortFilterModal(true);
  };

  const handleCloseSortFilterModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortFilterModal(false);
    resetDatePickerState();
  };

  const handleApplySortFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSortFilterModal(false);
    resetDatePickerState();
  };

  const handleOpenDatePicker = (filterId: string, field: 'from' | 'to', currentValue?: Date | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDateFilterId(filterId);
    setActiveDateField(field);

    const fallbackDate = currentValue ? new Date(currentValue) : new Date();
    if (field === 'from') {
      setTempFromDate(fallbackDate);
    } else {
      setTempToDate(fallbackDate);
    }
  };

  const handleCancelDatePicker = () => {
    resetDatePickerState();
  };

  const handleConfirmDatePicker = () => {
    if (!activeDateFilterId || !activeDateField) {
      resetDatePickerState();
      return;
    }

    setAppliedFilterCriteria((prev) =>
      prev.map((filter) => {
        if (filter.id !== activeDateFilterId) return filter;

        const currentRange = filter.dateRange || { from: null, to: null };
        const selectedDate =
          activeDateField === 'from'
            ? tempFromDate || currentRange.from || new Date()
            : tempToDate || currentRange.to || new Date();

        const updatedRange = {
          ...currentRange,
          [activeDateField]: selectedDate,
        };

        // Keep range order sensible if user picks an earlier "to" or later "from"
        if (updatedRange.from && updatedRange.to && updatedRange.from > updatedRange.to) {
          if (activeDateField === 'from') {
            updatedRange.to = selectedDate;
          } else {
            updatedRange.from = selectedDate;
          }
        }

        return {
          ...filter,
          dateRange: updatedRange,
          datePreset: 'custom',
        };
      })
    );

    resetDatePickerState();
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

  // Sort entries based on applied sort criteria
  const sortedEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Create a copy to avoid mutating original data
    const entriesCopy = [...entries];

    // Sort by each criteria in order (highest priority first)
    entriesCopy.sort((a, b) => {
      for (const criteria of appliedSortCriteria) {
        let comparison = 0;

        switch (criteria.key) {
          case 'date':
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            comparison = dateA - dateB;
            break;

          case 'rating':
            const ratingA = a.rating ?? -1; // Treat null as lowest
            const ratingB = b.rating ?? -1;
            comparison = ratingA - ratingB;
            break;

          case 'name':
            const nameA = (a.field_values?.name || a.field_values?.['1'] || '').toLowerCase();
            const nameB = (b.field_values?.name || b.field_values?.['1'] || '').toLowerCase();
            comparison = nameA.localeCompare(nameB);
            break;
        }

        // Apply direction (asc or desc)
        if (criteria.direction === 'desc') {
          comparison = -comparison;
        }

        // If this criteria produces a difference, return it
        if (comparison !== 0) {
          return comparison;
        }

        // Otherwise, continue to next criteria
      }

      // If all criteria are equal, maintain original order
      return 0;
    });

    return entriesCopy;
  }, [entries, appliedSortCriteria]);

  // Filter entries based on applied filter criteria
  const filteredEntries = useMemo(() => {
    if (!sortedEntries || sortedEntries.length === 0) return [];
    if (appliedFilterCriteria.length === 0) return sortedEntries;

    return sortedEntries.filter((entry) => {
      // Entry must pass ALL active filters (AND logic)
      for (const filter of appliedFilterCriteria) {
        switch (filter.type) {
          case 'rating':
            const rating = entry.rating;
            const mode = filter.ratingFilterMode || 'between';

            if (mode === 'unrated') {
              // Only show entries without ratings
              if (rating !== null && rating !== undefined) {
                return false;
              }
            } else if (mode === 'above' && filter.ratingRange) {
              // Above threshold
              if (rating === null || rating === undefined || rating <= filter.ratingRange.min) {
                return false;
              }
            } else if (mode === 'below' && filter.ratingRange) {
              // Below threshold
              if (rating === null || rating === undefined || rating >= filter.ratingRange.max) {
                return false;
              }
            } else if (mode === 'between' && filter.ratingRange) {
              // Between range (inclusive)
              if (rating === null || rating === undefined) return false;
              if (rating < filter.ratingRange.min || rating > filter.ratingRange.max) {
                return false;
              }
            }
            break;

          case 'date':
            if (filter.dateRange) {
              const entryDate = new Date(entry.created_at);
              const { from, to } = filter.dateRange;

              // Check from date
              if (from && entryDate < from) return false;

              // Check to date (set to end of day)
              if (to) {
                const endOfDay = new Date(to);
                endOfDay.setHours(23, 59, 59, 999);
                if (entryDate > endOfDay) return false;
              }
            }
            break;
        }
      }

      // Entry passed all filters
      return true;
    });
  }, [sortedEntries, appliedFilterCriteria]);

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

  const entryCount = filteredEntries?.length || 0;

  // Action Sheet Options
  const viewOnlyOptions: ActionSheetOption[] = [
    {
      label: 'OK',
      icon: 'checkmark-circle-outline',
      onPress: () => {},
    },
  ];

  const entryActionsOptions: ActionSheetOption[] = [
    {
      label: 'Edit',
      icon: 'create-outline',
      onPress: () => {
        if (selectedEntry) {
          trackEvent('Edit Entry Initiated', { entryId: selectedEntry.id });
          router.push(`/entry/${selectedEntry.id}` as any);
        }
      },
    },
    {
      label: 'Delete',
      icon: 'trash-outline',
      onPress: () => {
        if (selectedEntry) {
          handleDeleteEntry(selectedEntry.id, selectedEntry.name);
        }
      },
      destructive: true,
    },
  ];

  const deleteEntryOptions: ActionSheetOption[] = [
    {
      label: 'Delete',
      icon: 'trash-outline',
      onPress: handleConfirmDeleteEntry,
      destructive: true,
    },
  ];

  const deleteListOptions: ActionSheetOption[] = [
    {
      label: 'Delete',
      icon: 'trash-outline',
      onPress: handleConfirmDeleteList,
      destructive: true,
    },
  ];

  const successOptions: ActionSheetOption[] = [
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
    <View style={CommonStyles.screenContainer}>
      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity onPress={handleBack} style={styles.floatingButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerRightButtons}>
          <TouchableOpacity onPress={handleOpenSortFilterModal} style={styles.floatingButton}>
            <Ionicons name="funnel-outline" size={24} color={Colors.black} />
          </TouchableOpacity>
          {/* Only show action menu for list owners */}
          {isOwner && (
            <TouchableOpacity onPress={handleMoreOptions} style={styles.floatingButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={Colors.black} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
        {/* List Title */}
        <View style={styles.titleSection}>
          <Text style={styles.listName}>{list.name}</Text>
        </View>

        {/* List Description */}
        {list.description && (
          <Text style={styles.listDescription}>{list.description}</Text>
        )}

        {/* Entry Count and Permission Header */}
        <View style={styles.entryCountHeader}>
          <Text style={styles.entryCountText}>
            {entryCount} {entryCount === 1 ? 'Entry' : 'Entries'}
          </Text>
          {!isOwner && permission && (
            <View style={[
              styles.permissionBadge,
              permission === 'view' ? styles.viewBadge : styles.editBadge
            ]}>
              <Ionicons
                name={permission === 'view' ? 'eye-outline' : 'create-outline'}
                size={14}
                color={Colors.gray}
              />
              <Text style={[
                styles.permissionText,
                permission === 'view' ? styles.viewText : styles.editText
              ]}>
                {permission === 'view' ? 'View Only' : 'Can Edit'}
              </Text>
            </View>
          )}
        </View>

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
          {filteredEntries && filteredEntries.length > 0 && (
            <View style={styles.entriesList}>
              {filteredEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  list={list}
                  onPress={() => handleEntryPress(entry.id)}
                  onLongPress={() => handleEntryLongPress(entry.id, entry.field_values['name'] || entry.field_values['1'] || 'Untitled')}
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

          {/* Filter Options */}
          {modalTab === 'filter' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
              <View style={styles.sortContainer}>
                {/* Active Filter Criteria Section */}
                <View style={styles.sortSection}>
                  <Text style={styles.sortSectionTitle}>Active Filters</Text>
                  <Text style={styles.sortSectionSubtitle}>
                    All filters apply together (entries must match all)
                  </Text>
                  <View style={styles.nonActiveSortContainer}>
                    {appliedFilterCriteria.map((item) => {
                      const isExpanded = expandedFilterId === item.id;

                      return (
                        <View key={item.id} style={[
                          styles.sortCriteriaItem,
                          styles.sortCriteriaItemActive,
                          styles.filterCard,
                        ]}>
                          {/* Filter Header */}
                          <View style={styles.filterHeader}>
                            <Ionicons
                              name={item.icon as any}
                              size={20}
                              color={Colors.black}
                            />
                            <Text style={[styles.sortCriteriaText, { flex: 1 }]}>{item.label}</Text>

                            {/* Expand/Collapse Button */}
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExpandedFilterId(isExpanded ? null : item.id);
                              }}
                              style={styles.expandButton}
                            >
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={Colors.black}
                              />
                            </TouchableOpacity>

                            {/* Remove Button */}
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAppliedFilterCriteria(
                                  appliedFilterCriteria.filter((c) => c.id !== item.id)
                                );
                                setExpandedFilterId(null);
                                resetDatePickerState();
                                // Re-add to available
                                const originalFilter = nonAppliedFilterCriteria.find(f => f.type === item.type);
                                if (!originalFilter) {
                                  setNonAppliedFilterCriteria([
                                    ...nonAppliedFilterCriteria,
                                    { id: `f${Date.now()}`, type: item.type, label: item.label, icon: item.icon }
                                  ]);
                                }
                              }}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close-circle" size={20} color={Colors.gray} />
                            </TouchableOpacity>
                          </View>

                          {/* Divider - Always shown when expanded */}
                          {isExpanded && (
                            <View style={styles.filterDivider} />
                          )}

                          {/* Inline Configuration - Expanded */}
                          {isExpanded && (
                            <View style={styles.filterConfigInlineContent}>
                              {/* Rating Filter Configuration */}
                              {item.type === 'rating' && (
                                <View style={styles.inlineConfigContent}>
                                  <Text style={styles.inlineConfigLabel}>Filter Mode:</Text>
                                  <View style={styles.modeButtonsRow}>
                                    {[
                                      { key: 'above' as const, label: 'Above', icon: 'arrow-up' },
                                      { key: 'below' as const, label: 'Below', icon: 'arrow-down' },
                                      { key: 'between' as const, label: 'Between', icon: 'swap-horizontal' },
                                      { key: 'unrated' as const, label: 'Unrated', icon: 'remove-circle' },
                                    ].map((mode) => (
                                      <TouchableOpacity
                                        key={mode.key}
                                        style={[
                                          styles.modeButton,
                                          (item.ratingFilterMode || 'between') === mode.key && styles.modeButtonActive
                                        ]}
                                        onPress={() => {
                                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                          const updated = appliedFilterCriteria.map(f =>
                                            f.id === item.id ? { ...f, ratingFilterMode: mode.key } : f
                                          );
                                          setAppliedFilterCriteria(updated);
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Ionicons
                                          name={mode.icon as any}
                                          size={14}
                                          color={(item.ratingFilterMode || 'between') === mode.key ? Colors.black : Colors.gray}
                                        />
                                        <Text style={[
                                          styles.modeButtonText,
                                          (item.ratingFilterMode || 'between') === mode.key && styles.modeButtonTextActive
                                        ]}>
                                          {mode.label}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>

                                  {/* Rating Inputs */}
                                  {item.ratingFilterMode !== 'unrated' && (() => {
                                    // Determine valid range based on list rating type
                                    const ratingMax = list?.rating_type === 'stars' ? 5 : list?.rating_type === 'scale' ? 10 : 100;
                                    const ratingMin = list?.rating_type === 'stars' ? 0 : 1;
                                    const step = list?.rating_type === 'stars' ? 0.5 : list?.rating_type === 'scale' ? 1 : 1;

                                    // Get temp value or fall back to actual value
                                    const tempMin = tempRatingInputs[item.id]?.min ?? item.ratingRange?.min?.toString() ?? ratingMin.toString();
                                    const tempMax = tempRatingInputs[item.id]?.max ?? item.ratingRange?.max?.toString() ?? ratingMax.toString();

                                    return (
                                      <View style={styles.ratingInputsRow}>
                                        {(item.ratingFilterMode === 'above' || item.ratingFilterMode === 'between' || !item.ratingFilterMode) && (
                                          <View style={{ flex: 1 }}>
                                            <Text style={styles.inlineInputLabel}>
                                              {item.ratingFilterMode === 'above' ? 'Above' : 'Min'}
                                            </Text>
                                            <TextInput
                                              style={styles.inlineInput}
                                              value={tempMin}
                                              onChangeText={(text) => {
                                                // Update temp input state to allow empty string
                                                setTempRatingInputs(prev => ({
                                                  ...prev,
                                                  [item.id]: { ...prev[item.id], min: text }
                                                }));
                                              }}
                                              onBlur={() => {
                                                const num = parseFloat(tempMin);
                                                if (!isNaN(num) && num !== item.ratingRange?.min) {
                                                  // Clamp to valid range
                                                  let clampedMin = Math.max(ratingMin, Math.min(ratingMax, num));

                                                  const updated = appliedFilterCriteria.map(f => {
                                                    if (f.id === item.id) {
                                                      const currentMax = f.ratingRange?.max || ratingMax;
                                                      // Only enforce min < max for 'between' mode, not for 'above'
                                                      if (item.ratingFilterMode === 'between' && clampedMin >= currentMax) {
                                                        clampedMin = currentMax - step;
                                                      }
                                                      return {
                                                        ...f,
                                                        ratingRange: {
                                                          min: clampedMin,
                                                          max: currentMax
                                                        }
                                                      };
                                                    }
                                                    return f;
                                                  });
                                                  setAppliedFilterCriteria(updated);
                                                }
                                                // Clear temp input for this field
                                                setTempRatingInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  if (newInputs[item.id]) {
                                                    delete newInputs[item.id].min;
                                                  }
                                                  return newInputs;
                                                });
                                              }}
                                              keyboardType="numeric"
                                              placeholder={`${ratingMin} - ${ratingMax}`}
                                            />
                                          </View>
                                        )}
                                        {(item.ratingFilterMode === 'below' || item.ratingFilterMode === 'between' || !item.ratingFilterMode) && (
                                          <View style={{ flex: 1 }}>
                                            <Text style={styles.inlineInputLabel}>
                                              {item.ratingFilterMode === 'below' ? 'Below' : 'Max'}
                                            </Text>
                                            <TextInput
                                              style={styles.inlineInput}
                                              value={tempMax}
                                              onChangeText={(text) => {
                                                // Update temp input state to allow empty string
                                                setTempRatingInputs(prev => ({
                                                  ...prev,
                                                  [item.id]: { ...prev[item.id], max: text }
                                                }));
                                              }}
                                              onBlur={() => {
                                                const num = parseFloat(tempMax);
                                                if (!isNaN(num) && num !== item.ratingRange?.max) {
                                                  // Clamp to valid range
                                                  let clampedMax = Math.max(ratingMin, Math.min(ratingMax, num));

                                                  const updated = appliedFilterCriteria.map(f => {
                                                    if (f.id === item.id) {
                                                      const currentMin = f.ratingRange?.min || ratingMin;
                                                      // Only enforce min < max for 'between' mode, not for 'below'
                                                      if (item.ratingFilterMode === 'between' && clampedMax <= currentMin) {
                                                        clampedMax = currentMin + step;
                                                      }
                                                      return {
                                                        ...f,
                                                        ratingRange: {
                                                          min: currentMin,
                                                          max: clampedMax
                                                        }
                                                      };
                                                    }
                                                    return f;
                                                  });
                                                  setAppliedFilterCriteria(updated);
                                                }
                                                // Clear temp input for this field
                                                setTempRatingInputs(prev => {
                                                  const newInputs = { ...prev };
                                                  if (newInputs[item.id]) {
                                                    delete newInputs[item.id].max;
                                                  }
                                                  return newInputs;
                                                });
                                              }}
                                              keyboardType="numeric"
                                              placeholder={`${ratingMin} - ${ratingMax}`}
                                            />
                                          </View>
                                        )}
                                      </View>
                                    );
                                  })()}
                                </View>
                              )}

                              {/* Date Filter Configuration */}
                              {item.type === 'date' && (
                                <View style={styles.inlineConfigContent}>
                                  <View style={styles.ratingInputsRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.inlineInputLabel}>From</Text>
                                      <TouchableOpacity
                                        style={styles.inlineInput}
                                        onPress={() =>
                                          handleOpenDatePicker(
                                            item.id,
                                            'from',
                                            item.dateRange?.from ? new Date(item.dateRange.from) : null
                                          )
                                        }
                                        activeOpacity={0.7}
                                      >
                                        <Text
                                          style={[
                                            styles.inlineInputText,
                                            !item.dateRange?.from && styles.inlineInputPlaceholder,
                                          ]}
                                        >
                                          {item.dateRange?.from ? new Date(item.dateRange.from).toLocaleDateString() : 'Select date'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.inlineInputLabel}>To</Text>
                                      <TouchableOpacity
                                        style={styles.inlineInput}
                                        onPress={() =>
                                          handleOpenDatePicker(
                                            item.id,
                                            'to',
                                            item.dateRange?.to ? new Date(item.dateRange.to) : null
                                          )
                                        }
                                        activeOpacity={0.7}
                                      >
                                        <Text
                                          style={[
                                            styles.inlineInputText,
                                            !item.dateRange?.to && styles.inlineInputPlaceholder,
                                          ]}
                                        >
                                          {item.dateRange?.to ? new Date(item.dateRange.to).toLocaleDateString() : 'Select date'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                  {activeDateFilterId === item.id && activeDateField && (
                                    <View style={styles.datePickerContainer}>
                                      <DateTimePicker
                                        value={
                                          activeDateField === 'from'
                                            ? tempFromDate || (item.dateRange?.from ? new Date(item.dateRange.from) : new Date())
                                            : tempToDate || (item.dateRange?.to ? new Date(item.dateRange.to) : new Date())
                                        }
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        textColor={Colors.black}
                                        onChange={(event, selectedDate) => {
                                          if (selectedDate) {
                                            if (activeDateField === 'from') {
                                              setTempFromDate(selectedDate);
                                            } else {
                                              setTempToDate(selectedDate);
                                            }
                                          }
                                        }}
                                      />
                                      <View style={styles.datePickerActions}>
                                        <TouchableOpacity
                                          style={styles.datePickerActionButton}
                                          onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            handleCancelDatePicker();
                                          }}
                                          activeOpacity={0.7}
                                        >
                                          <Text style={styles.datePickerCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={[styles.datePickerActionButton, styles.datePickerConfirmButton]}
                                          onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            handleConfirmDatePicker();
                                          }}
                                          activeOpacity={0.7}
                                        >
                                          <Text style={styles.datePickerConfirmText}>Set Date</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {appliedFilterCriteria.length === 0 && (
                    <View style={styles.emptySection}>
                      <Text style={styles.emptySectionText}>
                        No active filters. Tap options below to add.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Available Filter Options Section */}
                <View style={styles.sortSection}>
                  <Text style={styles.sortSectionTitle}>Add Filter</Text>
                  <View style={styles.modalOptionsContainer}>
                    {nonAppliedFilterCriteria.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.sortCriteriaItem}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                          // Add filter with default values
                          let newFilter: FilterCriteria;
                          if (item.type === 'rating') {
                            const max = list?.rating_type === 'stars' ? 5 : list?.rating_type === 'scale' ? 10 : 100;
                            const min = list?.rating_type === 'stars' ? 0 : 1;
                            newFilter = {
                              ...item,
                              ratingFilterMode: 'between',
                              ratingRange: { min, max }
                            };
                          } else if (item.type === 'date') {
                            const now = new Date();
                            const from = new Date();
                            from.setDate(now.getDate() - 30);
                            newFilter = {
                              ...item,
                              dateRange: { from, to: now },
                              datePreset: '30days'
                            };
                          } else {
                            newFilter = item;
                          }

                          // Add to applied filters and remove from available
                          setAppliedFilterCriteria([...appliedFilterCriteria, newFilter]);
                          setNonAppliedFilterCriteria(
                            nonAppliedFilterCriteria.filter((c) => c.id !== item.id)
                          );

                          // Automatically expand the newly added filter
                          setExpandedFilterId(newFilter.id);
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
                        All filter types are in use
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
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

      {/* Action Menu Modal */}
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
              <Text style={styles.actionMenuTitle}>{list?.name || 'List Options'}</Text>
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
              <TouchableOpacity
                style={styles.actionMenuButton}
                onPress={() => {
                  setShowActionMenu(false);
                  handleEditList();
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
                  setShowActionMenu(false);
                  setShowShareModal(true);
                  trackEvent('Share List Initiated', { listId: id });
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
                  setShowActionMenu(false);
                  handleDeleteList();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.actionMenuButtonContent}>
                  <Ionicons name="trash-outline" size={24} color={Colors.error} />
                  <Text style={[styles.actionMenuButtonText, styles.actionMenuButtonTextDanger]}>Delete List</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Share List Modal */}
      <ShareListModal
        visible={showShareModal}
        listId={id}
        listName={list?.name || ''}
        onClose={() => setShowShareModal(false)}
        onShare={generateShareUrl}
      />

      {/* Floating Action Button - Only show for users who can edit */}
      {canEdit && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddEntry}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* View Only Message */}
      <CustomActionSheet
        visible={showViewOnlySheet}
        onClose={() => setShowViewOnlySheet(false)}
        title="View Only"
        options={viewOnlyOptions}
      />

      {/* Entry Actions Sheet */}
      <CustomActionSheet
        visible={showEntryActionsSheet}
        onClose={() => setShowEntryActionsSheet(false)}
        title={selectedEntry?.name || 'Entry Options'}
        options={entryActionsOptions}
      />

      {/* Delete Entry Confirmation */}
      <CustomActionSheet
        visible={showDeleteEntrySheet}
        onClose={() => setShowDeleteEntrySheet(false)}
        title={`Delete "${selectedEntry?.name}"?`}
        options={deleteEntryOptions}
      />

      {/* Delete List Confirmation */}
      <CustomActionSheet
        visible={showDeleteListSheet}
        onClose={() => setShowDeleteListSheet(false)}
        title={`Delete "${list?.name}"?\n\nThis will delete all ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}. This action cannot be undone.`}
        options={deleteListOptions}
      />

      {/* Success Message */}
      <CustomActionSheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        title="Success"
        options={successOptions}
      />

      {/* Error Message */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Error'}
        options={errorOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screenPadding.horizontal,
    paddingTop: 120, // Space for floating buttons (60 top + 40 button height + 20 gap)
    paddingBottom: 100,
  },
  floatingButtons: {
    position: 'absolute',
    top: 60, // Below status bar
    left: Spacing.screenPadding.horizontal,
    right: Spacing.screenPadding.horizontal,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
  },
  titleSection: {
    marginBottom: Spacing.gap.small,
  },
  listName: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  listDescription: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.gap.large,
  },
  entryCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.gap.large,
  },
  entryCountText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    paddingHorizontal: Spacing.gap.medium,
    paddingVertical: Spacing.gap.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  viewBadge: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  editBadge: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  permissionText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_700Bold',
  },
  viewText: {
    color: Colors.gray,
  },
  editText: {
    color: Colors.gray,
  },
  sortFilterCard: {
    marginBottom: Spacing.gap.medium,
  },
  optionSection: {
    marginBottom: Spacing.gap.large,
  },
  optionSectionTitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  optionButtonTextActive: {
    color: Colors.black,
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
    color: Colors.gray,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.gap.small,
    paddingVertical: Spacing.gap.xs,
    borderRadius: BorderRadius.full,
  },
  sortFilterIcon: {
    padding: Spacing.gap.xs,
  },
  entriesList: {
    gap: Spacing.gap.medium,
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
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
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
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginTop: Spacing.gap.medium,
  },
  errorText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
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
    backgroundColor: Colors.black,
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
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.xs,
  },
  sortSectionSubtitle: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
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
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_400Regular',
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
    position: 'relative',
  },
  actionMenuTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
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
    borderColor: Colors.black,
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
    borderColor: Colors.black,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.padding.card,
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
    fontFamily: 'Muli_400Regular',
    color: Colors.black,
  },
  actionMenuButtonTextDanger: {
    color: Colors.error,
  },
  filterDescription: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginTop: 2,
  },
  addIcon: {
    marginLeft: 'auto',
  },
  // Filter Configuration Modal Styles
  filterConfigContent: {
    padding: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.section,
    paddingBottom: 40,
  },
  filterConfigTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  filterConfigSubtitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.large,
  },
  filterConfigHelper: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginTop: Spacing.gap.medium,
    fontStyle: 'italic',
  },
  ratingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.large,
    marginTop: Spacing.gap.medium,
  },
  ratingInputContainer: {
    flex: 1,
  },
  ratingInputLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.xs,
  },
  ratingInput: {
    height: 50,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.padding.card,
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
  },
  ratingRangeSeparator: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginTop: 20,
  },
  datePresetContainer: {
    gap: Spacing.gap.small,
    marginTop: Spacing.gap.medium,
  },
  datePresetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.gap.medium,
    paddingHorizontal: Spacing.gap.large,
  },
  datePresetButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.black,
  },
  datePresetButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  datePresetButtonTextActive: {
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
  // Inline Filter Configuration Styles
  filterCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  expandButton: {
    padding: Spacing.gap.xs,
    marginLeft: Spacing.gap.xs,
  },
  filterDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.gap.medium,
    marginHorizontal: -Spacing.padding.card,
    alignSelf: 'stretch',
  },
  filterConfigInlineContent: {
    paddingTop: Spacing.gap.medium,
    paddingHorizontal: 0,
    width: '100%',
  },
  inlineConfigContent: {
    gap: Spacing.gap.medium,
    width: '100%',
  },
  inlineConfigLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  modeButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
    flexWrap: 'wrap',
  },
  modeButton: {
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
  modeButtonActive: {
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
  },
  modeButtonText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  modeButtonTextActive: {
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
  ratingInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.gap.medium,
    width: '100%',
  },
  inlineInputLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.xs,
  },
  inlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.form.inputPadding,
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
  },
  inlineInputText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
    textAlign: 'left',
  },
  inlineInputPlaceholder: {
    color: Colors.gray,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: Spacing.gap.medium,
  },
  dateFieldContainer: {
    flex: 1,
    minHeight: 70,
  },
  datePickerButton: {
    minHeight: 45,
    height: 45,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.gap.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  datePickerContainer: {
    marginTop: Spacing.gap.medium,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.gap.medium,
    paddingTop: Spacing.gap.medium,
    marginTop: Spacing.gap.medium,
  },
  datePickerActionButton: {
    flex: 1,
    paddingVertical: Spacing.gap.small,
    paddingHorizontal: Spacing.gap.large,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.border,
  },
  datePickerCancelText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  datePickerConfirmText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
});

