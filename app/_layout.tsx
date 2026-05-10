import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { theme } from "../src/theme/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="admin-conversion" />
        <Stack.Screen name="admin-requests" />
        <Stack.Screen name="cashout" />
      </Stack>
    </AuthProvider>
  );
}
