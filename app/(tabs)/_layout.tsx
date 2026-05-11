import { Tabs, Redirect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { theme } from "../../src/theme/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function TabsLayout() {
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
                <ActivityIndicator size="large" color={theme.colors.gold2} />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/login" />;
    }

    return (
        <Tabs
            initialRouteName="session"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.gold2,
                tabBarInactiveTintColor: "rgba(214,179,106,0.45)",
                tabBarStyle: {
                    backgroundColor: "rgba(14,10,7,0.98)",
                    borderTopColor: theme.colors.borderStrong,
                    borderTopWidth: 1.2,
                    height: 84,
                    paddingTop: 10,
                    paddingBottom: 14,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 0.4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="session"
                options={{
                    title: "Session",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cards-playing-spade" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="leaderboard"
                options={{
                    title: "Leaderboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="trophy" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bonuses"
                options={{
                    title: "Bonuses",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="gift" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="requests"
                options={{
                    title: "Actions",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="flash" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="request"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}