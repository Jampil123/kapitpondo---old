import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';

function toE164(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) return `+${digits}`;
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`;
  if (digits.startsWith('9')) return `+63${digits}`;
  return `+${digits}`;
}

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!phone || !password) {
      setError('Please enter your phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: toE164(phone),
        password,
      });
      if (signInError) {
        setError(signInError.message || 'Invalid phone number or password.');
        return;
      }
      router.replace('/(member)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      {/* Top nav */}
      <View className="px-5 pt-12 pb-2 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#1A3A4A" />
        </Pressable>
      </View>

      {/* Brand */}
      <View className="items-center mt-8 mb-10">
        <Text className="text-4xl font-extrabold text-arctic-navy tracking-tight">
          KapitPondo
        </Text>
      </View>

      {/* Fields */}
      <View className="px-5">
        {/* Phone — split country code + number */}
        <View className="flex-row gap-3 mb-4">
          <View className="bg-arctic-card/60 rounded-2xl px-4 items-center justify-center h-16">
            <Text className="text-arctic-navy font-semibold text-base">+63</Text>
          </View>
          <TextInput
            className="flex-1 bg-arctic-card/60 rounded-2xl px-4 h-16 text-arctic-navy text-base"
            placeholder="Phone number"
            placeholderTextColor="#7FA6B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Password — floating label + eye toggle */}
        <View className="bg-arctic-card/60 rounded-2xl px-4 pt-3 pb-3 mb-3">
          <Text className="text-arctic-accent text-xs font-semibold mb-1">Password</Text>
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 text-arctic-navy text-base"
              placeholder="Enter password"
              placeholderTextColor="#7FA6B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
              <Text className="text-arctic-accent text-lg">
                {showPassword ? '◡' : '⌒'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Forgot password */}
        <Pressable className="items-center mt-1 mb-2" onPress={handleForgotPassword}>
          <Text className="text-arctic-accent font-semibold text-sm">
            Forgot your password?
          </Text>
        </Pressable>

        {error ? (
          <Text className="text-status-rejected text-sm mt-2 text-center">{error}</Text>
        ) : null}
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Log in button — pinned to bottom */}
      <View className="px-5 pb-10">
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className={`w-full h-16 bg-arctic-navy rounded-2xl items-center justify-center ${loading ? 'opacity-50' : 'active:opacity-80'}`}
        >
          {loading
            ? <ActivityIndicator color="#ffffff" />
            : <Text className="text-white font-bold text-base tracking-wide">Log in</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
