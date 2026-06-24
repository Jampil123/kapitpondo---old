import { useState } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

function toE164(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) return `+${digits}`;
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`;
  if (digits.startsWith('9')) return `+63${digits}`;
  return `+${digits}`;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setError('');
    if (!phone) {
      setError('Please enter your phone number.');
      return;
    }
    const e164 = toE164(phone);
    setLoading(true);
    try {
      // Send an OTP to the phone (reused for password recovery)
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (otpError) {
        setError(otpError.message || 'Could not send the reset code.');
        return;
      }
      // Go to OTP screen in "reset" mode so it routes to set-new-password after
    //   router.push({
    //     pathname: '/(auth)/otp',
    //     params: { phone: e164, mode: 'reset' },
    //   });
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-arctic-base"
    >
      <Pressable
        onPress={() => router.back()}
        className="absolute top-12 left-5 z-10 w-10 h-10 rounded-full bg-arctic-card items-center justify-center"
      >
        <Text className="text-arctic-navy text-lg font-bold">←</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-5"
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon motif */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-arctic-card items-center justify-center">
            <Text className="text-4xl">🔒</Text>
          </View>
        </View>

        {/* Heading */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-arctic-navy mb-2 text-center">
            Reset Password
          </Text>
          <Text className="text-base text-arctic-accent text-center px-4">
            Enter your phone number to receive a reset code.
          </Text>
        </View>

        {/* Form */}
        <Input
          label="Phone Number"
          placeholder="0912 345 6789"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {error ? <Text className="text-status-rejected text-sm mb-3">{error}</Text> : null}

        <Button label="Send Code" onPress={handleSendCode} loading={loading} />

        {/* Back to login */}
        <View className="mt-6 items-center">
          <Text className="text-arctic-accent">
            Remembered your password?{' '}
            <Text
              className="text-arctic-navy font-bold"
              onPress={() => router.replace('/(auth)/login')}
            >
              Log in
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}