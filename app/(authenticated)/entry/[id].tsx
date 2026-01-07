import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 300;
const HERO_TAP_MAX_HEIGHT = HERO_HEIGHT - 50; // Visible portion above the gradient

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
import { useEffect, useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useEntry, useEntryActions } from '@/lib/hooks/useEntryActions';
import { useListDetail } from '@/lib/hooks/useListEntries';
import { useListPermissions } from '@/lib/hooks/useListPermissions';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import FieldInput from '@/components/FieldInput';
import ImagePicker from '@/components/ImagePicker';
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

  // Scroll animation for hero stretch and parallax
  const scrollY = useRef(new Animated.Value(0)).current;

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
  const [ratingInput, setRatingInput] = useState<string>(''); // Raw input string for rating
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    trackScreenView('Entry Detail Screen', { entryId: id });
  }, [id]);

  // Initialize form state when entry loads
  useEffect(() => {
    if (entry) {
      setRating(entry.rating);
      setRatingInput(entry.rating !== null ? entry.rating.toString() : '');
      setFieldValues(entry.field_values || {});
      setMainImageUrl(entry.main_image_url || null);
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
    const mainImageChanged = mainImageUrl !== (entry.main_image_url || null);
    setHasChanges(ratingChanged || fieldsChanged || mainImageChanged);
  }, [rating, fieldValues, mainImageUrl, entry, isEditing]);

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
      // Check for max 1 decimal place
      const decimalPlaces = (rating.toString().split('.')[1] || '').length;
      if (decimalPlaces > 1) return false;

      if (list.rating_type === 'stars') {
        // Stars: 1 to 5 with max 1 decimal place
        if (rating < 1 || rating > 5) return false;
      } else if (list.rating_type === 'points') {
        // Points: 1 to 100 with max 1 decimal place
        const maxPoints = list.rating_config?.max || 100;
        if (rating < 1 || rating > maxPoints) return false;
      } else if (list.rating_type === 'scale') {
        // Scale: 1 to 10 with max 1 decimal place
        const maxScale = list.rating_config?.max || 10;
        if (rating < 1 || rating > maxScale) return false;
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
      setRatingInput(entry.rating !== null ? entry.rating.toString() : '');
      setFieldValues(entry.field_values || {});
      setMainImageUrl(entry.main_image_url || null);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!entry || !user || !list) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await updateEntryMutation.mutateAsync({
        entryId: entry.id,
        updates: {
          rating,
          field_values: fieldValues,
          main_image_url: mainImageUrl,
        },
        userId: user.id,
        fieldDefinitions: list.field_definitions,
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
  const hasHeroImage = !!entry.main_image_url;

  // Hero image animations - zoom in on pull down, anchored at top
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.8, 1.3], // Start at 1.3x, zoom to 1.8x when pulling down
    extrapolate: 'clamp',
  });
  const heroTapHeight = scrollY.interpolate({
    inputRange: [-100, 0, HERO_TAP_MAX_HEIGHT],
    outputRange: [HERO_TAP_MAX_HEIGHT + 100, HERO_TAP_MAX_HEIGHT, 0],
    extrapolate: 'clamp',
  });

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
      {/* Hero Image (if exists and not in edit mode) */}
      {hasHeroImage && !isEditing && (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            onPress={() => handlePhotoPress(entry.main_image_url!)}
            activeOpacity={1}
            style={styles.heroTouchable}
          >
            <Animated.Image
              source={{ uri: entry.main_image_url! }}
              style={[
                styles.heroImage,
                {
                  transform: [{ scale: heroScale }],
                  transformOrigin: 'top',
                },
              ]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Transparent tap layer so the hero remains tappable even when content overlaps */}
      {hasHeroImage && !isEditing && (
        <Animated.View style={[styles.heroTapOverlay, { height: heroTapHeight }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.heroTapTouchable}
            activeOpacity={1}
            onPress={() => handlePhotoPress(entry.main_image_url!)}
          />
        </Animated.View>
      )}

      {/* Floating Action Buttons - Always visible */}
      <View style={styles.floatingButtons} pointerEvents="box-none">
        <TouchableOpacity onPress={handleBack} style={styles.floatingBackButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        {/* Only show edit button for list owners */}
        {canEdit && (
          <View style={styles.floatingRightButtons} pointerEvents="box-none">
            {isEditing ? (
              <TouchableOpacity
                style={styles.floatingCancelButton}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.floatingEditButton}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color={Colors.black} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          hasHeroImage && !isEditing && styles.contentWithHero,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Information Section - Single unified container */}
        {hasHeroImage && !isEditing ? (
          <View style={styles.informationSection}>
            {/* Gradient Section - Top part */}
            <LinearGradient
              colors={['rgba(245, 243, 237, 0)', 'rgba(245, 243, 237, 0.7)', 'rgba(245, 243, 237, 0.95)', Colors.background]}
              locations={[0, 0.3, 0.55, 1]}
              style={styles.gradientSection}
              pointerEvents="none"
            >
              {/* Title in black within gradient */}
              {!isEditing && (
                <View style={styles.titleContainer}>
                  <Text style={styles.scrollableTitleText}>{entryName}</Text>
                </View>
              )}
            </LinearGradient>

            {/* Content Section - Bottom part with solid background */}
            <View style={styles.contentSection}>
              {/* Entry Name - Only show in edit mode */}
              {isEditing && (
                <View style={styles.entryNameContainer}>
                  <Text style={styles.nameLabel}>
                    Name
                    <Text style={styles.requiredMark}> *</Text>
                  </Text>
                  <TextInput
                    value={fieldValues.name || ''}
                    onChangeText={(text) => handleFieldChange('name', text)}
                    placeholder="Entry name"
                  />
                </View>
              )}

              {/* Main Image - Only show in edit mode */}
              {isEditing && (
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Main Image</Text>
                  <ImagePicker
                    selectedImages={mainImageUrl ? [mainImageUrl] : []}
                    onSelectImages={(images) => {
                      if (images.length > 0) {
                        setMainImageUrl(images[0]);
                      } else {
                        setMainImageUrl(null);
                      }
                    }}
                    compact
                    onPhotoPress={handlePhotoPress}
                    maxImages={1}
                  />
                </View>
              )}

              {/* Rating Section */}
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
                      {isEditing ? (
                        <TextInput
                          value={ratingInput}
                          onChangeText={(text) => {
                            // Allow empty string
                            if (text === '') {
                              setRatingInput('');
                              setRating(null);
                              return;
                            }
                            // Allow typing decimal point and one decimal digit
                            // Valid: "4", "4.", "4.5"
                            // Invalid: "4.55", "4.5.3"
                            const decimalParts = text.split('.');
                            if (decimalParts.length > 2) {
                              return; // More than one decimal point
                            }
                            if (decimalParts[1] !== undefined && decimalParts[1].length > 1) {
                              return; // More than 1 decimal digit
                            }
                            // Update the input string
                            setRatingInput(text);
                            // Allow intermediate states like "4." or final states like "4.5"
                            if (text.endsWith('.')) {
                              // Just typed decimal point, don't parse yet but keep the input
                              return;
                            }
                            const num = parseFloat(text);
                            if (!isNaN(num)) {
                              setRating(num);
                            }
                          }}
                          placeholder="1-5"
                          keyboardType="decimal-pad"
                        />
                      ) : (
                        <View style={styles.ratingDisplayContainer}>
                          <Ionicons name="star" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                          <Text style={styles.ratingDisplayValue}>
                            {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / 5` : 'No rating'}
                          </Text>
                        </View>
                      )}
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
                            // Allow empty string
                            if (text === '') {
                              setRating(null);
                              return;
                            }
                            // Check for valid decimal format (max 1 decimal place)
                            const decimalParts = text.split('.');
                            if (decimalParts.length > 2 || (decimalParts[1] && decimalParts[1].length > 1)) {
                              return; // Ignore input if more than 1 decimal place
                            }
                            const num = parseFloat(text);
                            if (!isNaN(num)) {
                              setRating(num);
                            }
                          }}
                          placeholder="1-100"
                          keyboardType="decimal-pad"
                        />
                      ) : (
                        <View style={styles.ratingDisplayContainer}>
                          <Ionicons name="trophy" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                          <Text style={styles.ratingDisplayValue}>
                            {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / ${list.rating_config.max}` : 'No rating'}
                          </Text>
                        </View>
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
                            // Allow empty string
                            if (text === '') {
                              setRating(null);
                              return;
                            }
                            // Check for valid decimal format (max 1 decimal place)
                            const decimalParts = text.split('.');
                            if (decimalParts.length > 2 || (decimalParts[1] && decimalParts[1].length > 1)) {
                              return; // Ignore input if more than 1 decimal place
                            }
                            const num = parseFloat(text);
                            if (!isNaN(num)) {
                              setRating(num);
                            }
                          }}
                          placeholder={`1-${list.rating_config.max}`}
                          keyboardType="decimal-pad"
                        />
                      ) : (
                        <View style={styles.ratingDisplayContainer}>
                          <Ionicons name="analytics" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                          <Text style={styles.ratingDisplayValue}>
                            {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / ${list.rating_config.max}` : 'No rating'}
                          </Text>
                        </View>
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
            </View>
          </View>
        ) : (
          /* No Hero - Regular Content without Gradient */
          <>
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

            {/* Main Image - Only show in edit mode */}
            {isEditing && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>Main Image</Text>
                <ImagePicker
                  selectedImages={mainImageUrl ? [mainImageUrl] : []}
                  onSelectImages={(images) => {
                    if (images.length > 0) {
                      setMainImageUrl(images[0]);
                    } else {
                      setMainImageUrl(null);
                    }
                  }}
                  compact
                  onPhotoPress={handlePhotoPress}
                  maxImages={1}
                />
              </View>
            )}

            {/* Rating Section */}
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
                    {isEditing ? (
                      <TextInput
                        value={ratingInput}
                        onChangeText={(text) => {
                          // Allow empty string
                          if (text === '') {
                            setRatingInput('');
                            setRating(null);
                            return;
                          }
                          // Allow typing decimal point and one decimal digit
                          // Valid: "4", "4.", "4.5"
                          // Invalid: "4.55", "4.5.3"
                          const decimalParts = text.split('.');
                          if (decimalParts.length > 2) {
                            return; // More than one decimal point
                          }
                          if (decimalParts[1] !== undefined && decimalParts[1].length > 1) {
                            return; // More than 1 decimal digit
                          }
                          // Update the input string
                          setRatingInput(text);
                          // Allow intermediate states like "4." or final states like "4.5"
                          if (text.endsWith('.')) {
                            // Just typed decimal point, don't parse yet but keep the input
                            return;
                          }
                          const num = parseFloat(text);
                          if (!isNaN(num)) {
                            setRating(num);
                          }
                        }}
                        placeholder="1-5"
                        keyboardType="decimal-pad"
                      />
                    ) : (
                      <View style={styles.ratingDisplayContainer}>
                        <Ionicons name="star" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                        <Text style={styles.ratingDisplayValue}>
                          {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / 5` : 'No rating'}
                        </Text>
                      </View>
                    )}
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
                          // Allow empty string
                          if (text === '') {
                            setRating(null);
                            return;
                          }
                          // Check for valid decimal format (max 1 decimal place)
                          const decimalParts = text.split('.');
                          if (decimalParts.length > 2 || (decimalParts[1] && decimalParts[1].length > 1)) {
                            return; // Ignore input if more than 1 decimal place
                          }
                          const num = parseFloat(text);
                          if (!isNaN(num)) {
                            setRating(num);
                          }
                        }}
                        placeholder="1-100"
                        keyboardType="decimal-pad"
                      />
                    ) : (
                      <View style={styles.ratingDisplayContainer}>
                        <Ionicons name="trophy" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                        <Text style={styles.ratingDisplayValue}>
                          {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / ${list.rating_config.max}` : 'No rating'}
                        </Text>
                      </View>
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
                          // Allow empty string
                          if (text === '') {
                            setRating(null);
                            return;
                          }
                          // Check for valid decimal format (max 1 decimal place)
                          const decimalParts = text.split('.');
                          if (decimalParts.length > 2 || (decimalParts[1] && decimalParts[1].length > 1)) {
                            return; // Ignore input if more than 1 decimal place
                          }
                          const num = parseFloat(text);
                          if (!isNaN(num)) {
                            setRating(num);
                          }
                        }}
                        placeholder={`1-${list.rating_config.max}`}
                        keyboardType="decimal-pad"
                      />
                    ) : (
                      <View style={styles.ratingDisplayContainer}>
                        <Ionicons name="analytics" size={16} color={Colors.black} style={styles.ratingDisplayIcon} />
                        <Text style={styles.ratingDisplayValue}>
                          {rating !== null ? `${rating % 1 === 0 ? rating : rating.toFixed(1)} / ${list.rating_config.max}` : 'No rating'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Additional Fields */}
            {isEditing ? (
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
              (() => {
                const customFields = list.field_definitions?.filter((field) => field.id !== '1') || [];
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
          </>
        )}
      </Animated.ScrollView>

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
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    zIndex: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTouchable: {
    width: '100%',
    height: '100%',
  },
  heroTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  heroTapTouchable: {
    width: '100%',
    height: '100%',
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
  floatingRightButtons: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
  },
  floatingEditButton: {
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
  floatingCancelButton: {
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
    fontFamily: 'Muli_700Bold',
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
    paddingBottom: 40,
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: 120, // Space for floating buttons when no hero (60 top + 40 button height + 20 gap)
  },
  contentWithHero: {
    paddingTop: HERO_TAP_MAX_HEIGHT, // Content starts lower to completely hide the border
    paddingHorizontal: 0, // Remove horizontal padding when hero exists
  },
  informationSection: {
    // Single unified container for gradient + content
  },
  gradientSection: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: 70, // Reduced space for smaller gradient section
    paddingBottom: Spacing.gap.medium, // Reduced space at bottom of gradient
  },
  titleContainer: {
    // Container for title within gradient
  },
  scrollableTitleText: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
  contentSection: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding.horizontal,
  },
  entryNameContainer: {
    marginBottom: Spacing.gap.small,
  },
  nameLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  entryName: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  ratingDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rating,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  ratingDisplayIcon: {
    marginRight: 6,
  },
  ratingDisplayValue: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_700Bold',
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
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
  },
  fieldValue: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
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
    fontFamily: 'Muli_400Regular',
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
    fontFamily: 'Muli_400Regular',
    color: Colors.error,
  },
});

