import { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function SplashScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(translateY, { toValue: 0, duration: 800, useNativeDriver: NATIVE_DRIVER }),
    ]).start();

    const boot = async () => {
      const [{ data: { session } }] = await Promise.all([
        supabase.auth.getSession(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);

      if (!session) {
        router.replace('/(auth)/landing');
        return;
      }

      router.replace('/(member)/dashboard');
    };

    boot();
  }, []);

  return (
    <View className="flex-1 bg-arctic-base items-center justify-center px-6">
      <Animated.View
        style={{ opacity: fade, transform: [{ translateY }] }}
        className="items-center"
      >
        <View className="w-32 h-32 mb-6 items-center justify-center">
          <Image
            source={require('../assets/images/icon.png')}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        <Text className="text-3xl font-bold text-arctic-navy tracking-tight">
          KapitPondo
        </Text>
        <Text className="text-base text-arctic-accent mt-2 tracking-wide">
          Stronger Together, Saving Together
        </Text>

        <View className="mt-12 items-center">
          <ActivityIndicator color="#2A3E4B" />
          <Text className="mt-4 text-xs text-arctic-accent uppercase tracking-widest">
            Securing your cooperative
          </Text>
        </View>
      </Animated.View>

      <View className="absolute bottom-10 items-center opacity-60">
        <Text className="text-xs text-arctic-accent">
          Member-Owned Financial Security
        </Text>
        <Text className="text-xs text-arctic-accent mt-1">v1.0.0</Text>
      </View>
    </View>
  );
}
