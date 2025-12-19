import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions as RNDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useListDetail } from '@/lib/hooks/useListEntries';
import { useFieldMigration, analyzeFieldChanges } from '@/lib/hooks/useFieldMigration';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import IconPicker from '@/components/IconPicker';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import { trackScreenView, trackEvent } from '@/lib/posthog';
import { FieldDefinition, FieldType } from '@/constants/types';

type RatingType = 'stars' | 'points' | 'scale' | 'none';

const SCREEN_WIDTH = RNDimensions.get('window').width;

interface AnimatedStepDotProps {
  step: number;
  scrollPosition: Animated.SharedValue<number>;
}

function AnimatedStepDot({ step, scrollPosition }: AnimatedStepDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollPosition.value - step);
    const widthProgress = Math.max(0, Math.min(1, 1 - distance));

    let colorProgress;
    if (scrollPosition.value >= step) {
      colorProgress = 1;
    } else if (scrollPosition.value >= step - 1) {
      colorProgress = scrollPosition.value - (step - 1);
    } else {
      colorProgress = 0;
    }

    return {
      width: 10 + (widthProgress * 14),
      backgroundColor: interpolateColor(
        colorProgress,
        [0, 1],
        [Colors.lightGray, Colors.primary]
      ),
    };
  });

  return <Animated.View style={[styles.stepDot, animatedStyle]} />;
}

interface AnimatedFieldCardProps {
  field: FieldDefinition;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onFieldChange: (id: string, updates: Partial<FieldDefinition>) => void;
  newOptionInput: string;
  onNewOptionInputChange: (text: string) => void;
}

