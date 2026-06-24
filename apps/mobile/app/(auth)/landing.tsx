import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Pressable, Platform } from 'react-native';

const NATIVE_DRIVER = Platform.OS !== 'web';
import { useRouter } from 'expo-router';

export default function LandingScreen() {
  const router = useRouter();
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle float for the hero card (replaces web mouse-tilt + float keyframes)
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -16, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(float, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE_DRIVER }),
      ])
    ).start();
  }, []);

  return (
    <View className="flex-1 bg-[#0a1114] px-5 justify-between py-12">
      {/* Brand header */}
      <View className="flex-row items-center justify-center gap-2 pt-6">
        <Text className="text-2xl font-bold text-[#c3f5ff] tracking-tight">KapitPondo</Text>
      </View>

      {/* Hero */}
      <View className="items-center">
        {/* Glow behind the card */}
        <View className="absolute w-72 h-72 rounded-full bg-[#00e5ff]/10" />

        <Animated.View
          style={{ transform: [{ translateY: float }, { rotate: '-2deg' }] }}
          className="w-72 h-44 bg-[#242b2e] rounded-2xl p-6 justify-between border border-[#00e5ff]/20 mb-12"
        >
          <View className="flex-row justify-between items-start">
            <View className="w-12 h-10 bg-[#00e5ff]/20 rounded-lg items-center justify-center border border-[#00e5ff]/40">
              <View className="w-8 h-6 bg-[#00e5ff] rounded" />
            </View>
            <View className="w-6 h-6 rounded-full bg-[#9cf0ff]/20" />
          </View>
          <View className="gap-2">
            <View className="h-2 w-24 bg-[#9cf0ff]/20 rounded-full" />
            <View className="h-2 w-16 bg-[#9cf0ff]/20 rounded-full" />
          </View>
        </Animated.View>

        {/* Headline */}
        <Text className="text-3xl font-extrabold text-[#dde3e8] text-center tracking-tight px-2">
          Grow your community wealth with{' '}
          <Text className="text-[#00e5ff]">KapitPondo</Text>
        </Text>
        <Text className="text-base text-[#bac9cc] text-center mt-4 px-4">
          A secure platform for shared savings and community-driven financial growth.
        </Text>
      </View>

      {/* Actions + honest footer */}
      <View className="gap-4">
        <Pressable
          onPress={() => router.push('/(auth)/signup')}
          className="w-full h-14 bg-[#00e5ff] rounded-full items-center justify-center active:opacity-90"
        >
          <Text className="text-[#00363d] font-bold text-base">Start an account</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="w-full h-14 bg-[#242b2e] rounded-full items-center justify-center border border-[#3b494c] active:opacity-90"
        >
          <Text className="text-[#dde3e8] font-bold text-base">Log In</Text>
        </Pressable>

        {/* Honest replacement for the false BSP/PDIC line */}
        <Text className="text-[11px] text-[#bac9cc]/70 text-center mt-3 px-4 leading-4 tracking-wide">
          KapitPondo helps cooperatives record and manage shared funds transparently.
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}