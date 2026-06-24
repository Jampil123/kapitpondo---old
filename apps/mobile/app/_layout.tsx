import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  const systemScheme = useSystemColorScheme();

  useEffect(() => {
    setColorScheme(systemScheme === "dark" ? "dark" : "light");
  }, [systemScheme]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Stack screenOptions={{ animation: Platform.OS === "web" ? "none" : "default" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(member)" options={{ headerShown: false }} />
        <Stack.Screen name="(officer)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
