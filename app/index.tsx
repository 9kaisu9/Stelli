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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, CommonStyles } from '@/constants/styleGuide';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
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
      Alert.alert('Login Failed', error.message);
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
              Alert.alert('Coming Soon', 'Password reset functionality will be added soon');
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
                Alert.alert('Coming Soon', 'Google sign-in will be added in a future update');
              }}
              disabled={loading}
              fullWidth
            />
            <Button
              label="Apple"
              variant="secondary"
              onPress={() => {
                Alert.alert('Coming Soon', 'Apple sign-in will be added in a future update');
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
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text.primary,
    marginBottom: Spacing.gap.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.large,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
  },
  formSection: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.gap.large,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.primaryActive,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.gap.large,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    paddingHorizontal: Spacing.gap.medium,
  },
  socialButtons: {
    gap: Spacing.gap.medium,
    marginBottom: Spacing.gap.large,
  },
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text.primary,
  },
  signUpLink: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.primaryActive,
  },
});
