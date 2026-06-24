import { Stack } from "expo-router";

export default function OfficerLayout() {
  return (
    <Stack>
      <Stack.Screen name="owner-dashboard" options={{ headerShown: false }} />
     
    </Stack>
    
  );
}
