import { Stack } from "expo-router";

export default function MemberLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="join-group" options={{ headerShown: false }} />
      <Stack.Screen name="create-group" options={{ headerShown: false }} />
    </Stack>
    
  );
}
