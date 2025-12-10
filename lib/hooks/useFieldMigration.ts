import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FieldDefinition } from '@/constants/types';

interface FieldChange {
  type: 'added' | 'removed' | 'modified' | 'typeChanged';
  fieldId: string;
  fieldName: string;
  oldType?: string;
  newType?: string;
}

interface MigrationOptions {
  listId: string;
  oldFields: FieldDefinition[];
  newFields: FieldDefinition[];
}

/**
 * Analyzes changes between old and new field definitions
 */
export function analyzeFieldChanges(
  oldFields: FieldDefinition[],
  newFields: FieldDefinition[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const oldFieldMap = new Map(oldFields.map(f => [f.id, f]));
  const newFieldMap = new Map(newFields.map(f => [f.id, f]));

  // Check for removed fields
  oldFields.forEach(oldField => {
    if (!newFieldMap.has(oldField.id) && oldField.id !== '1') {
      changes.push({
        type: 'removed',
        fieldId: oldField.id,
        fieldName: oldField.name,
      });
    }
  });

  // Check for added and modified fields
  newFields.forEach(newField => {
    if (newField.id === '1') return; // Skip name field

    const oldField = oldFieldMap.get(newField.id);

    if (!oldField) {
      // New field added
      changes.push({
        type: 'added',
        fieldId: newField.id,
        fieldName: newField.name,
      });
    } else if (oldField.type !== newField.type) {
      // Field type changed
      changes.push({
        type: 'typeChanged',
        fieldId: newField.id,
        fieldName: newField.name,
        oldType: oldField.type,
        newType: newField.type,
      });
    } else if (oldField.name !== newField.name ||
               oldField.required !== newField.required ||
               JSON.stringify(oldField.options) !== JSON.stringify(newField.options)) {
      // Field modified (name, required status, or options changed)
      changes.push({
        type: 'modified',
        fieldId: newField.id,
        fieldName: newField.name,
      });
    }
  });

  return changes;
}

/**
 * Hook to migrate field values in existing entries when field definitions change
 */
export function useFieldMigration() {
  const queryClient = useQueryClient();

  const migrateEntriesMutation = useMutation({
    mutationFn: async ({ listId, oldFields, newFields }: MigrationOptions) => {
      const changes = analyzeFieldChanges(oldFields, newFields);

      // If no breaking changes, skip migration
      const hasBreakingChanges = changes.some(
        c => c.type === 'removed' || c.type === 'typeChanged'
      );

      if (!hasBreakingChanges) {
        return { migrated: 0, changes };
      }

      // Get all entries for this list
      const { data: entries, error: fetchError } = await supabase
        .from('entries')
        .select('id, field_values')
        .eq('list_id', listId);

      if (fetchError) throw fetchError;
      if (!entries || entries.length === 0) {
        return { migrated: 0, changes };
      }

      // Migrate each entry
      const updates = entries.map(entry => {
        const oldFieldValues = entry.field_values as Record<string, any>;
        const newFieldValues: Record<string, any> = {};

        // Always preserve the name field (stored with key 'name', not field ID '1')
        newFieldValues['name'] = oldFieldValues['name'];

        // Process each new field
        newFields.forEach(newField => {
          if (newField.id === '1') return; // Skip name field (already handled above)

          const oldField = oldFields.find(f => f.id === newField.id);
          const existingValue = oldFieldValues[newField.id];

          if (!oldField) {
            // New field - set to null or default value
            newFieldValues[newField.id] = null;
          } else if (oldField.type !== newField.type) {
            // Type changed - try to convert or set to null
            newFieldValues[newField.id] = convertFieldValue(
              existingValue,
              oldField.type,
              newField.type
            );
          } else {
            // Field unchanged - preserve value
            newFieldValues[newField.id] = existingValue;
          }
        });

        return {
          id: entry.id,
          field_values: newFieldValues,
        };
      });

      // Update each entry individually to avoid RLS issues with upsert
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('entries')
          .update({ field_values: update.field_values })
          .eq('id', update.id);

        if (updateError) throw updateError;
      }

      return { migrated: updates.length, changes };
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['listEntries', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allEntries'] });
    },
  });

  return {
    migrateEntriesMutation,
    analyzeFieldChanges,
  };
}

/**
 * Attempts to convert a field value from one type to another
 */
function convertFieldValue(
  value: any,
  fromType: string,
  toType: string
): any {
  if (value === null || value === undefined) return null;

  // Text to anything - preserve as string or parse
  if (fromType === 'text') {
    if (toType === 'number') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    if (toType === 'yes-no') {
      const lower = value.toLowerCase();
      if (lower === 'yes' || lower === 'true' || lower === '1') return 'yes';
      if (lower === 'no' || lower === 'false' || lower === '0') return 'no';
      return null;
    }
    // For dropdown/multi-select, keep the text value (might match an option)
    return value;
  }

  // Number to text
  if (fromType === 'number' && toType === 'text') {
    return value.toString();
  }

  // Yes/No to text
  if (fromType === 'yes-no' && toType === 'text') {
    return value === 'yes' ? 'Yes' : 'No';
  }

  // Date conversions
  if (fromType === 'date' && toType === 'text') {
    return value; // Date is already stored as ISO string
  }

  // Dropdown/multi-select conversions
  if (fromType === 'dropdown' && toType === 'multi-select') {
    return [value]; // Convert single value to array
  }
  if (fromType === 'multi-select' && toType === 'dropdown') {
    return Array.isArray(value) ? value[0] : value; // Take first value
  }

  // For incompatible conversions, return null
  return null;
}
