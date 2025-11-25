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
import { useListDetail } from '@/lib/hooks/useListEntries';
import { useCreateEntry } from '@/lib/hooks/useCreateEntry';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';
import Button from '@/components/Button';
import StarRating from '@/components/StarRating';
import TextInput from '@/components/TextInput';
import { trackScreenView, trackEvent } from '@/lib/posthog';

export default function AddEntryScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const { data: list, isLoading: listLoading, error: listError } = useListDetail(listId);
  const { createEntryMutation } = useCreateEntry();

  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

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

  const validateForm = () => {
    if (!list) return false;

    // Check name field (always required)
    if (!fieldValues.name || fieldValues.name.trim() === '') {
      Alert.alert('Missing Required Field', 'Please enter a name for the entry.');
      return false;
    }

    // Check required fields
    for (const field of list.field_definitions || []) {
      if (field.required && !fieldValues[field.id]) {
        Alert.alert('Missing Required Field', `Please fill in the ${field.name} field.`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!list || !user) return;

    if (!validateForm()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await createEntryMutation.mutateAsync({
        list_id: listId,
        user_id: user.id,
        rating,
        field_values: fieldValues,
      });

      trackEvent('Entry Created', { listId, entryName: fieldValues['1'] });
      Alert.alert('Success', 'Entry created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating entry:', error);
      Alert.alert('Error', 'Failed to create entry');
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

        {/* Rating Section */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Rating</Text>
          {list.rating_type === 'stars' && (
            <StarRating
              rating={rating || 0}
              size="large"
              readonly={false}
              onRatingChange={setRating}
              color={Colors.black}
            />
          )}
          {list.rating_type === 'points' && (
            <TextInput
              value={rating?.toString() || ''}
              onChangeText={(text) => {
                const num = parseFloat(text);
                setRating(isNaN(num) ? null : num);
              }}
              placeholder="Enter points"
              keyboardType="numeric"
            />
          )}
          {list.rating_type === 'scale' && (
            <TextInput
              value={rating?.toString() || ''}
              onChangeText={(text) => {
                const num = parseFloat(text);
                setRating(isNaN(num) ? null : num);
              }}
              placeholder={`1-${list.rating_config.max}`}
              keyboardType="numeric"
            />
          )}
        </View>

        {/* Additional Fields */}
        {list.field_definitions
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
          ))}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label={createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
            variant="primary"
            onPress={handleSave}
            disabled={createEntryMutation.isPending}
            fullWidth
          />
        </View>
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
    marginBottom: Spacing.gap.large,
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
