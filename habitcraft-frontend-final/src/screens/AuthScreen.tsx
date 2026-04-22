import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { Colors } from '../theme/Colors';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');

  // Validation States
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { login } = React.useContext(AuthContext);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '161203196741-6mvg9hok43hbtu6d5fi29s3q0q8c6prn.apps.googleusercontent.com',
    androidClientId: '161203196741-6mvg9hok43hbtu6d5fi29s3q0q8c6prn.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleBackendAuth(response.params.id_token);
    }
  }, [response]);

  const handleGoogleBackendAuth = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { idToken });
      login(res.data.token);
    } catch (error: any) {
      Alert.alert("Failed", "Google authentication failed in backend.");
    } finally {
      setLoading(false);
    }
  };

  // --- VALIDATION LOGIC ---
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
    // 1. Check if fields are empty
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Hold up", "Please fill in all fields.");
      return;
    }
    // 2. Check if there are validation errors (the red borders)
    if (emailError || passwordError) {
      Alert.alert("Invalid Input", "Please fix the errors before continuing.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user); // This fires the context and jumps to Dashboard

      } else {
        // --- SIGNUP FLOW ---
        await api.post('/auth/register', { name, email, password });

        // Success! Show an alert, but DO NOT log them in.
        Alert.alert(
          "Account Created!",
          "Your account is ready. Please log in with your new credentials."
        );

        // Switch the UI back to Login mode
        setIsLogin(true);
        // Clear the password field for security so they have to type it again
        setPassword('');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Something went wrong";
      Alert.alert("Failed", errorMsg);
    } finally {
      setLoading(false);
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
            <TextInput
              style={[styles.input, getBorderStyle('name', '')]}
              placeholder="Full Name" placeholderTextColor={Colors.textMuted}
              onFocus={() => setFocusedInput('name')} onBlur={() => setFocusedInput(null)}
              value={name} onChangeText={setName}
            />
          )}

          <TextInput
            style={[styles.input, getBorderStyle('email', emailError)]}
            placeholder="Email Address" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none"
            onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)}
            value={email} onChangeText={validateEmail}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <TextInput
            style={[styles.input, getBorderStyle('password', passwordError)]}
            placeholder="Password" placeholderTextColor={Colors.textMuted}
            secureTextEntry
            onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)}
            value={password} onChangeText={validatePassword}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} /><Text style={styles.dividerText}>OR</Text><View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()} disabled={!request || loading}>
            <Text style={styles.googleButtonText}>🌐 Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isLogin ? "New here? " : "Already have an account? "}
              <Text style={styles.toggleAction}>{isLogin ? 'Create Account' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  input: {
    backgroundColor: Colors.card, color: Colors.text, padding: 18,
    borderRadius: 14, marginBottom: 8, fontSize: 16
  },
  errorText: { color: Colors.error, fontSize: 12, marginBottom: 12, marginLeft: 4, fontWeight: '500' },
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
});