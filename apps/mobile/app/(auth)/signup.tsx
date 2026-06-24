import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // local part only, e.g. 912 345 6789
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');

    if (!firstName || !lastName || !birthday || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      setError('Birthday must be in format YYYY-MM-DD.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Build E.164 phone from the local part
    const localDigits = phone.replace(/\D/g, '').replace(/^0/, '');
    const e164Phone = `+63${localDigits}`;

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        phone: e164Phone,
        password,
        options: {
          data: {
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            full_name: fullName,
            birthday,
            email: email || null,
          },
        },
      });

      if (signUpError) {
        const isServerError =
          signUpError.status === 500 ||
          signUpError.name === 'AuthRetryableFetchError';
        setError(
          isServerError
            ? 'Unable to reach the server. Please try again later.'
            : signUpError.message || 'Could not create account. Please try again.'
        );
        return;
      }
      router.replace({ pathname: '/(auth)/otp', params: { phone: e164Phone } });
    } catch (e: any) {
      setError(
        typeof e?.message === 'string' && e.message
          ? e.message
          : 'Something went wrong. Please try again.'
      );
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
        className="px-5 pt-24 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-2">
          <Text className="text-3xl font-bold text-arctic-navy ">Create Account</Text>
        </View>

        <View className="bg-white rounded-3xl p-6 border border-arctic-card">
          <Input label="First Name" placeholder="Juan" value={firstName} onChangeText={setFirstName} />
          <Input label="Middle Name (optional)" placeholder="Santos" value={middleName} onChangeText={setMiddleName} />
          <Input label="Last Name" placeholder="Dela Cruz" value={lastName} onChangeText={setLastName} />

          <Input
            label="Birthday"
            placeholder="YYYY-MM-DD"
            value={birthday}
            onChangeText={setBirthday}
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="Email (optional)"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Text className="text-arctic-accent text-xs -mt-2 mb-4">
            We'll verify your email after you register.
          </Text>

          {/* Mobile number with fixed +63 prefix */}
          <Text className="text-arctic-navy font-medium mb-2">Mobile Number</Text>
          <View className="flex-row items-center bg-arctic-card rounded-xl px-4 mb-4">
            <Text className="text-arctic-navy font-semibold mr-2">+63</Text>
            <View className="w-px h-6 bg-arctic-accent/40 mr-3" />
            <TextInput
              placeholder="912 345 6789"
              placeholderTextColor="#7FA6B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              className="flex-1 py-4 text-arctic-navy"
            />
          </View>

          <Input
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)} className="mb-2 -mt-2">
            <Text className="text-arctic-accent text-sm">
              {showPassword ? 'Hide passwords' : 'Show passwords'}
            </Text>
          </Pressable>

          {error ? <Text className="text-status-rejected text-sm mb-3">{error}</Text> : null}

          <Button label="Create Account" onPress={handleSignup} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}