import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import SpinningCoin from "../../src/components/SpinningCoin";
import ThemedCard from "../../src/components/ThemedCard";
import AvatarWithCoins, { AvatarPlayer } from "../../src/components/AvatarWithCoins";
import PlayerProfileModal, { PlayerProfileEntry } from "../../src/components/PlayerProfileModal";
import { api } from "../../src/lib/api";
import { formatAmount, theme } from "../../src/theme/theme";

const appCoinImage = require("../../assets/images/doubleo-coin.png");

type Entry = AvatarPlayer & {
  rank: number;
  id: number;
  username: string;
  balance: number;
  todayNet?: number;
};

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PlayerProfileEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const response = await api.get("/balances/leaderboard");
    setEntries(response.data || []);
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
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <SpinningCoin source={appCoinImage} size={66} style={styles.coin} />
        </View>

        <View style={styles.stack}>
          {list.map((entry) => (
            <RankRow key={entry.id} entry={entry} onPress={() => setSelectedEntry(entry as PlayerProfileEntry)} />
          ))}

          {list.length === 0 ? (
            <ThemedCard glow="none">
              <Text style={styles.empty}>No players yet.</Text>
            </ThemedCard>
          ) : null}
        </View>
      </ScreenContainer>

      <PlayerProfileModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </>
  );
}

function RankRow({ entry, onPress }: { entry: Entry; onPress: () => void }) {
  const isTop3 = entry.rank <= 3;

  const gradient =
    entry.rank === 1
      ? theme.gradients.gold
      : entry.rank === 2
        ? theme.gradients.silverCard
        : entry.rank === 3
          ? theme.gradients.bronzeCard
          : theme.gradients.card;

  const nameSize = getNameFontSize(entry.username, isTop3);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowPressable, pressed ? styles.rowPressed : null]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.rowShell, isTop3 && styles.rowShellTop]}
      >
        <View style={[styles.row, isTop3 && styles.rowTop]}>
          <Text style={[styles.rankDisplay, isTop3 && styles.rankDisplayTop]}>{entry.rank}</Text>

          <View style={[styles.avatarWrap, isTop3 && styles.avatarWrapTop]}>
            <AvatarWithCoins
              player={entry}
              size={isTop3 ? 55 : 50}
              coinSize={isTop3 ? 31 : 27}
              winnerSize={isTop3 ? 38 : 30}
              enableImageToggle={false}
            />
          </View>

          <View style={styles.nameWrap}>
            <Text
              style={[styles.rowName, isTop3 && styles.rowNameTop, { fontSize: nameSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.74}
              ellipsizeMode="tail"
            >
              {entry.username}
            </Text>
          </View>

          <View style={styles.balanceWrap}>
            <Text
              style={[styles.rowBalance, isTop3 && styles.rowBalanceTop]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {formatAmount(entry.balance)}
            </Text>
            <Image source={appCoinImage} style={styles.rowBalanceCoin} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function getNameFontSize(name: string, isTop3: boolean) {
  const base = isTop3 ? 19 : 17;
  if (name.length > 18) return base - 3;
  if (name.length > 12) return base - 2;
  if (name.length > 9) return base - 1;
  return base;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 32,
    fontWeight: "900",
  },
  coin: {
    width: 66,
    height: 66,
  },
  stack: {
    gap: 9,
  },
  rowPressable: {
    borderRadius: theme.radius.lg,
  },
  rowPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
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
    minHeight: 84,
    paddingLeft: 13,
    paddingRight: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  rowTop: {
    minHeight: 94,
  },
  rankDisplay: {
    marginLeft: 5,
    width: 30,
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "left",
  },
  rankDisplayTop: {
    marginLeft: 0,
    width: 36,
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 44,
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  avatarWrap: {
    marginTop: 8,
    marginLeft: 5,
    marginRight: 13,
  },
  avatarWrapTop: {
    marginLeft: -2,
    marginRight: 16,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 6,
  },
  rowName: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  rowNameTop: {
    color: theme.colors.text,
  },
  balanceWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 62,
    marginLeft: 2,
  },
  rowBalance: {
    color: theme.colors.gold2,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  rowBalanceTop: {
    fontSize: 17,
    color: theme.colors.text,
  },
  rowBalanceCoin: {
    width: 17,
    height: 17,
    marginLeft: 5,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