function AnimatedFieldCard({
  field,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onFieldChange,
  newOptionInput,
  onNewOptionInputChange,
}: AnimatedFieldCardProps) {
  const height = useSharedValue(isExpanded ? 1 : 0);
  const opacity = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
    opacity.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
  }, [isExpanded]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    maxHeight: height.value === 0 ? 0 : 2000,
    overflow: 'hidden',
  }));

  const fieldDisplayName = field.name.trim() || `Field #${index + 1}`;

  return (
    <View style={styles.customFieldCard}>
      {!isExpanded ? (
        <TouchableOpacity
          style={styles.fieldCollapsibleHeader}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.fieldCollapsibleHeaderContent}>
            <Text style={styles.fieldCollapsibleHeaderText}>
              {fieldDisplayName}
            </Text>
            <View style={styles.fieldHeaderActions}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.text.primary} />
              </TouchableOpacity>
              <Ionicons
                name="chevron-down"
                size={24}
                color={Colors.text.primary}
              />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Field Name</Text>
            <View style={styles.fieldHeaderActions}>
              <TouchableOpacity
                onPress={onRemove}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-up"
                  size={24}
                  color={Colors.text.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={animatedContentStyle}>
            <View style={styles.fieldInputBlock}>
              <TextInput
                value={field.name}
                onChangeText={(text) => onFieldChange(field.id, { name: text })}
                placeholder="e.g., Location, Genre, Price"
              />
            </View>

            <View style={styles.fieldTypeRow}>
              <Text style={styles.fieldLabel}>Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fieldTypeScrollContent}
              >
                {(['text', 'number', 'date', 'dropdown', 'multi-select', 'yes-no', 'rating', 'photos'] as FieldType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.fieldTypeButton,
                      field.type === type && styles.fieldTypeButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onFieldChange(field.id, { type });
                    }}
                  >
                    <Text
                      style={[
                        styles.fieldTypeButtonText,
                        field.type === type && styles.fieldTypeButtonTextActive,
                      ]}
                    >
                      {type === 'multi-select' ? 'Multi' : type === 'yes-no' ? 'Yes/No' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {(field.type === 'dropdown' || field.type === 'multi-select') && (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Options</Text>
                </View>

                {field.options && field.options.length > 0 && (
                  <View style={styles.optionsList}>
                    {field.options.map((option, optIndex) => (
                      <View key={optIndex} style={styles.optionChip}>
                        <Text style={styles.optionChipText}>{option}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const newOptions = field.options?.filter((_, i) => i !== optIndex) || [];
                            onFieldChange(field.id, { options: newOptions });
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={20} color={Colors.gray} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TextInput
                  value={newOptionInput}
                  onChangeText={onNewOptionInputChange}
                  placeholder="Type option and press Enter"
                  onSubmitEditing={() => {
                    const newOption = newOptionInput.trim();
                    if (newOption) {
                      const currentOptions = field.options || [];
                      onFieldChange(field.id, { options: [...currentOptions, newOption] });
                      onNewOptionInputChange('');
                    }
                  }}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.checkboxRow, styles.checkboxSpacing]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFieldChange(field.id, { required: !field.required });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={field.required ? 'checkbox' : 'square-outline'}
                size={24}
                color={Colors.text.primary}
              />
              <Text style={styles.checkboxLabel}>Required field</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

export default function EditListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pagerRef = useRef<PagerView>(null);

  const { data: list, isLoading } = useListDetail(id);
  const { migrateEntriesMutation } = useFieldMigration();

  const [currentStep, setCurrentStep] = useState(0);
  const scrollPosition = useSharedValue(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [ratingType, setRatingType] = useState<RatingType>('stars');
  const [customFields, setCustomFields] = useState<FieldDefinition[]>([]);
  const [originalFields, setOriginalFields] = useState<FieldDefinition[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [showValidationErrorSheet, setShowValidationErrorSheet] = useState(false);
  const [showFieldChangesWarning, setShowFieldChangesWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldChangesMessage, setFieldChangesMessage] = useState('');

  useEffect(() => {
    trackScreenView('Edit List Screen', { listId: id });
  }, [id]);

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
      setSelectedIcon(list.icon);
      setRatingType((list.rating_type || 'stars') as RatingType);

      // Extract custom fields (all fields except the first "Name" field)
      const fields = (list.field_definitions as FieldDefinition[]) || [];
      const customFieldsOnly = fields.filter(f => f.id !== '1');
      setCustomFields(customFieldsOnly);
      setOriginalFields(customFieldsOnly); // Store original for comparison
    }
  }, [list]);

  const updateListMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const allFields: FieldDefinition[] = [
        {
          id: '1',
          name: 'Name',
          type: 'text',
          required: true,
          order: 0,
        },
        ...customFields.map((field, index) => ({
          ...field,
          order: index + 1,
        })),
      ];

      const ratingConfig = ratingType === 'none' ? null : {
        max: ratingType === 'stars' ? 5 : ratingType === 'points' ? 100 : 10,
        step: ratingType === 'stars' ? 0.5 : 1,
      };

      const { data, error } = await supabase
        .from('lists')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          rating_type: ratingType === 'none' ? 'stars' : ratingType,
          rating_config: ratingConfig || { max: 5, step: 0.5 },
          field_definitions: allFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate queries after successful update
      queryClient.invalidateQueries({ queryKey: ['listDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });

      return data;
    },
  });

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'List name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pagerRef.current?.setPage(currentStep + 1);
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pagerRef.current?.setPage(currentStep - 1);
  };

  const validateForm = () => {
    if (!name.trim()) return false;
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      setShowValidationErrorSheet(true);
      return;
    }

    // Check for field changes
    const changes = analyzeFieldChanges(originalFields, customFields);
    const hasBreakingChanges = changes.some(
      c => c.type === 'removed' || c.type === 'typeChanged'
    );

    if (hasBreakingChanges && changes.length > 0) {
      // Build warning message
      const messages: string[] = [];
      changes.forEach(change => {
        if (change.type === 'removed') {
          messages.push(`• Removed field "${change.fieldName}"`);
        } else if (change.type === 'typeChanged') {
          messages.push(`• Changed "${change.fieldName}" from ${change.oldType} to ${change.newType}`);
        }
      });

      setFieldChangesMessage(
        `The following changes will affect existing entries:\n\n${messages.join('\n')}\n\nExisting entry data will be automatically migrated. Continue?`
      );
      setShowFieldChangesWarning(true);
    } else {
      // No breaking changes, proceed with save
      performSave();
    }
  };

  const performSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // First, update the list
      await updateListMutation.mutateAsync();

      // Then, migrate entries if there are field changes
      const changes = analyzeFieldChanges(originalFields, customFields);
      if (changes.length > 0) {
        // Include the Name field in both old and new fields for migration
        const oldFieldsWithName = [
          { id: '1', name: 'Name', type: 'text' as const, required: true, order: 0 },
          ...originalFields,
        ];
        const newFieldsWithName = [
          { id: '1', name: 'Name', type: 'text' as const, required: true, order: 0 },
          ...customFields,
        ];

        await migrateEntriesMutation.mutateAsync({
          listId: id,
          oldFields: oldFieldsWithName,
          newFields: newFieldsWithName,
        });
      }

      trackEvent('List Updated', {
        listId: id,
        listName: name,
        ratingType: ratingType,
        customFieldCount: customFields.length,
        fieldChanges: changes.length,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message || 'Failed to update list');
      setShowErrorSheet(true);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRatingTypeSelect = (type: RatingType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRatingType(type);
  };

  const toggleFieldExpanded = (fieldId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFieldIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  const handleAddField = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newField: FieldDefinition = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false,
      order: customFields.length,
    };
    setCustomFields([...customFields, newField]);
    setExpandedFieldIds(prev => new Set(prev).add(newField.id));
  };

  const handleRemoveField = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCustomFields(customFields.filter(field => field.id !== id));
    setExpandedFieldIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleFieldChange = (id: string, updates: Partial<FieldDefinition>) => {
    setCustomFields(customFields.map(field => {
      if (field.id === id) {
        const updatedField = { ...field, ...updates };

        // If changing to rating type, automatically set ratingConfig to match the list's rating type
        if (updates.type === 'rating' && !updatedField.ratingConfig) {
          updatedField.ratingConfig = {
            max: ratingType === 'stars' ? 5 : ratingType === 'points' ? 100 : 10,
            step: ratingType === 'stars' ? 0.5 : 1,
          };
        }

        return updatedField;
      }
      return field;
    }));
  };

  if (isLoading || !list) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading list...</Text>
      </View>
    );
  }

  return (
    <View style={CommonStyles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Edit List</Text>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Pager View */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentStep(e.nativeEvent.position)}
        onPageScroll={(e) => {
          'worklet';
          scrollPosition.value = e.nativeEvent.position + e.nativeEvent.offset;
        }}
      >
        {/* Step 1: Basic Info */}
        <View key="step1" style={styles.page}>
          <ScrollView contentContainerStyle={styles.pageContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>

            <View style={styles.nameIconRow}>
              <View style={styles.nameInputContainer}>
                <TextInput
                  label="List Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Favorite Restaurants"
                  error={errors.name}
                />
              </View>
              <View style={styles.iconPickerContainer}>
                <IconPicker
                  selectedIcon={selectedIcon}
                  onSelectIcon={setSelectedIcon}
                  compact
                />
              </View>
            </View>

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="What is this list for?"
              multiline
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Rating Type</Text>
              <Text style={styles.disabledHelper}>Rating type cannot be changed after list creation</Text>
              <View style={styles.ratingTypeGrid}>
                <View
                  style={[
                    styles.ratingTypeOption,
                    styles.ratingTypeOptionDisabled,
                    ratingType === 'stars' && styles.ratingTypeOptionActive,
                  ]}
                >
                  <Ionicons
                    name="star"
                    size={24}
                    color={ratingType === 'stars' ? Colors.black : Colors.gray}
                  />
                  <Text
                    style={[
                      styles.ratingTypeText,
                      ratingType === 'stars' && styles.ratingTypeTextActive,
                    ]}
                  >
                    Stars
                  </Text>
                  <Text style={styles.ratingTypeSubtext}>1-5 stars</Text>
                </View>

                <View
                  style={[
                    styles.ratingTypeOption,
                    styles.ratingTypeOptionDisabled,
                    ratingType === 'points' && styles.ratingTypeOptionActive,
                  ]}
                >
                  <Ionicons
                    name="trophy"
                    size={24}
                    color={ratingType === 'points' ? Colors.black : Colors.gray}
                  />
                  <Text
                    style={[
                      styles.ratingTypeText,
                      ratingType === 'points' && styles.ratingTypeTextActive,
                    ]}
                  >
                    Points
                  </Text>
                  <Text style={styles.ratingTypeSubtext}>1-100 points</Text>
                </View>

                <View
                  style={[
                    styles.ratingTypeOption,
                    styles.ratingTypeOptionDisabled,
                    ratingType === 'scale' && styles.ratingTypeOptionActive,
                  ]}
                >
                  <Ionicons
                    name="analytics"
                    size={24}
                    color={ratingType === 'scale' ? Colors.black : Colors.gray}
                  />
                  <Text
                    style={[
                      styles.ratingTypeText,
                      ratingType === 'scale' && styles.ratingTypeTextActive,
                    ]}
                  >
                    Scale
                  </Text>
                  <Text style={styles.ratingTypeSubtext}>1-10 scale</Text>
                </View>

                <View
                  style={[
                    styles.ratingTypeOption,
                    styles.ratingTypeOptionDisabled,
                    ratingType === 'none' && styles.ratingTypeOptionActive,
                  ]}
                >
                  <Ionicons
                    name="ban"
                    size={24}
                    color={ratingType === 'none' ? Colors.black : Colors.gray}
                  />
                  <Text
                    style={[
                      styles.ratingTypeText,
                      ratingType === 'none' && styles.ratingTypeTextActive,
                    ]}
                  >
                    None
                  </Text>
                  <Text style={styles.ratingTypeSubtext}>No rating</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomActions}>
            <Button
              label="Next"
              variant="primary"
              onPress={handleNext}
              fullWidth
            />
          </View>
        </View>

        {/* Step 2: Custom Fields */}
        <View key="step2" style={styles.page}>
          <ScrollView contentContainerStyle={styles.pageContent}>
            <Text style={styles.stepTitle}>Custom Fields</Text>
            <Text style={styles.stepSubtitle}>
              Add custom fields to track additional information for each entry.
            </Text>

            {customFields.map((field, index) => {
              const isExpanded = expandedFieldIds.has(field.id);

              return (
                <AnimatedFieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  isExpanded={isExpanded}
                  onToggle={() => toggleFieldExpanded(field.id)}
                  onRemove={() => handleRemoveField(field.id)}
                  onFieldChange={handleFieldChange}
                  newOptionInput={newOptionInputs[field.id] || ''}
                  onNewOptionInputChange={(text) => {
                    setNewOptionInputs(prev => ({
                      ...prev,
                      [field.id]: text
                    }));
                  }}
                />
              );
            })}

            <TouchableOpacity style={styles.addFieldButton} onPress={handleAddField}>
              <Text style={styles.addFieldText}>+ Add Custom Field</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.bottomActions}>
            <View style={styles.buttonRow}>
              <View style={styles.buttonWrapper}>
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={handlePrevious}
                  fullWidth
                />
              </View>
              <View style={styles.buttonWrapper}>
                <Button
                  label="Save Changes"
                  variant="primary"
                  onPress={handleSave}
                  fullWidth
                  disabled={!validateForm() || updateListMutation.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </PagerView>

      {/* Fixed Step Indicators */}
      <View style={styles.fixedStepIndicators}>
        {[0, 1].map((step) => (
          <AnimatedStepDot key={step} step={step} scrollPosition={scrollPosition} />
        ))}
      </View>

      {/* Error Message */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Error'}
        options={[
          {
            label: 'OK',
            icon: 'close-circle-outline',
            onPress: () => {},
          },
        ]}
      />

      {/* Validation Error Message */}
      <CustomActionSheet
        visible={showValidationErrorSheet}
        onClose={() => setShowValidationErrorSheet(false)}
        title="Please fill in all required fields"
        options={[
          {
            label: 'OK',
            icon: 'close-circle-outline',
            onPress: () => {},
          },
        ]}
      />

      {/* Field Changes Warning */}
      <CustomActionSheet
        visible={showFieldChangesWarning}
        onClose={() => setShowFieldChangesWarning(false)}
        title={fieldChangesMessage}
        options={[
          {
            label: 'Cancel',
            icon: 'close-outline',
            onPress: () => setShowFieldChangesWarning(false),
          },
          {
            label: 'Continue',
            icon: 'checkmark-outline',
            onPress: () => {
              setShowFieldChangesWarning(false);
              performSave();
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
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
  headerTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  fixedStepIndicators: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.gap.small,
    paddingVertical: Spacing.gap.medium,
    zIndex: 10,
  },
  stepDot: {
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pager: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.section,
    paddingBottom: 120,
  },
  stepTitle: {
    fontSize: Typography.fontSize.h2,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.large,
    lineHeight: 20,
  },
  section: {
    marginTop: Spacing.gap.large,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.medium,
  },
  ratingTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.gap.small,
  },
  ratingTypeOption: {
    width: '48%',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  ratingTypeOptionActive: {
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
  },
  ratingTypeOptionDisabled: {
    opacity: 0.6,
  },
  disabledHelper: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginBottom: Spacing.gap.medium,
    fontStyle: 'italic',
  },
  ratingTypeText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
  },
  ratingTypeTextActive: {
    color: Colors.black,
  },
  ratingTypeSubtext: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  customFieldCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginBottom: Spacing.gap.medium,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.form.labelGap,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
  },
  fieldTypeRow: {
    marginBottom: Spacing.gap.medium,
    gap: Spacing.gap.small,
  },
  fieldTypeScrollContent: {
    gap: Spacing.gap.small,
    paddingRight: Spacing.gap.small,
  },
  fieldTypeButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.gap.small,
    paddingHorizontal: Spacing.gap.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTypeButtonActive: {
    backgroundColor: Colors.primaryActive,
    borderColor: Colors.black,
  },
  fieldTypeButtonText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  fieldTypeButtonTextActive: {
    color: Colors.black,
  },
  fieldInputBlock: {
    marginBottom: Spacing.gap.medium,
  },
  fieldRow: {
    marginBottom: Spacing.form.labelGap,
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.gap.small,
    marginBottom: Spacing.gap.medium,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.xs,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.gap.xs,
    paddingHorizontal: Spacing.gap.medium,
  },
  optionChipText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.small,
  },
  checkboxLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  checkboxSpacing: {
    marginTop: Spacing.gap.medium,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.gap.small,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginTop: Spacing.gap.medium,
  },
  addFieldText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenPadding.horizontal,
    paddingBottom: 32,
    zIndex: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.gap.medium,
  },
  buttonWrapper: {
    flex: 1,
  },
  fieldCollapsibleHeader: {
    paddingVertical: Spacing.gap.medium,
  },
  fieldCollapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldCollapsibleHeaderText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    flex: 1,
  },
  fieldHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gap.medium,
  },
  nameIconRow: {
    flexDirection: 'row',
    gap: Spacing.gap.medium,
    alignItems: 'flex-start',
  },
  nameInputContainer: {
    flex: 1,
  },
  iconPickerContainer: {
    width: 80,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
});
