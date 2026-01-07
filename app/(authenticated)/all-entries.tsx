import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAllEntries } from '@/lib/hooks/useAllEntries';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius } from '@/constants/styleGuide';
import RecentEntryCard from '@/components/RecentEntryCard';
import { trackScreenView } from '@/lib/posthog';

export default function AllEntriesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: entries, isLoading, error } = useAllEntries(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    trackScreenView('All Entries Screen');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['allEntries', user?.id] });
    setRefreshing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading entries...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Colors.gray} />
        <Text style={styles.errorText}>Failed to load entries</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            queryClient.invalidateQueries({ queryKey: ['allEntries', user?.id] });
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main view
  return (
    <View style={CommonStyles.screenContainer}>
      {/* Floating Back Button */}
      <View style={styles.floatingButtons} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
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
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>All Entries</Text>
        </View>

        {/* Empty state */}
        {(!entries || entries.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={80} color={Colors.gray} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first entry to get started!
            </Text>
          </View>
        )}

        {/* Entries List */}
        {entries && entries.length > 0 && (
          <View style={styles.entriesContainer}>
            <Text style={styles.entriesCount}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
            <View style={styles.entriesList}>
              {entries.map((entry, index) => (
                <RecentEntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}` as any)}
                  showDivider={index < entries.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 110, // Space for floating button (60 top + 40 height + 10 margin)
    paddingBottom: Spacing.gap.xl,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding.horizontal,
  },
  floatingButtons: {
    position: 'absolute',
    top: 60, // Below status bar
    left: Spacing.screenPadding.horizontal,
    zIndex: 10,
  },
  floatingBackButton: {
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
  titleSection: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    marginBottom: Spacing.gap.medium,
  },
  pageTitle: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  entriesContainer: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
  },
  entriesCount: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.medium,
  },
  entriesList: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.gap.xl,
    paddingHorizontal: Spacing.screenPadding.horizontal,
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
    paddingHorizontal: Spacing.gap.large,
    height: 48,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
});

