import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext';
import { Colors } from '../theme/Colors';
import { Ionicons } from '@expo/vector-icons';

// Imported the native Google Sign-In library
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In globally at the file level
// Note: We use the WEB Client ID here so that the backend can verify the token.
GoogleSignin.configure({
  webClientId: '300553291530-lpr49if7mhm3njtou0iqol3h5q46f8vm.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const { login } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  // New function to clear fields when switching between Login and Sign Up
  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setName('');
    setEmail('');
    setEmailError('');
    setPassword('');
    setPasswordError('');
  };

  // Native trigger for Google Sign-In flow
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      
      // Add this block to force the account picker to show every time
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // Silently ignore if there is no active session to sign out of
      }

      const response = await GoogleSignin.signIn();

      // Handles token access compatibility across library versions safely
      const idToken = response.data?.idToken || (response as any).idToken;

      if (idToken) {
        handleGoogleBackendAuth(idToken);
      } else {
        showAlert("Failed", "Could not retrieve ID Token from Google.", "⚠️");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow gracefully
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert("In Progress", "Sign in is already in progress.", "⏳");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert("Error", "Google Play Services not available or outdated.", "⚠️");
      } else {
        showAlert("Failed", "Google sign in failed.", "⚠️");
      }
    }
  };

  const handleGoogleBackendAuth = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { idToken });
      
      // Pass both token and user data to storage
      login(res.data.token, res.data.user);
      
    } catch (error: any) {
      showAlert("Failed", "Google authentication failed in backend.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailError('');
    else if (!emailRegex.test(text)) setEmailError('Please enter a valid email address.');
    else setEmailError('');
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    if (!text) {
      setPasswordError('');
      return;
    }
    if (text.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } else if (!/(?=.*[A-Z])/.test(text)) {
      setPasswordError('Must contain at least one uppercase letter.');
    } else if (!/(?=.*[0-9])/.test(text)) {
      setPasswordError('Must contain at least one number.');
    } else if (!/(?=.*[!@#$%^&*])/.test(text)) {
      setPasswordError('Must contain at least one special character (!@#$%^&*).');
    } else {
      setPasswordError('');
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      showAlert("Hold up", "Please fill in all fields.", "✋");
      return;
    }
    if (emailError || passwordError) {
      showAlert("Invalid Input", "Please fix the errors before continuing.", "⚠️");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user);
      } else {
        await api.post('/auth/register', { name, email, password });
        showAlert("Account Created!", "Your account is ready. Please log in with your new credentials.", "🎉");
        setIsLogin(true);
        setPassword('');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Something went wrong";
      showAlert("Failed", errorMsg, "⚠️");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!resetEmail) return showAlert("Error", "Please enter your email address.", "⚠️");
    setResetLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      setOtpStep(2);
      showAlert("Request Received", res.data.message, "📨");
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Failed to process request.", "⚠️");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode || !resetNewPassword) return showAlert("Error", "Please fill in all fields.", "⚠️");
    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: resetEmail,
        otp: otpCode, // Fixed typo: changed 'Code' to 'otpCode'
        newPassword: resetNewPassword
      });
      setForgotModalVisible(false);
      setOtpStep(1);
      setResetEmail('');
      setOtpCode('');
      setResetNewPassword('');
      showAlert("Success", "Your password has been reset. You can now log in.", "✅");
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Invalid OTP or failed to reset.", "⚠️");
    } finally {
      setResetLoading(false);
    }
  };

  const getBorderStyle = (inputName: string, error: string) => ({
    borderColor: error ? Colors.error : (focusedInput === inputName ? Colors.primary : Colors.border),
    borderWidth: 1.5,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Join HabitCraft'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Log in to continue your streak' : 'Start your journey to discipline'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={[styles.inputContainer, getBorderStyle('name', '')]}>
              <TextInput
                style={styles.inputText}
                placeholder="Full Name" placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocusedInput('name')} onBlur={() => setFocusedInput(null)}
                value={name} onChangeText={setName}
              />
              {name.length > 0 && (
                <TouchableOpacity style={styles.iconButton} onPress={() => setName('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.inputContainer, getBorderStyle('email', emailError)]}>
            <TextInput
              style={styles.inputText}
              placeholder="Email Address" placeholderTextColor={Colors.textMuted}
              keyboardType="email-address" autoCapitalize="none"
              onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)}
              value={email} onChangeText={validateEmail}
            />
            {email.length > 0 && (
              <TouchableOpacity style={styles.iconButton} onPress={() => validateEmail('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={[styles.inputContainer, getBorderStyle('password', passwordError)]}>
            <TextInput
              style={styles.inputText}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              value={password}
              onChangeText={validatePassword}
            />
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          {isLogin && (
            <TouchableOpacity onPress={() => setForgotModalVisible(true)} style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} /><Text style={styles.dividerText}>OR</Text><View style={styles.divider} />
          </View>

          {/* Connected button click listener directly to native trigger */}
          <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle} disabled={loading}>
            <Text style={styles.googleButtonText}>🌐 Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSwitchMode} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isLogin ? "New here? " : "Already have an account? "}
              <Text style={styles.toggleAction}>{isLogin ? 'Create Account' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={forgotModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalMessage}>
              {otpStep === 1
                ? "Enter your registered email and we will send you a 6-digit code."
                : "Enter the 6-digit code sent to your email and your new password."}
            </Text>

            {otpStep === 1 ? (
              <TextInput
                style={styles.modalInput}
                placeholder="Email Address"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={resetEmail}
                onChangeText={setResetEmail}
              />
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="6-Digit OTP"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <View style={[styles.inputContainer, { marginBottom: 15 }]}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="New Password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showResetPassword}
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                  />
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowResetPassword(!showResetPassword)}>
                    <Ionicons name={showResetPassword ? "eye-outline" : "eye-off-outline"} size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                setForgotModalVisible(false);
                setOtpStep(1);
                setResetEmail('');
                setOtpCode('');
                setResetNewPassword('');
                setShowResetPassword(false);
              }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={otpStep === 1 ? handleSendOtp : handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>{otpStep === 1 ? "Send OTP" : "Reset"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 34, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textMuted, marginTop: 8 },
  form: { width: '100%' },

  // Shared container and text styles for Name, Email, and Password fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 8,
  },
  inputText: {
    flex: 1,
    color: Colors.text,
    padding: 18,
    fontSize: 16,
  },
  iconButton: {
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: { color: Colors.error, fontSize: 12, marginBottom: 12, marginLeft: 4, fontWeight: '500' },

  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 15, marginTop: -2 },
  forgotPasswordText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },

  primaryButton: {
    backgroundColor: Colors.primary, padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 10, elevation: 4,
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, paddingHorizontal: 15, fontSize: 13, fontWeight: 'bold' },
  googleButton: { backgroundColor: '#FFF', padding: 18, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  toggleButton: { marginTop: 35, alignItems: 'center' },
  toggleText: { color: Colors.textMuted, fontSize: 15 },
  toggleAction: { color: Colors.primary, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, width: '100%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 30, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  modalMessage: { color: Colors.textMuted, fontSize: 15, marginBottom: 25, lineHeight: 22 },
  modalInput: { backgroundColor: Colors.background, color: Colors.text, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 16, marginBottom: 15 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 15, marginTop: 10 },
  modalCancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modalCancelText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  modalPrimaryBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});