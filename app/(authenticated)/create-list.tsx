import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions as RNDimensions } from 'react-native';
import { useRouter } from 'expo-router';
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
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, CommonStyles, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import IconPicker from '@/components/IconPicker';
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
    // Calculate progress for this specific dot based on scroll position
    // When scrollPosition is at step index, this dot should be fully active
    const distance = Math.abs(scrollPosition.value - step);

    // Active when distance is 0, inactive when distance >= 1
    const widthProgress = Math.max(0, Math.min(1, 1 - distance));

    // Gradual color progress based on scroll position
    // Dots are fully active (primary color) when scroll position is >= step
    // Gradually transition from gray to primary as we approach this step
    let colorProgress;
    if (scrollPosition.value >= step) {
      // Already completed or currently viewing this step - full primary color
      colorProgress = 1;
    } else if (scrollPosition.value >= step - 1) {
      // Transitioning from previous step to this one - gradual color change
      colorProgress = scrollPosition.value - (step - 1);
    } else {
      // Not reached yet - stay gray
      colorProgress = 0;
    }

    return {
      width: 10 + (widthProgress * 14), // Expands from 10px to 24px when active
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
}

function AnimatedFieldCard({
  field,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onFieldChange,
}: AnimatedFieldCardProps) {
  const height = useSharedValue(isExpanded ? 1 : 0);
  const opacity = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
    opacity.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
  }, [isExpanded]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    maxHeight: height.value === 0 ? 0 : 2000, // Large enough to fit all content
    overflow: 'hidden',
  }));

  const fieldDisplayName = field.name.trim() || `Field #${index + 1}`;

  return (
    <View style={styles.customFieldCard}>
      {!isExpanded ? (
        // Collapsed state - show header with field name or placeholder
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
        // Expanded state - show all fields with animation
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
            <TextInput
              value={field.name}
              onChangeText={(text) => onFieldChange(field.id, { name: text })}
              placeholder="e.g., Location, Genre, Price"
            />

            <View style={styles.fieldTypeRow}>
              <Text style={styles.fieldLabel}>Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fieldTypeScrollContent}
              >
                {(['text', 'number', 'date', 'dropdown', 'multi-select', 'yes-no', 'rating'] as FieldType[]).map((type) => (
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

            {/* Options input for dropdown and multi-select */}
            {(field.type === 'dropdown' || field.type === 'multi-select') && (
              <View style={styles.optionsContainer}>
                <Text style={styles.fieldLabel}>Options (comma-separated)</Text>
                <TextInput
                  value={field.options?.join(', ') || ''}
                  onChangeText={(text) => {
                    const options = text.split(',').map(opt => opt.trim()).filter(opt => opt);
                    onFieldChange(field.id, { options });
                  }}
                  placeholder="e.g., Option 1, Option 2, Option 3"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.checkboxRow}
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

export default function CreateListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pagerRef = useRef<PagerView>(null);

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const scrollPosition = useSharedValue(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [ratingType, setRatingType] = useState<RatingType>('stars');
  const [customFields, setCustomFields] = useState<FieldDefinition[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    trackScreenView('Create List Screen');
  }, []);

  const createListMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Build field definitions with name field + custom fields
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
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          rating_type: ratingType === 'none' ? 'stars' : ratingType, // Default to stars if none
          rating_config: ratingConfig || { max: 5, step: 0.5 },
          field_definitions: allFields,
          is_template: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      trackEvent('List Created', {
        listName: data.name,
        ratingType: ratingType,
        customFieldCount: customFields.length,
        isPublic,
      });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'List created successfully!', [
        {
          text: 'OK',
          onPress: () => router.push(`/list/${data.id}` as any),
        },
      ]);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create list');
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
    // Name must be filled in (validated in step 1)
    if (!name.trim()) return false;
    return true;
  };

  const handleCreate = () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createListMutation.mutate();
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
    // Auto-expand the new field
    setExpandedFieldIds(prev => new Set(prev).add(newField.id));
  };

  const handleRemoveField = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCustomFields(customFields.filter(field => field.id !== id));
    // Remove from expanded set
    setExpandedFieldIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleFieldChange = (id: string, updates: Partial<FieldDefinition>) => {
    setCustomFields(customFields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  return (
    <View style={CommonStyles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Create List</Text>
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
              <View style={styles.ratingTypeGrid}>
                <TouchableOpacity
                  style={[
                    styles.ratingTypeOption,
                    ratingType === 'stars' && styles.ratingTypeOptionActive,
                  ]}
                  onPress={() => handleRatingTypeSelect('stars')}
                  activeOpacity={0.7}
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
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ratingTypeOption,
                    ratingType === 'points' && styles.ratingTypeOptionActive,
                  ]}
                  onPress={() => handleRatingTypeSelect('points')}
                  activeOpacity={0.7}
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
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ratingTypeOption,
                    ratingType === 'scale' && styles.ratingTypeOptionActive,
                  ]}
                  onPress={() => handleRatingTypeSelect('scale')}
                  activeOpacity={0.7}
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
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ratingTypeOption,
                    ratingType === 'none' && styles.ratingTypeOptionActive,
                  ]}
                  onPress={() => handleRatingTypeSelect('none')}
                  activeOpacity={0.7}
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
                </TouchableOpacity>
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
              const fieldDisplayName = field.name.trim() || `Field #${index + 1}`;

              return (
              <AnimatedFieldCard
                key={field.id}
                field={field}
                index={index}
                isExpanded={isExpanded}
                onToggle={() => toggleFieldExpanded(field.id)}
                onRemove={() => handleRemoveField(field.id)}
                onFieldChange={handleFieldChange}
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
                  label="Next"
                  variant="primary"
                  onPress={handleNext}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>

        {/* Step 3: Privacy Settings */}
        <View key="step3" style={styles.page}>
          <ScrollView contentContainerStyle={styles.pageContent}>
            <Text style={styles.stepTitle}>Privacy Settings</Text>
            <Text style={styles.stepSubtitle}>
              Choose who can see this list.
            </Text>

            <View style={styles.privacyOptions}>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  !isPublic && styles.privacyOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsPublic(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.privacyIconContainer}>
                  <Ionicons
                    name="lock-closed"
                    size={32}
                    color={!isPublic ? Colors.black : Colors.gray}
                  />
                </View>
                <Text
                  style={[
                    styles.privacyTitle,
                    !isPublic && styles.privacyTitleActive,
                  ]}
                >
                  Private
                </Text>
                <Text style={styles.privacyDescription}>
                  Only you can see this list
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  isPublic && styles.privacyOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsPublic(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.privacyIconContainer}>
                  <Ionicons
                    name="globe"
                    size={32}
                    color={isPublic ? Colors.black : Colors.gray}
                  />
                </View>
                <Text
                  style={[
                    styles.privacyTitle,
                    isPublic && styles.privacyTitleActive,
                  ]}
                >
                  Public
                </Text>
                <Text style={styles.privacyDescription}>
                  Anyone with the link can view
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>List Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name:</Text>
                <Text style={styles.summaryValue}>{name || 'Untitled'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rating:</Text>
                <Text style={styles.summaryValue}>
                  {ratingType === 'none' ? 'No rating' : ratingType}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Custom Fields:</Text>
                <Text style={styles.summaryValue}>{customFields.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Privacy:</Text>
                <Text style={styles.summaryValue}>{isPublic ? 'Public' : 'Private'}</Text>
              </View>
            </View>
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
                  label="Create List"
                  variant="primary"
                  onPress={handleCreate}
                  fullWidth
                  disabled={!validateForm() || createListMutation.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </PagerView>

      {/* Fixed Step Indicators */}
      <View style={styles.fixedStepIndicators}>
        {[0, 1, 2].map((step) => (
          <AnimatedStepDot key={step} step={step} scrollPosition={scrollPosition} />
        ))}
      </View>
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
    bottom: 90, // Above the bottom actions (button height + padding)
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
    backgroundColor: Colors.primary,
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
  fieldCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginBottom: Spacing.gap.medium,
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
    backgroundColor: Colors.primary,
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
  optionsContainer: {
    marginBottom: Spacing.gap.medium,
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
  privacyOptions: {
    gap: Spacing.gap.medium,
    marginBottom: Spacing.gap.large,
  },
  privacyOption: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    alignItems: 'center',
  },
  privacyOptionActive: {
    backgroundColor: Colors.primary,
  },
  privacyIconContainer: {
    marginBottom: Spacing.gap.small,
  },
  privacyTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.gray,
    marginBottom: Spacing.gap.xs,
  },
  privacyTitleActive: {
    color: Colors.black,
  },
  privacyDescription: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.gap.small,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  summaryValue: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
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
  collapsibleHeader: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.large,
    padding: Spacing.padding.card,
    marginBottom: Spacing.gap.medium,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleHeaderText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
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
});
