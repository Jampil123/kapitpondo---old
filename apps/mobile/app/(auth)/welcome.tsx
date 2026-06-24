import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  const steps: { n: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { n: '1', label: 'Submit a valid ID', icon: 'card-outline' },
    { n: '2', label: 'Admin reviews it', icon: 'search-outline' },
    { n: '3', label: "You're verified", icon: 'shield-checkmark-outline' },
  ];

  const unlocks: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { icon: 'people-outline', label: 'Join a cooperative group' },
    { icon: 'wallet-outline', label: 'Make contributions to the fund' },
    { icon: 'cash-outline', label: 'Request loans from your group' },
    { icon: 'bar-chart-outline', label: 'Track your savings and dividends' },
  ];

  return (
    <View className="flex-1 bg-arctic-base">
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} className="px-5 pt-16">
        {/* Welcome hero */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-arctic-navy text-center mb-2">
            You're in! Welcome to KapitPondo.
          </Text>
          <Text className="text-base text-arctic-accent text-center">
            Your account is ready. One quick step unlocks everything.
          </Text>
        </View>

        {/* Steps */}
        <View className="mb-8">
          <Text className="text-xl font-bold text-arctic-navy mb-1">Get verified</Text>
          <Text className="text-sm text-arctic-accent mb-4">
            It takes 3 easy steps — all you need is one valid ID.
          </Text>

          <View className="flex-row justify-between">
            {steps.map((s) => (
              <View key={s.n} className="items-center flex-1">
                <View className="w-20 h-20 bg-arctic-card rounded-3xl items-center justify-center mb-2">
                  <Ionicons name={s.icon} size={36} color="#1A3A4A" />
                </View>
                <Text className="text-xs text-arctic-navy text-center font-medium px-1">
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* What verification unlocks */}
        <View>
          <Text className="text-xl font-bold text-arctic-navy mb-4">
            Unlock everything on KapitPondo
          </Text>
          <View className="gap-3">
            {unlocks.map((u) => (
              <View
                key={u.label}
                className="flex-row items-center gap-4 bg-white border border-arctic-card rounded-2xl p-4"
              >
                <View className="w-10 h-10 bg-arctic-card rounded-full items-center justify-center">
                  <Ionicons name={u.icon} size={20} color="#1A3A4A" />
                </View>
                <Text className="flex-1 text-base text-arctic-navy">{u.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#7FA6B8" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed footer actions */}
      <View className="absolute bottom-0 left-0 w-full px-5 pb-8 pt-4 bg-arctic-base border-t border-arctic-card gap-3">
        {/* <Button
          label="Verify now"
          onPress={() => router.push('/(auth)/identity-submission')}
        /> */}
        <Pressable onPress={() => router.replace('/(member)/dashboard')} className="py-2">
          <Text className="text-arctic-accent text-center font-medium">Do it later</Text>
        </Pressable>
      </View>
    </View>
  );
}