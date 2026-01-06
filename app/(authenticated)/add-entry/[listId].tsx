import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useListDetail } from '@/lib/hooks/useListEntries';
import { useCreateEntry } from '@/lib/hooks/useCreateEntry';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import FieldInput from '@/components/FieldInput';
import ImagePicker from '@/components/ImagePicker';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import PhotoModal from '@/components/PhotoModal';
import { trackScreenView, trackEvent } from '@/lib/posthog';

export default function AddEntryScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const { data: list, isLoading: listLoading, error: listError } = useListDetail(listId);
  const { createEntryMutation } = useCreateEntry();

  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [ratingInput, setRatingInput] = useState<string>(''); // Raw input string for rating
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    trackScreenView('Add Entry Screen', { listId });
  }, [listId]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

    const isFormValid = () => {

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

  

      // Check required custom fields

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

  const handleSave = async () => {
    if (!list || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await createEntryMutation.mutateAsync({
        list_id: listId,
        user_id: user.id,
        rating,
        field_values: fieldValues,
        main_image_url: mainImageUrl,
        fieldDefinitions: list.field_definitions,
      });

      trackEvent('Entry Created', { listId, entryName: fieldValues['1'] });
      setShowSuccessSheet(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error creating entry:', error);
      setShowErrorSheet(true);
    }
  };

  if (listLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (listError || !list) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.gray} />
        <Text style={styles.errorText}>List not found</Text>
        <Button label="Go Back" variant="secondary" onPress={handleBack} />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Add Entry</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Entry Name */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>
            Name
            <Text style={styles.requiredMark}> *</Text>
          </Text>
          <TextInput
            value={fieldValues.name || ''}
            onChangeText={(text) => handleFieldChange('name', text)}
            placeholder="Entry name"
          />
        </View>

        {/* Main Image */}
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
            onPhotoPress={setSelectedPhotoUri}
            maxImages={1}
          />
        </View>

        {/* Rating Section */}
        {list.rating_type !== 'none' && (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>
              Rating
              <Text style={styles.requiredMark}> *</Text>
            </Text>
            {list.rating_type === 'stars' && (
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
            )}
            {list.rating_type === 'points' && (
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
            )}
            {list.rating_type === 'scale' && (
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
                placeholder={`1-${list.rating_config?.max || 10}`}
                keyboardType="decimal-pad"
              />
            )}
          </View>
        )}

        {/* Additional Fields - Exclude the Name field (id: '1') */}
        {list.field_definitions
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
                onPhotoPress={setSelectedPhotoUri}
              />
            </View>
          ))}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label={createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
            variant="primary"
            onPress={handleSave}
            disabled={!isFormValid() || createEntryMutation.isPending}
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Success Message */}
      <CustomActionSheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        title="Entry created successfully"
        options={[
          {
            label: 'OK',
            icon: 'checkmark-circle-outline',
            onPress: () => {},
          },
        ]}
      />

      {/* Error Message */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title="Failed to create entry"
        options={[
          {
            label: 'OK',
            icon: 'close-circle-outline',
            onPress: () => {},
          },
        ]}
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
  headerTitle: {
    fontSize: Typography.fontSize.h3,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 40,
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
  requiredMark: {
    color: Colors.error,
  },
  actions: {
    marginTop: Spacing.gap.section,
  },
});
