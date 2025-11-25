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
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useEntry, useEntryActions } from '@/lib/hooks/useEntryActions';
import { useListDetail } from '@/lib/hooks/useListEntries';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import StarRating from '@/components/StarRating';
import TextInput from '@/components/TextInput';
import { trackScreenView, trackEvent } from '@/lib/posthog';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const { data: entry, isLoading: entryLoading, error: entryError } = useEntry(id);
  const { data: list, isLoading: listLoading } = useListDetail(entry?.list_id);
  const { updateEntryMutation, deleteEntryMutation } = useEntryActions();

  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    trackScreenView('Entry Detail Screen', { entryId: id });
  }, [id]);

  // Initialize form state when entry loads
  useEffect(() => {
    if (entry) {
      setRating(entry.rating);
      setFieldValues(entry.field_values || {});
      setHasChanges(false);
    }
  }, [entry]);

  // Track changes
  useEffect(() => {
    if (!entry || !isEditing) {
      setHasChanges(false);
      return;
    }

    const ratingChanged = rating !== entry.rating;
    const fieldsChanged = JSON.stringify(fieldValues) !== JSON.stringify(entry.field_values || {});
    setHasChanges(ratingChanged || fieldsChanged);
  }, [rating, fieldValues, entry, isEditing]);

  // Validate required fields
  const validateRequiredFields = () => {
    if (!list) return false;

    // Check name field (always required)
    if (!fieldValues.name || fieldValues.name.trim() === '') {
      return false;
    }

    // Check required custom fields
    for (const field of list.field_definitions || []) {
      if (field.required && !fieldValues[field.id]) {
        return false;
      }
    }

    return true;
  };

  const canSave = hasChanges && validateRequiredFields();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset to original values
    if (entry) {
      setRating(entry.rating);
      setFieldValues(entry.field_values || {});
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!entry) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await updateEntryMutation.mutateAsync({
        entryId: entry.id,
        updates: {
          rating,
          field_values: fieldValues,
        },
      });

      trackEvent('Entry Updated', { entryId: entry.id, listId: entry.list_id });
      setIsEditing(false);
      Alert.alert('Success', 'Entry updated successfully');
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };

  const handleDelete = () => {
    if (!entry) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntryMutation.mutateAsync(entry.id);
              trackEvent('Entry Deleted', { entryId: entry.id, listId: entry.list_id });
              router.back();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  if (entryLoading || listLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (entryError || !entry || !list) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.gray} />
        <Text style={styles.errorText}>Entry not found</Text>
        <Button label="Go Back" variant="secondary" onPress={handleBack} />
      </View>
    );
  }

  const entryName = fieldValues.name || 'Unnamed Entry';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <View style={styles.headerRightButtons}>
            {isEditing ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color={Colors.black} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Entry Name */}
        <View style={styles.entryNameContainer}>
          {isEditing ? (
            <>
              <Text style={styles.nameLabel}>Name</Text>
              <TextInput
                value={fieldValues.name || ''}
                onChangeText={(text) => handleFieldChange('name', text)}
                placeholder="Entry name"
              />
            </>
          ) : (
            <Text style={styles.entryName}>{entryName}</Text>
          )}
        </View>

        {/* Rating Section - Outside Card */}
        <View style={styles.ratingSection}>
          {list.rating_type === 'stars' && (
            <View style={styles.ratingField}>
              {isEditing && <Text style={styles.ratingLabel}>Rating</Text>}
              <StarRating
                rating={rating || 0}
                size="large"
                readonly={!isEditing}
                onRatingChange={isEditing ? setRating : undefined}
                color={Colors.black}
              />
            </View>
          )}
          {list.rating_type === 'points' && (
            <View style={styles.ratingField}>
              {isEditing && <Text style={styles.ratingLabel}>Rating</Text>}
              {isEditing ? (
                <TextInput
                  value={rating?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    setRating(isNaN(num) ? null : num);
                  }}
                  placeholder="Enter points"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.ratingDisplayValue}>
                  {rating !== null ? `${rating} / ${list.rating_config.max}` : 'No rating'}
                </Text>
              )}
            </View>
          )}
          {list.rating_type === 'scale' && (
            <View style={styles.ratingField}>
              {isEditing && <Text style={styles.ratingLabel}>Rating</Text>}
              {isEditing ? (
                <TextInput
                  value={rating?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    setRating(isNaN(num) ? null : num);
                  }}
                  placeholder={`1-${list.rating_config.max}`}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.ratingDisplayValue}>
                  {rating !== null ? `${rating} / ${list.rating_config.max}` : 'No rating'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Additional Fields */}
        {isEditing ? (
          // Edit mode: Fields without container
          list.field_definitions
            ?.sort((a, b) => a.order - b.order)
            .map((field) => (
              <View key={field.id} style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  {field.name}
                  {field.required && <Text style={styles.requiredMark}> *</Text>}
                </Text>
                <TextInput
                  value={fieldValues[field.id]?.toString() || ''}
                  onChangeText={(text) => handleFieldChange(field.id, text)}
                  placeholder={`Enter ${field.name.toLowerCase()}`}
                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                />
              </View>
            ))
        ) : (
          // View mode: Fields in white container with dividers
          list.field_definitions && list.field_definitions.length > 0 && (
            <View style={styles.fieldsContainer}>
              {list.field_definitions
                .sort((a, b) => a.order - b.order)
                .map((field, index) => (
                  <View key={field.id}>
                    {index > 0 && <View style={styles.fieldDivider} />}
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldContent}>
                        <Text style={styles.fieldLabel}>
                          {field.name}
                          {field.required && <Text style={styles.requiredMark}> *</Text>}
                        </Text>
                        <Text style={styles.fieldValue}>
                          {fieldValues[field.id] || 'Not set'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray} />
            <Text style={styles.metadataText}>
              Created: {formatDate(entry.created_at)}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Ionicons name="time-outline" size={16} color={Colors.gray} />
            <Text style={styles.metadataText}>
              Updated: {formatDate(entry.updated_at)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.editActions}>
            <View style={styles.editButtonRow}>
              <Button
                label={updateEntryMutation.isPending ? 'Saving...' : 'Save Changes'}
                variant="primary"
                onPress={handleSave}
                disabled={updateEntryMutation.isPending || !hasChanges}
                fullWidth
              />
            </View>
            <View style={styles.deleteButtonContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>Delete Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.screenPadding.horizontal,
    gap: Spacing.gap.large,
  },
  errorText: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
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
  headerRightButtons: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.button.neutral,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 40,
  },
  entryNameContainer: {
    marginBottom: Spacing.gap.small,
  },
  nameLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  entryName: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  ratingSection: {
    marginBottom: Spacing.gap.large,
  },
  ratingField: {
    gap: Spacing.gap.small,
  },
  ratingLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  ratingDisplayValue: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  fieldsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.gap.section,
  },
  fieldRow: {
    paddingHorizontal: Spacing.padding.inList,
    paddingVertical: Spacing.gap.medium,
  },
  fieldContent: {
    gap: Spacing.gap.small,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  fieldSection: {
    marginBottom: Spacing.gap.large,
    gap: Spacing.gap.small,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  fieldValue: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  requiredMark: {
    color: Colors.error,
  },
  metadata: {
    marginTop: Spacing.gap.section,
    marginBottom: Spacing.gap.large,
    gap: Spacing.gap.small,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  metadataText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  editActions: {
    gap: Spacing.gap.medium,
    marginTop: Spacing.gap.section,
  },
  editButtonRow: {
    width: '100%',
  },
  deleteButtonContainer: {
    marginTop: Spacing.gap.section,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
    paddingVertical: Spacing.gap.medium,
    paddingHorizontal: Spacing.gap.large,
  },
  deleteButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.error,
  },
});
