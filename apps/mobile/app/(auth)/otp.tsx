import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode?: string }>();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError('');
    const token = code.join('');
    if (token.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone as string,
        token,
        type: 'sms',
      });
      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired code.');
        return;
      }
      if (mode === 'reset') {
        // router.replace('/(auth)/set-new-password');
      } else {
        router.replace('/(auth)/welcome');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    setError('');
    try {
      await supabase.auth.signInWithOtp({ phone: phone as string });
      setSeconds(60);
    } catch {
      setError('Could not resend the code. Please try again.');
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
        <Ionicons name="arrow-back" size={22} color="#1A3A4A" />
      </Pressable>

      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <View className="w-24 h-24 rounded-full bg-arctic-card items-center justify-center mb-6">
            <Ionicons name="phone-portrait-outline" size={48} color="#1A3A4A" />
          </View>
          <Text className="text-3xl font-bold text-arctic-navy text-center mb-2">
            Verify Your Number
          </Text>
          <Text className="text-base text-arctic-accent text-center px-2">
            Enter the 6-digit code we sent to{'\n'}
            <Text className="text-arctic-navy font-semibold">{phone}</Text>
          </Text>
        </View>

        <View className="flex-row justify-between mb-8">
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              className="w-12 h-14 bg-arctic-card rounded-xl text-center text-2xl font-bold text-arctic-navy"
            />
          ))}
        </View>

        {error ? <Text className="text-status-rejected text-sm mb-3 text-center">{error}</Text> : null}

        <Button label="Verify" onPress={handleVerify} loading={loading} />

        <View className="mt-6 items-center">
          {seconds > 0 ? (
            <Text className="text-arctic-accent">Resend code in {seconds}s</Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text className="text-arctic-navy font-bold">Resend Code</Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}