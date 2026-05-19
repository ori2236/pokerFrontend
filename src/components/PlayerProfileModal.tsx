import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatAmount, theme } from "../theme/theme";
import AvatarWithCoins, { AvatarPlayer, formatRankPlace, getAllOwnedCoinsForDisplay } from "./AvatarWithCoins";
import CoinPreviewModal from "./CoinPreviewModal";

const appCoinImage = require("../../assets/images/doubleo-coin.png");

export type PlayerProfileEntry = AvatarPlayer & {
  id: number;
  rank: number;
  balance: number;
  todayNet?: number;
};

type RankVisual = {
  accent: string;
  accentText: string;
  modalGradient: [string, string, string];
  placeGradient: [string, string, string];
};

type Props = {
  entry: PlayerProfileEntry | null;
  onClose: () => void;
};

export default function PlayerProfileModal({ entry, onClose }: Props) {
  const [previewCoin, setPreviewCoin] = useState<{ title: string; image: any } | null>(null);

  if (!entry) return null;

  const visual = getRankVisual(entry.rank);
  const todayNet = Number(entry.todayNet || 0);
  const isProfit = todayNet > 0;
  const isLoss = todayNet < 0;
  const allCoins = getAllOwnedCoinsForDisplay(entry);
  const todayLabel = todayNet === 0 ? "0" : `${isProfit ? "+" : "-"}${formatAmount(Math.abs(todayNet))}`;
  const todayTitle = isProfit ? "Profit today" : isLoss ? "Loss today" : "Today";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <LinearGradient
          colors={visual.modalGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modalCard, { borderColor: visual.accent, shadowColor: visual.accent }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalEyebrow, { color: visual.accentText }]}>PLAYER PROFILE</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.modalAvatarSection}>
              <AvatarWithCoins
                player={entry}
                size={132}
                coinSize={54}
                winnerSize={62}
                borderColor={visual.accent}
              />

              <Text style={styles.modalName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
                {entry.username}
              </Text>

              <LinearGradient
                colors={visual.placeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.placeBanner, { borderColor: visual.accent, shadowColor: visual.accent }]}
              >
                <Text style={styles.placeBannerText}>{formatRankPlace(entry.rank)}</Text>
              </LinearGradient>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalStatsGrid}>
              <PlayerStatBox label="Balance" value={`${formatAmount(entry.balance)}`} accent={visual.accentText} showCoin />
              <PlayerStatBox
                label={todayTitle}
                value={todayLabel}
                accent={isProfit ? theme.colors.success : isLoss ? theme.colors.danger : theme.colors.text}
                showCoin
              />
              <PlayerStatBox label="Position" value={`#${entry.rank}`} accent={visual.accentText} />
            </View>

            {allCoins.length > 0 ? (
              <View style={styles.ownedCoinsSection}>
                <Text style={styles.ownedCoinsTitle}>Coins</Text>
                <View style={styles.ownedCoinsGrid}>
                  {allCoins.map((coin) => (
                    <Pressable
                      key={coin.key}
                      onPress={() => setPreviewCoin({ title: coin.label, image: coin.image })}
                      style={styles.ownedCoinItem}
                    >
                      <Image source={coin.image} style={styles.ownedCoinImage} resizeMode="contain" />
                      <Text style={styles.ownedCoinLabel} numberOfLines={2}>{coin.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </LinearGradient>

        <CoinPreviewModal
          visible={!!previewCoin}
          title={previewCoin?.title || "Coin"}
          image={previewCoin?.image || null}
          onClose={() => setPreviewCoin(null)}
        />
      </View>
    </Modal>
  );
}

function PlayerStatBox({ label, value, accent, showCoin = false }: { label: string; value: string; accent: string; showCoin?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text>
        {showCoin ? <Image source={appCoinImage} style={styles.statCoin} /> : null}
      </View>
    </View>
  );
}

function getRankVisual(rank: number): RankVisual {
  if (rank === 1) {
    return {
      accent: "#F5C96A",
      accentText: "#FFE7A4",
      modalGradient: ["#251A0B", "#090806", "#3A280D"],
      placeGradient: ["#7A4D10", "#D6B36A", "#3A270C"],
    };
  }

  if (rank === 2) {
    return {
      accent: "#D9E1EA",
      accentText: "#F1F6FB",
      modalGradient: ["#20242A", "#090A0C", "#343A42"],
      placeGradient: ["#4A515C", "#D9E1EA", "#242932"],
    };
  }

  if (rank === 3) {
    return {
      accent: "#C8895B",
      accentText: "#FFD0AA",
      modalGradient: ["#2A160B", "#0A0806", "#3E2111"],
      placeGradient: ["#6A3A1F", "#C8895B", "#2A160B"],
    };
  }

  return {
    accent: theme.colors.gold2,
    accentText: theme.colors.gold2,
    modalGradient: ["#19140D", "#080706", "#21180E"],
    placeGradient: ["#18130D", "#3A270C", "#18130D"],
  };
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 54,
  },
  modalCard: {
    width: "100%",
    maxHeight: "78%",
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 14,
    overflow: "hidden",
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  closeButtonText: {
    color: theme.colors.textSoft,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "700",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 28,
  },
  modalAvatarSection: {
    alignItems: "center",
    marginTop: 8,
  },
  modalName: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 10,
  },
  placeBanner: {
    marginTop: 10,
    minWidth: 184,
    borderRadius: theme.radius.lg,
    borderWidth: 1.3,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  placeBannerText: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.32)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 13,
  },
  modalStatsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 7,
    paddingVertical: 9,
    justifyContent: "center",
  },
  statLabel: {
    color: theme.colors.textSoft,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  statValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  statCoin: {
    width: 16,
    height: 16,
    marginLeft: 5,
  },
  ownedCoinsSection: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ownedCoinsTitle: {
    color: theme.colors.gold2,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  ownedCoinsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: 8,
    rowGap: 10,
  },
  ownedCoinItem: {
    width: "31%",
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    padding: 7,
  },
  ownedCoinImage: {
    width: 44,
    height: 44,
  },
  ownedCoinLabel: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
  },
});
