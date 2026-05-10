import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import { api } from "../../src/lib/api";
import { formatAmount, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");

type Entry = {
  rank: number;
  id: number;
  username: string;
  balance: number;
  profile_image_base64?: string | null;
};

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const response = await api.get("/balances/leaderboard");
    setEntries(response.data);
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

  const list = useMemo(() => entries, [entries]);

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Image source={coinImage} style={styles.coin} />
      </View>

      <View style={styles.stack}>
        {list.map((entry) => (
          <RankRow key={entry.id} entry={entry} />
        ))}

        {list.length === 0 ? (
          <ThemedCard glow="none">
            <Text style={styles.empty}>No players yet.</Text>
          </ThemedCard>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function RankRow({ entry }: { entry: Entry }) {
  const avatarUri = entry.profile_image_base64 ? `data:image/jpeg;base64,${entry.profile_image_base64}` : null;
  const isTop3 = entry.rank <= 3;
  const gradient =
    entry.rank === 1
      ? theme.gradients.gold
      : entry.rank === 2
        ? theme.gradients.silverCard
        : entry.rank === 3
          ? theme.gradients.bronzeCard
          : theme.gradients.card;

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.rowShell, isTop3 && styles.rowShellTop]}>
      <View style={styles.row}>
        <Text style={[styles.rankDisplay, isTop3 && styles.rankDisplayTop]}>{entry.rank}</Text>

        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={[styles.avatar, isTop3 && styles.avatarTop]} />
        ) : (
          <View style={[styles.avatarFallback, isTop3 && styles.avatarTop]}>
            <Text style={styles.avatarFallbackText}>{entry.username.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.nameWrap}>
          <Text style={[styles.rowName, isTop3 && styles.rowNameTop]} numberOfLines={1}>
            {entry.username}
          </Text>
        </View>

        <Text style={[styles.rowBalance, isTop3 && styles.rowBalanceTop]}>{formatAmount(entry.balance)} O²</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 32,
    fontWeight: "900",
  },
  coin: {
    width: 70,
    height: 70,
  },
  stack: {
    gap: 12,
  },
  rowShell: {
    borderRadius: theme.radius.lg,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    overflow: "hidden",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  rowShellTop: {
    borderColor: "rgba(243,228,190,0.34)",
    shadowOpacity: 0.3,
  },
  row: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rankDisplay: {
    width: 36,
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  rankDisplayTop: {
    width: 58,
    color: "#FFFFFF",
    fontSize: 46,
    lineHeight: 48,
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
  },
  avatarTop: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: theme.colors.gold2,
    fontWeight: "900",
  },
  nameWrap: {
    flex: 1,
  },
  rowName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  rowNameTop: {
    fontSize: 18,
  },
  rowBalance: {
    color: theme.colors.gold2,
    fontSize: 16,
    fontWeight: "900",
  },
  rowBalanceTop: {
    fontSize: 19,
    color: theme.colors.text,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
