import type React from "react";
import { Redirect, withLayoutContext } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { createMaterialTopTabNavigator, type MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { theme } from "../../src/theme/theme";
import { useAuth } from "../../src/context/AuthContext";

const tabCoinImage = require("../../assets/images/doubleo-coin.png");

const tabMeta: Record<string, { label: string; icon: (color: string) => React.ReactNode }> = {
  profile: {
    label: "Profile",
    icon: (color) => <Ionicons name="person" size={22} color={color} />,
  },
  session: {
    label: "Session",
    icon: (color) => <MaterialCommunityIcons name="cards-playing-spade" size={23} color={color} />,
  },
  leaderboard: {
    label: "Leaders",
    icon: (color) => <Ionicons name="trophy" size={22} color={color} />,
  },
  bonuses: {
    label: "Bonuses",
    icon: (color) => <Ionicons name="gift" size={22} color={color} />,
  },
  requests: {
    label: "Actions",
    icon: (color) => <Ionicons name="flash" size={22} color={color} />,
  },
};

const { Navigator } = createMaterialTopTabNavigator();
const SwipeTabs = (withLayoutContext as any)(
  Navigator,
  (screens: any[]) => screens.filter((screen) => tabMeta[screen.name]),
  true,
);

function BrandedLoader() {
  return (
    <View style={styles.loadingScreen}>
      <Image source={tabCoinImage} style={styles.loadingLogo} />
      <ActivityIndicator size="large" color={theme.colors.gold2} />
    </View>
  );
}

function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const visibleRoutes = state.routes.filter((route) => tabMeta[route.name]);

  return (
    <View style={styles.tabBarHost}>
      <View style={styles.tabBar}>
        {visibleRoutes.map((route) => {
          const originalIndex = state.routes.findIndex((item) => item.key === route.key);
          const focused = state.index === originalIndex;
          const color = focused ? theme.colors.gold2 : "rgba(214,179,106,0.45)";
          const meta = tabMeta[route.name];

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabItem}
            >
              {meta.icon(color)}
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {meta.label}
              </Text>
              {focused ? <View style={styles.activeIndicator} /> : <View style={styles.inactiveIndicator} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BrandedLoader />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <SwipeTabs
      initialRouteName="leaderboard"
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <BottomTabBar {...props} />}
      sceneContainerStyle={styles.sceneContainer}
      screenOptions={{
        swipeEnabled: true,
        lazy: false,
        lazyPreloadDistance: 4,
        lazyPlaceholder: () => <BrandedLoader />,
      }}
    >
      <SwipeTabs.Screen name="profile" />
      <SwipeTabs.Screen name="session" />
      <SwipeTabs.Screen name="leaderboard" />
      <SwipeTabs.Screen name="bonuses" />
      <SwipeTabs.Screen name="requests" />
    </SwipeTabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingLogo: {
    width: 82,
    height: 82,
  },
  sceneContainer: {
    backgroundColor: theme.colors.bg,
  },
  tabBarHost: {
    height: 112,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.bg,
  },
  tabBar: {
    height: 92,
    paddingBottom: 22,
    borderTopWidth: 1.1,
    borderTopColor: theme.colors.borderStrong,
    backgroundColor: "rgba(14,10,7,0.98)",
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 10.2,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.15,
    marginTop: 2,
  },
  activeIndicator: {
    width: 22,
    height: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.gold2,
    marginTop: 3,
  },
  inactiveIndicator: {
    width: 22,
    height: 2,
    marginTop: 3,
  },
});
