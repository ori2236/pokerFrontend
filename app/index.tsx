import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { theme } from "../src/theme/theme";

export default function IndexPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: theme.colors.bg,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" color={theme.colors.gold} />
            </View>
        );
    }

    return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}