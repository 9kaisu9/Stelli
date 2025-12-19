import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import { FieldDefinition } from '@/constants/types';
import TextInput from '@/components/TextInput';
import StarRating from '@/components/StarRating';
import ImagePicker from '@/components/ImagePicker';

interface FieldInputProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
  onPhotoPress?: (uri: string) => void;
}

export default function FieldInput({ field, value, onChange, readonly = false, onPhotoPress }: FieldInputProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateValue, setTempDateValue] = useState<Date | null>(null);

  // TEXT INPUT
  if (field.type === 'text') {
    if (readonly) {
      return <Text style={styles.readonlyText}>{value || 'Not set'}</Text>;
    }
    return (
      <TextInput
        value={value?.toString() || ''}
        onChangeText={onChange}
        placeholder={`Enter ${field.name.toLowerCase()}`}
        editable={!readonly}
      />
    );
  }

  // NUMBER INPUT
  if (field.type === 'number') {
    if (readonly) {
      return <Text style={styles.readonlyText}>{value !== null && value !== undefined ? value.toString() : 'Not set'}</Text>;
    }
    return (
      <TextInput
        value={value?.toString() || ''}
        onChangeText={(text) => {
          // Allow empty string
          if (text === '') {
            onChange(null);
            return;
          }

          // Validate format: optional minus, digits, optional decimal point and digits
          const validFormat = /^-?\d*\.?\d*$/;
          if (!validFormat.test(text)) {
            return; // Don't update if invalid format
          }

          // Store the raw text if it ends with a decimal point or is incomplete
          // This allows typing "5." without immediately converting to 5
          if (text.endsWith('.') || text === '-' || text === '-.') {
            onChange(text);
            return;
          }

          const num = parseFloat(text);
          onChange(isNaN(num) ? null : num);
        }}
        placeholder={`Enter ${field.name.toLowerCase()}`}
        keyboardType="decimal-pad"
        editable={!readonly}
      />
    );
  }

  // DATE INPUT
  if (field.type === 'date') {
    const dateValue = value ? new Date(value) : new Date();
    const formattedDate = value ? dateValue.toLocaleDateString() : '';

    if (readonly) {
      return <Text style={styles.readonlyText}>{formattedDate || 'Not set'}</Text>;
    }

    const handleOpenPicker = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTempDateValue(value ? new Date(value) : new Date());
      setShowDatePicker(true);
    };

    const handleConfirmDate = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (tempDateValue) {
        onChange(tempDateValue.toISOString());
      }
      setShowDatePicker(false);
      setTempDateValue(null);
    };

    const handleCancelDate = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowDatePicker(false);
      setTempDateValue(null);
    };

    const handleClearDate = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(null);
    };

    return (
      <View>
        <View style={styles.dateButtonRow}>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1 }]}
            onPress={handleOpenPicker}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateButtonText, !value && styles.dateButtonPlaceholder]}>
              {formattedDate || 'Select date'}
            </Text>
          </TouchableOpacity>

          {value && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={handleClearDate}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={tempDateValue || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempDateValue(selectedDate);
                }
              }}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={handleCancelDate}
                activeOpacity={0.7}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerConfirmButton]}
                onPress={handleConfirmDate}
                activeOpacity={0.7}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // DROPDOWN (single select)
  if (field.type === 'dropdown') {
    if (readonly) {
      return <Text style={styles.readonlyText}>{value || 'Not set'}</Text>;
    }

    return (
      <View style={styles.optionsContainer}>
        {field.options?.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              value === option && styles.optionButtonActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Toggle selection - if already selected, deselect it
              onChange(value === option ? null : option);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionButtonText,
                value === option && styles.optionButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // MULTI-SELECT
  if (field.type === 'multi-select') {
    const selectedValues = Array.isArray(value) ? value : [];

    if (readonly) {
      return (
        <Text style={styles.readonlyText}>
          {selectedValues.length > 0 ? selectedValues.join(', ') : 'Not set'}
        </Text>
      );
    }

    return (
      <View style={styles.optionsContainer}>
        {field.options?.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isSelected) {
                  onChange(selectedValues.filter((v) => v !== option));
                } else {
                  onChange([...selectedValues, option]);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  isSelected && styles.optionButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // YES/NO
  if (field.type === 'yes-no') {
    if (readonly) {
      return (
        <Text style={styles.readonlyText}>
          {value === true ? 'Yes' : value === false ? 'No' : 'Not set'}
        </Text>
      );
    }

    return (
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            value === true && styles.yesNoButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(true);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.yesNoButtonText,
              value === true && styles.yesNoButtonTextActive,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.yesNoButton,
            value === false && styles.yesNoButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(false);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.yesNoButtonText,
              value === false && styles.yesNoButtonTextActive,
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // RATING
  if (field.type === 'rating') {
    // Use field's ratingConfig if available, otherwise default to stars (5 max, 0.5 step)
    const max = field.ratingConfig?.max || 5;
    const step = field.ratingConfig?.step || 0.5;

    if (readonly) {
      // In readonly mode, show star rating for star-based fields
      if (max <= 10 && step === 0.5) {
        return (
          <StarRating
            rating={value || 0}
            size="large"
            readonly={true}
            color={Colors.black}
          />
        );
      }
      return (
        <Text style={styles.readonlyText}>
          {value !== null && value !== undefined ? `${value} / ${max}` : 'Not set'}
        </Text>
      );
    }

    // For star rating (max 5 or 10, step 0.5)
    if (max <= 10 && step === 0.5) {
      return (
        <StarRating
          rating={value || 0}
          size="large"
          readonly={false}
          onRatingChange={onChange}
          color={Colors.black}
        />
      );
    }

    // For numeric rating (points/scale)
    return (
      <TextInput
        value={value?.toString() || ''}
        onChangeText={(text) => {
          // Allow empty string, digits, minus sign, and one decimal point
          if (text === '' || text === '-') {
            onChange(null);
            return;
          }

          // Validate format: optional minus, digits, optional decimal point and digits
          const validFormat = /^-?\d*\.?\d*$/;
          if (!validFormat.test(text)) {
            return; // Don't update if invalid format
          }

          const num = parseFloat(text);
          onChange(isNaN(num) ? null : num);
        }}
        placeholder={`1-${max}`}
        keyboardType="decimal-pad"
        editable={!readonly}
      />
    );
  }

  // PHOTOS INPUT
  if (field.type === 'photos') {
    // Value for photos field is an array of URIs
    const imageUris = Array.isArray(value) ? value : [];

    if (readonly) {
      // In readonly mode, only display images, no add/remove functionality
      if (imageUris.length === 0) {
        return <Text style={styles.readonlyText}>No photos</Text>;
      }

      const handlePhotoPress = (uri: string) => {
        console.log('📸 Photo pressed:', uri);
        console.log('📸 onPhotoPress handler exists:', !!onPhotoPress);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPhotoPress) {
          console.log('📸 Calling onPhotoPress with uri:', uri);
          onPhotoPress(uri);
        } else {
          console.log('📸 No onPhotoPress handler provided');
        }
      };

      return (
        <ScrollView horizontal contentContainerStyle={styles.imageScrollContainerReadonly} showsHorizontalScrollIndicator={false}>
          {imageUris.map((uri, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageThumbnailContainerReadonly}
              onPress={() => handlePhotoPress(uri)}
              activeOpacity={0.7}
            >
              <Image source={{ uri }} style={styles.imageThumbnail} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    return (
      <ImagePicker
        selectedImages={imageUris}
        onSelectImages={onChange}
        compact
        onPhotoPress={onPhotoPress}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  readonlyText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  dateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    paddingHorizontal: Spacing.form.inputPadding,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  dateButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  dateButtonPlaceholder: {
    color: Colors.gray,
  },
  clearDateButton: {
    padding: Spacing.gap.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    marginTop: Spacing.gap.medium,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.medium,
    padding: Spacing.gap.medium,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.gap.medium,
    marginTop: Spacing.gap.medium,
    marginHorizontal: -Spacing.gap.medium,
    paddingHorizontal: Spacing.gap.medium,
    paddingTop: Spacing.gap.medium,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  datePickerButton: {
    paddingVertical: Spacing.gap.small,
    paddingHorizontal: Spacing.gap.large,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  datePickerConfirmButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.border,
  },
  datePickerCancelText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  datePickerConfirmText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.gap.small,
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
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
  },
  optionButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  optionButtonTextActive: {
    color: Colors.black,
    fontFamily: 'Nunito_700Bold',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: Spacing.gap.medium,
  },
  yesNoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.small,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.gap.medium,
  },
  yesNoButtonActive: {
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
  },
  yesNoButtonText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  yesNoButtonTextActive: {
    color: Colors.black,
    fontFamily: 'Nunito_700Bold',
  },
  imageScrollContainerReadonly: {
    flexDirection: 'row',
    gap: Spacing.gap.small,
  },
  imageThumbnailContainerReadonly: {
    // Styles for the container in readonly mode, if different
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
