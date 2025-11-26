import { TextInput as RNTextInput, StyleSheet, View, Text, TextInputProps as RNTextInputProps } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/styleGuide';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function TextInput({
  label,
  error,
  helperText,
  style,
  multiline,
  ...props
}: TextInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.gray}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No marginBottom - let parent control spacing
  },
  label: {
    ...Typography.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
    marginBottom: Spacing.form.labelGap,
  },
  input: {
    height: 50,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.form.inputPadding,
    ...Typography.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.black,
  },
  inputMultiline: {
    height: 100,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.form.inputPadding,
  },
  inputError: {
    borderColor: '#ef4444', // Red color for errors
  },
  errorText: {
    ...Typography.small,
    fontFamily: 'Nunito_400Regular',
    color: '#ef4444',
    marginTop: Spacing.small,
    marginLeft: Spacing.form.inputPadding,
  },
  helperText: {
    ...Typography.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginTop: Spacing.small,
    marginLeft: Spacing.form.inputPadding,
  },
});
