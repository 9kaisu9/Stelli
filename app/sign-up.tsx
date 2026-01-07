import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, CommonStyles } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import { signUp } from '@/lib/utils/auth';
import { signUpSchema, SignUpFormData } from '@/lib/validation/auth';

export default function SignUpScreen() {
  const router = useRouter();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Field blur handlers for progressive validation
  const validateField = (field: keyof SignUpFormData, value: string) => {
    try {
      if (field === 'confirmPassword') {
        // Special handling for confirm password - need to check against password
        signUpSchema.parse({ displayName, email, password, confirmPassword: value });
      } else {
        (signUpSchema.shape[field] as any).parse(value);
      }
      // Remove error for this field
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message;
      if (errorMessage) {
        setErrors((prev) => ({
          ...prev,
          [field]: errorMessage,
        }));
      }
    }
  };

  // Submit handler
  const handleSignUp = async () => {
    // Validate form
    try {
      signUpSchema.parse({ displayName, email, password, confirmPassword });
      setErrors({});
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err: any) => {
        fieldErrors[err.path[0] as keyof SignUpFormData] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Attempt sign up
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      setShowSuccessSheet(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create account');
      setShowErrorSheet(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={CommonStyles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <TextInput
            label="Display Name *"
            placeholder="Enter your name"
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={() => validateField('displayName', displayName)}
            error={errors.displayName}
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            label="Email *"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            onBlur={() => validateField('email', email)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            label="Password *"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            onBlur={() => validateField('password', password)}
            error={errors.password}
            helperText="Min 8 characters, must include uppercase, lowercase, and number"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!loading}
          />

          <TextInput
            label="Confirm Password *"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => validateField('confirmPassword', confirmPassword)}
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          {/* Terms Notice */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Sign Up Button */}
          <Button
            label={loading ? 'Creating Account...' : 'Create Account'}
            variant="primary"
            onPress={handleSignUp}
            disabled={loading}
            fullWidth
          />

          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()} disabled={loading}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Sheet */}
      <CustomActionSheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        title="Account Created\n\nYour account has been created successfully! You can now sign in."
        options={[
          {
            label: 'OK',
            icon: 'checkmark-circle-outline',
            onPress: () => {
              setShowSuccessSheet(false);
              router.replace('/');
            },
          },
        ]}
      />

      {/* Error Sheet */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Sign Up Failed'}
        options={[
          {
            label: 'OK',
            icon: 'close-circle-outline',
            onPress: () => {},
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding.horizontal,
    paddingTop: Spacing.gap.large,
    paddingBottom: 32,
  },
  header: {
    marginBottom: Spacing.gap.large,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
    color: Colors.primaryActive,
  },
  titleSection: {
    marginBottom: Spacing.gap.xl,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
  },
  subtitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
  },
  formSection: {
    width: '100%',
    gap: Spacing.gap.medium,
  },
  termsText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    textAlign: 'center',
  },
  termsLink: {
    color: Colors.primaryActive,
    fontFamily: 'Muli_700Bold',
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
  },
  signInLink: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
    color: Colors.primaryActive,
  },
});

