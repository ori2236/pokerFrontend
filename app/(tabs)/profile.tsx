import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import ThemedButton from "../../src/components/ThemedButton";
import AppModal from "../../src/components/AppModal";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";
import { formatAmount, formatShortDate, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");

type UserRow = {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
  profile_image_base64: string | null;
};

type LeaderboardUser = {
  rank: number;
  id: number;
  username: string;
  balance: number;
};

type DailySummary = {
  date: string;
  totalIn: number;
  totalOut: number;
  net: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [balance, setBalance] = useState(0);
  const [todayNet, setTodayNet] = useState(0);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  async function loadData() {
    const [usersRes, balanceRes, leaderboardRes, summaryRes] = await Promise.all([
      api.get("/users"),
      api.get("/balances/me"),
      api.get("/balances/leaderboard"),
      api.get("/transactions/daily-summary/me"),
    ]);

    const me = usersRes.data.find((item: UserRow) => item.id === user?.id) || null;

    setProfile(me);
    setBalance(balanceRes.data.balance);
    setTodayNet(balanceRes.data.todayNet);
    setLeaderboard(leaderboardRes.data);
    setDailySummary(summaryRes.data.slice(0, 4));
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
    }, []),
  );

  async function onLogoutConfirm() {
    try {
      await logout();
      router.replace("/login");
    } catch {
      setLogoutModalVisible(false);
    }
  }

  const myRank = useMemo(() => leaderboard.find((entry) => entry.id === user?.id)?.rank ?? null, [leaderboard, user?.id]);

  const profileUri = profile?.profile_image_base64 ? `data:image/jpeg;base64,${profile.profile_image_base64}` : null;
  const isAdmin = user?.role === "ADMIN";

  const stats = [
    { label: "Balance", value: formatAmount(balance), valueColor: theme.colors.text },
    { label: "Rank", value: myRank ? `#${myRank}` : "-", valueColor: theme.colors.text },
    ...(todayNet !== 0
      ? [
          {
            label: "Today",
            value: `${todayNet > 0 ? "+" : "-"}${formatAmount(Math.abs(todayNet))}`,
            valueColor: todayNet > 0 ? theme.colors.success : theme.colors.danger,
          },
        ]
      : []),
  ];

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <ThemedCard glow="gold" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarShell}>
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>O²</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.username || user?.username}</Text>
            </View>

            <Image source={coinImage} style={styles.coin} />
          </View>

          <View style={styles.statsRow}>
            {stats.map((item) => (
              <StatBox key={item.label} label={item.label} value={item.value} valueColor={item.valueColor} />
            ))}
          </View>
        </ThemedCard>

        <ThemedCard glow="none" style={styles.sectionCard}>
          <ThemedButton title="Edit Profile" onPress={() => router.push("/edit-profile")} />
        </ThemedCard>

        {isAdmin ? (
          <ThemedCard glow="none" style={styles.sectionCard}>
            <ThemedButton title="Manual Conversion" variant="dark" onPress={() => router.push("/admin-conversion")} />
          </ThemedCard>
        ) : null}

        {dailySummary.length > 0 ? (
          <ThemedCard glow="none" style={styles.sectionCard}>
            <View style={styles.summaryStack}>
              {dailySummary.map((item) => (
                <View key={item.date} style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryDate}>{formatShortDate(item.date)}</Text>
                    <Text style={styles.summarySub}>In {formatAmount(item.totalIn)} · Out {formatAmount(item.totalOut)}</Text>
                  </View>
                  <Text style={[styles.summaryNet, { color: item.net >= 0 ? theme.colors.success : theme.colors.danger }]}>
                    {item.net >= 0 ? "+" : "-"}
                    {formatAmount(Math.abs(item.net))}
                  </Text>
                </View>
              ))}
            </View>
          </ThemedCard>
        ) : null}

        <View style={styles.logoutWrap}>
          <ThemedButton title="Log Out" variant="ghost" onPress={() => setLogoutModalVisible(true)} />
        </View>
      </ScreenContainer>

      <AppModal
        visible={logoutModalVisible}
        title="Log out?"
        onConfirm={onLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
        confirmLabel="Log Out"
      />
    </>
  );
}

function StatBox({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarShell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    borderWidth: 1.4,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.12)",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(214,179,106,0.12)",
  },
  avatarFallbackText: {
    color: theme.colors.gold2,
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  coin: {
    width: 56,
    height: 56,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.07)",
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    color: theme.colors.gold2,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  sectionCard: {
    marginBottom: 14,
  },
  summaryStack: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryDate: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  summarySub: {
    color: theme.colors.textSoft,
    marginTop: 4,
  },
  summaryNet: {
    fontSize: 18,
    fontWeight: "900",
  },
  logoutWrap: {
    marginTop: 2,
  },
});
