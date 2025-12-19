import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (obj1 && typeof obj1 === 'object' && obj2 && typeof obj2 === 'object') {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

    for (const key in obj1) {
      if (Object.prototype.hasOwnProperty.call(obj1, key)) {
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
      }
    }
    return true;
  }
  return false;
}
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useEntry, useEntryActions } from '@/lib/hooks/useEntryActions';
import { useListDetail } from '@/lib/hooks/useListEntries';
import { useListPermissions } from '@/lib/hooks/useListPermissions';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import StarRating from '@/components/StarRating';
import TextInput from '@/components/TextInput';
import FieldInput from '@/components/FieldInput';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import PhotoModal from '@/components/PhotoModal';
import { trackScreenView, trackEvent } from '@/lib/posthog';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showCannotEditSheet, setShowCannotEditSheet] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  const handlePhotoPress = (uri: string) => {
    console.log('🖼️ Entry screen: Photo press handler called with uri:', uri);
    setSelectedPhotoUri(uri);
    console.log('🖼️ Entry screen: selectedPhotoUri state updated to:', uri);
  };

  useEffect(() => {
    if (selectedPhotoUri) {
      console.log('🖼️ Entry screen: selectedPhotoUri changed to:', selectedPhotoUri);
    }
  }, [selectedPhotoUri]);

  const { data: entry, isLoading: entryLoading, error: entryError } = useEntry(id);
  const { data: list, isLoading: listLoading } = useListDetail(entry?.list_id);
  const { data: permission, isLoading: permissionLoading } = useListPermissions(entry?.list_id);
  const { updateEntryMutation, deleteEntryMutation } = useEntryActions();

  // Permission checks - owners and users with 'edit' permission can edit
  const isOwner = permission === 'owner';
  const canEdit = isOwner || permission === 'edit'; // Owners and edit permission can edit

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
    const fieldsChanged = !deepEqual(fieldValues, entry.field_values || {});
    setHasChanges(ratingChanged || fieldsChanged);
  }, [rating, fieldValues, entry, isEditing]);

  // Validate required fields
  const validateRequiredFields = () => {
    if (!list) return false;

    // Check name field (always required)
    if (!fieldValues.name || fieldValues.name.trim() === '') {
      return false;
    }

    // Check rating (required if rating type is not 'none')
    if (list.rating_type !== 'none' && (rating === null || rating === undefined || rating === 0)) {
      return false;
    }

    // Validate rating bounds based on rating type
    if (rating !== null && rating !== undefined) {
      const ratingConfig = list.rating_config || { max: 5, step: 0.5 };
      if (list.rating_type === 'stars') {
        // Stars: 0.5 to 5 in increments of 0.5
        if (rating < 0.5 || rating > 5) return false;
      } else if (list.rating_type === 'points') {
        // Points: 1 to 100 in increments of 1
        if (rating < 1 || rating > 100 || rating % 1 !== 0) return false;
      } else if (list.rating_type === 'scale') {
        // Scale: 1 to 10 in increments of 1
        if (rating < 1 || rating > 10 || rating % 1 !== 0) return false;
      }
    }

    // Check required custom fields (exclude the Name field with id '1')
    for (const field of list.field_definitions || []) {
      if (field.id !== '1' && field.required) {
        const value = fieldValues[field.id];

        if (field.type === 'yes-no') {
          if (value === null || value === undefined) return false;
        } else if (field.type === 'multi-select') {
          if (!value || !Array.isArray(value) || value.length === 0) return false;
        } else {
          if (value === null || value === undefined || String(value).trim() === '') {
            return false;
          }
        }
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
    if (!canEdit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowCannotEditSheet(true);
      return;
    }
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
        fieldDefinitions: list.field_definitions,
        userId: user.id,
      });

      trackEvent('Entry Updated', { entryId: entry.id, listId: entry.list_id });
      setIsEditing(false);
      setShowSuccessSheet(true);
    } catch (error) {
      console.error('Error updating entry:', error);
      setErrorMessage('Failed to update entry');
      setShowErrorSheet(true);
    }
  };

  const handleDelete = () => {
    if (!entry) return;
    setShowDeleteSheet(true);
  };

  const handleConfirmDelete = async () => {
    if (!entry) return;

    try {
      await deleteEntryMutation.mutateAsync(entry.id);
      trackEvent('Entry Deleted', { entryId: entry.id, listId: entry.list_id });
      router.back();
    } catch (error) {
      console.error('Error deleting entry:', error);
      setErrorMessage('Failed to delete entry');
      setShowErrorSheet(true);
    }
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

  // Action Sheet Options
  const cannotEditOptions: ActionSheetOption[] = [
    {
      label: 'OK',
      icon: 'checkmark-circle-outline',
      onPress: () => {},
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

  const deleteOptions: ActionSheetOption[] = [
    {
      label: 'Delete',
      icon: 'trash-outline',
      onPress: handleConfirmDelete,
      destructive: true,
    },
  ];

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
          {/* Only show edit button for list owners */}
          {canEdit && (
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
          )}
        </View>

        {/* Entry Name */}
        <View style={styles.entryNameContainer}>
          {isEditing ? (
            <>
              <Text style={styles.nameLabel}>
                Name
                <Text style={styles.requiredMark}> *</Text>
              </Text>
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
        {list.rating_type !== 'none' && (
          <View style={styles.ratingSection}>
            {list.rating_type === 'stars' && (
              <View style={styles.ratingField}>
                {isEditing && (
                  <Text style={styles.ratingLabel}>
                    Rating
                    <Text style={styles.requiredMark}> *</Text>
                  </Text>
                )}
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
                {isEditing && (
                  <Text style={styles.ratingLabel}>
                    Rating
                    <Text style={styles.requiredMark}> *</Text>
                  </Text>
                )}
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
                {isEditing && (
                  <Text style={styles.ratingLabel}>
                    Rating
                    <Text style={styles.requiredMark}> *</Text>
                  </Text>
                )}
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
        )}

        {/* Additional Fields - Exclude the Name field (id: '1') */}
        {isEditing ? (
          // Edit mode: Fields without container
          list.field_definitions
            ?.filter((field) => field.id !== '1')
            ?.sort((a, b) => a.order - b.order)
            .map((field) => (
              <View key={field.id} style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  {field.name}
                  {field.required && <Text style={styles.requiredMark}> *</Text>}
                </Text>
                <FieldInput
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              </View>
            ))
        ) : (
          // View mode: Fields in a container with white background and dividers
          (() => {
            const customFields = list.field_definitions?.filter((field) => field.id !== '1') || [];
            // Filter out fields with no value
            const fieldsWithValues = customFields.filter((field) => {
              const value = fieldValues[field.id];
              if (value === null || value === undefined) return false;
              if (typeof value === 'string' && value.trim() === '') return false;
              if (Array.isArray(value) && value.length === 0) return false;
              return true;
            });

            return (
              fieldsWithValues.length > 0 && (
                <View style={styles.fieldsContainer}>
                  {fieldsWithValues
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <View key={field.id}>
                        <View style={styles.fieldRow}>
                          <Text style={styles.fieldLabel}>
                            {field.name}
                          </Text>
                          <FieldInput
                            field={field}
                            value={fieldValues[field.id]}
                            onChange={() => {}}
                            readonly={true}
                            onPhotoPress={handlePhotoPress}
                          />
                        </View>
                        {index < fieldsWithValues.length - 1 && (
                          <View style={styles.fieldDivider} />
                        )}
                      </View>
                    ))}
                </View>
              )
            );
          })()
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
                disabled={updateEntryMutation.isPending || !canSave}
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

      {/* Cannot Edit Message */}
      <CustomActionSheet
        visible={showCannotEditSheet}
        onClose={() => setShowCannotEditSheet(false)}
        title="Cannot Edit"
        options={cannotEditOptions}
      />

      {/* Success Message */}
      <CustomActionSheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        title="Entry updated successfully"
        options={successOptions}
      />

      {/* Error Message */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Error'}
        options={errorOptions}
      />

      {/* Delete Confirmation */}
      <CustomActionSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        title="Delete this entry?\n\nThis action cannot be undone."
        options={deleteOptions}
      />

      {/* Photo Modal */}
      {selectedPhotoUri && (
        <PhotoModal
          visible={!!selectedPhotoUri}
          photoUri={selectedPhotoUri}
          onClose={() => setSelectedPhotoUri(null)}
        />
      )}
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.gap.section,
    overflow: 'hidden',
  },
  fieldRow: {
    paddingHorizontal: Spacing.padding.card,
    paddingVertical: Spacing.gap.medium,
    backgroundColor: Colors.white,
    gap: Spacing.gap.small,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },
  fieldSection: {
    marginBottom: Spacing.gap.medium,
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
