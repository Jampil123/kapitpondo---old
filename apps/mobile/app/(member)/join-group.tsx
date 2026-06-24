import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Button } from '../../src/components/ui/Button';

export default function JoinGroupScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    setError('');
    if (code.trim().length < 4) {
      setError('Please enter a valid fund code.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/memberships/join', { fund_code: code.trim() });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Could not join. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-arctic-base items-center justify-center px-6">
        <View className="w-24 h-24 rounded-full bg-arctic-card items-center justify-center mb-6">
          <Ionicons name="checkmark-circle-outline" size={56} color="#1A3A4A" />
        </View>
        <Text className="text-2xl font-bold text-arctic-navy text-center mb-2">
          Request Sent
        </Text>
        <Text className="text-base text-arctic-accent text-center mb-8 px-4">
          Your request to join has been sent. A group officer will review and
          approve it shortly.
        </Text>
        {/* <Button label="Back to Home" onPress={() => router.replace('/(member)/home')} /> */}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-arctic-base"
    >
      {/* Header */}
      <View className="flex-row items-center px-5 h-16 mt-8">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-arctic-card items-center justify-center mr-3">
          <Ionicons name="arrow-back" size={22} color="#1A3A4A" />
        </Pressable>
        <Text className="text-xl font-bold text-arctic-navy">Join a Group</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-5" keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View className="items-center mt-6 mb-8">
          <View className="w-20 h-20 rounded-3xl bg-arctic-card items-center justify-center mb-4">
            <Ionicons name="people-outline" size={40} color="#1A3A4A" />
          </View>
          <Text className="text-2xl font-bold text-arctic-navy mb-2 text-center">Secure Your Spot</Text>
          <Text className="text-base text-arctic-accent text-center px-2">
            Enter the unique code provided by your group officer to start saving together.
          </Text>
        </View>

        {/* Card */}
        <View className="bg-arctic-card rounded-3xl p-5 gap-4">
          <Text className="text-xs font-semibold text-arctic-navy uppercase tracking-wider px-1">
            Fund Code
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="e.g. KP-882-XYZ"
            placeholderTextColor="#7FA6B8"
            autoCapitalize="characters"
            maxLength={12}
            className="bg-arctic-base rounded-2xl py-4 px-4 text-xl font-bold text-arctic-navy text-center tracking-[4px]"
          />

          <View className="flex-row items-start gap-2 bg-white/40 p-3 rounded-xl">
            <Ionicons name="information-circle-outline" size={20} color="#1A3A4A" />
            <Text className="flex-1 text-sm text-arctic-navy leading-5">
              Fund codes are unique to each savings circle. If you don't have one,
              contact your cooperative's treasurer.
            </Text>
          </View>

          {error ? <Text className="text-status-rejected text-sm">{error}</Text> : null}

          <Button label="Join Group" onPress={handleJoin} loading={loading} />
        </View>

        {/* Secondary actions */}
        <View className="mt-6 gap-4 pb-8">
          <Pressable
            className="bg-white border border-arctic-card p-4 rounded-3xl"
          >
            <Ionicons name="add-circle-outline" size={28} color="#1A3A4A" style={{ marginBottom: 4 }} />
            <Text className="font-semibold text-arctic-navy">Need a new group?</Text>
            <Text className="text-sm text-arctic-accent">
              Start your own KapitPondo savings circle and invite others.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setError('QR scanning is coming soon.')}
            className="bg-white border border-arctic-card p-4 rounded-3xl opacity-70"
          >
            <Ionicons name="camera-outline" size={28} color="#1A3A4A" style={{ marginBottom: 4 }} />
            <Text className="font-semibold text-arctic-navy">Scan QR Code</Text>
            <Text className="text-sm text-arctic-accent">
              Quickly join by scanning the group's invitation QR. (Coming soon)
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
