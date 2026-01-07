import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, CommonStyles } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import CustomActionSheet, { ActionSheetOption } from '@/components/CustomActionSheet';
import { signIn } from '@/lib/utils/auth';
import { loginSchema, LoginFormData } from '@/lib/validation/auth';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showComingSoonSheet, setShowComingSoonSheet] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState('');

  // Field blur handlers for progressive validation
  const handleEmailBlur = () => {
    try {
      loginSchema.shape.email.parse(email);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message;
      if (errorMessage) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      }
    }
  };

  const handlePasswordBlur = () => {
    try {
      loginSchema.shape.password.parse(password);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message;
      if (errorMessage) {
        setErrors((prev) => ({ ...prev, password: errorMessage }));
      }
    }
  };

  // Submit handler
  const handleLogin = async () => {
    // Validate form
    try {
      loginSchema.parse({ email, password });
      setErrors({});
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err: any) => {
        fieldErrors[err.path[0] as keyof LoginFormData] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Attempt login
    setLoading(true);
    try {
      await signIn(email, password);
      // AuthContext will handle navigation via auth state change
      router.replace('/(authenticated)/home');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sign in');
      setShowErrorSheet(true);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <View style={[CommonStyles.screenContainer, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primaryActive} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={CommonStyles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Stelli</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <TextInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            onBlur={handleEmailBlur}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            onBlur={handlePasswordBlur}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            editable={!loading}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => {
              setComingSoonMessage('Password reset functionality will be added soon');
              setShowComingSoonSheet(true);
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <Button
            label={loading ? 'Signing in...' : 'Sign In'}
            variant="primary"
            onPress={handleLogin}
            disabled={loading}
            fullWidth
          />

          {/* Social Login Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons - Placeholders */}
          <View style={styles.socialButtons}>
            <Button
              label="Google"
              variant="secondary"
              onPress={() => {
                setComingSoonMessage('Google sign-in will be added in a future update');
                setShowComingSoonSheet(true);
              }}
              disabled={loading}
              fullWidth
            />
            <Button
              label="Apple"
              variant="secondary"
              onPress={() => {
                setComingSoonMessage('Apple sign-in will be added in a future update');
                setShowComingSoonSheet(true);
              }}
              disabled={loading}
              fullWidth
            />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpSection}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/sign-up')} disabled={loading}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Error Sheet */}
      <CustomActionSheet
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        title={errorMessage || 'Login Failed'}
        options={[
          {
            label: 'OK',
            icon: 'close-circle-outline',
            onPress: () => {},
          },
        ]}
      />

      {/* Coming Soon Sheet */}
      <CustomActionSheet
        visible={showComingSoonSheet}
        onClose={() => setShowComingSoonSheet(false)}
        title={comingSoonMessage || 'Coming Soon'}
        options={[
          {
            label: 'OK',
            icon: 'information-circle-outline',
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
    paddingTop: Spacing.screenPadding.vertical,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.gap.xl,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: Colors.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.gap.large,
  },
  logoText: {
    fontSize: 32,
    fontFamily: 'Muli_700Bold',
    color: Colors.black,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Muli_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
    textAlign: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.primaryActive,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Muli_400Regular',
    color: Colors.gray,
    paddingHorizontal: Spacing.gap.medium,
  },
  socialButtons: {
    gap: Spacing.gap.medium,
  },
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_400Regular',
    color: Colors.text.primary,
  },
  signUpLink: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Muli_700Bold',
    color: Colors.primaryActive,
  },
});

