import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in.');

      // Resolve auth user → members row
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
      if (memberErr || !member) throw new Error('Member profile not found. Please contact support.');

      const code = fundCode.trim() || generateCode();

      const { data: group, error: rpcErr } = await supabase.rpc('create_group_with_owner', {
        p_name: name.trim(),
        p_fund_code: code,
        p_owner_member_id: member.id,
        p_description: description.trim() || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setCreatedCode(group?.fund_code || code);
    } catch (e: any) {
      setError(e.message || 'Could not create the group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state — show the code to share with members
  if (createdCode) {
    return (
      <View className="flex-1 bg-arctic-base items-center justify-center px-6">
        <View className="w-24 h-24 rounded-full bg-arctic-card items-center justify-center mb-6">
          <Ionicons name="checkmark-circle-outline" size={56} color="#1A3A4A" />
        </View>
        <Text className="text-2xl font-bold text-arctic-navy text-center mb-2">
          Group Created
        </Text>
        <Text className="text-base text-arctic-accent text-center mb-6 px-4">
          Share this fund code so members can join your group:
        </Text>
        <View className="bg-arctic-card rounded-2xl px-8 py-5 mb-8">
          <Text className="text-2xl font-bold text-arctic-navy tracking-[4px]">{createdCode}</Text>
        </View>
        <Button label="Go to Home" onPress={() => router.replace('/(officer)/owner-dashboard')} />
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
        <Text className="text-xl font-bold text-arctic-navy">Create a Group</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5" keyboardShouldPersistTaps="handled">
        {/* Intro */}
        <View className="mb-6 mt-2">
          <Text className="text-2xl font-bold text-arctic-navy mb-1">Start a new collective</Text>
          <Text className="text-base text-arctic-accent">
            Fill in the details to create your communal savings group.
          </Text>
        </View>

        {/* Group name */}
        <Text className="text-xs font-semibold text-arctic-navy uppercase tracking-wider mb-2 ml-1">
          Group Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Barangay Unity Fund"
          placeholderTextColor="#7FA6B8"
          className="bg-arctic-card rounded-xl h-14 px-4 text-arctic-navy mb-5"
        />

        {/* Fund code (optional) */}
        <Text className="text-xs font-semibold text-arctic-navy uppercase tracking-wider mb-2 ml-1">
          Fund Code (optional)
        </Text>
        <View className="flex-row gap-3 mb-1">
          <TextInput
            value={fundCode}
            onChangeText={(t) => setFundCode(t.toUpperCase())}
            placeholder="ABC-123-XYZ"
            placeholderTextColor="#7FA6B8"
            autoCapitalize="characters"
            className="flex-1 bg-arctic-card rounded-xl h-14 px-4 text-arctic-navy"
          />
          <Pressable
            onPress={() => setFundCode(generateCode())}
            className="h-14 px-5 bg-arctic-card rounded-xl items-center justify-center"
          >
            <Ionicons name="refresh-outline" size={22} color="#1A3A4A" />
          </Pressable>
        </View>
        <Text className="text-sm text-arctic-accent mb-5 px-1">
          Members use this code to join. Leave blank to auto-generate.
        </Text>

        {/* Description */}
        <Text className="text-xs font-semibold text-arctic-navy uppercase tracking-wider mb-2 ml-1">
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Group goals, contribution schedule, rules..."
          placeholderTextColor="#7FA6B8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="bg-arctic-card rounded-xl p-4 text-arctic-navy mb-5 h-28"
        />

        {/* Private toggle (visual; wire to backend only if schema supports it) */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 pr-4">
            <Text className="text-base text-arctic-navy">Private Group</Text>
            <Text className="text-sm text-arctic-accent">Only invited members can find this group</Text>
          </View>
          <Pressable
            onPress={() => setIsPrivate((p) => !p)}
            className={`w-12 h-7 rounded-full justify-center px-1 ${isPrivate ? 'bg-arctic-navy' : 'bg-arctic-accent/40'}`}
          >
            <View className={`w-5 h-5 bg-white rounded-full ${isPrivate ? 'self-end' : 'self-start'}`} />
          </Pressable>
        </View>

        {error ? <Text className="text-status-rejected text-sm mb-3">{error}</Text> : null}

        <Button label="Create Group" onPress={handleCreate} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}