import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import SpinningCoin from "../../src/components/SpinningCoin";
import ThemedCard from "../../src/components/ThemedCard";
import AppModal from "../../src/components/AppModal";
import { api } from "../../src/lib/api";
import {
  BonusRow,
  fetchBonuses,
  getErrorMessage,
} from "../../src/lib/bonusApi";
import { formatAmount, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");
const BONUS_LIMIT = 300;

export default function BonusesScreen() {
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message?: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });
  const [loadError, setLoadError] = useState("");

  const eligible = balance < BONUS_LIMIT;
  const amountToUnlock = Math.max(balance - (BONUS_LIMIT - 1), 0);

  const loadData = useCallback(async () => {
    try {
      const [balanceRes, bonusesData] = await Promise.all([
        api.get("/balances/me"),
        fetchBonuses(false),
      ]);

      setBalance(Number(balanceRes.data?.balance || 0));
      setBonuses(
        bonusesData
          .filter((item) => item.isActive)
          .sort((a, b) => a.amount - b.amount),
      );
      setLoadError("");
    } catch (error: any) {
      setLoadError(getErrorMessage(error, "Unable to load bonuses right now."));
      setBonuses([]);
    }
  }, []);

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
      loadData().catch(() => { });
    }, [loadData]),
  );

  async function requestBonus(item: BonusRow) {
    if (!eligible) {
      setFeedback({
        visible: true,
        title: "Not allowed",
        message: `Only members under ${BONUS_LIMIT} O² can request this bonus.`,
      });
      return;
    }

    if (item.hasPendingRequest) {
      setFeedback({
        visible: true,
        title: "Already requested",
        message: "A request for this bonus was already sent.",
      });
      return;
    }

    try {
      setLoadingId(item.id);
      await api.post(`/bonuses/${item.id}/request`);
      await loadData();
      setFeedback({
        visible: true,
        title: "Request sent",
        message: "The admin can now approve or reject this bonus request.",
      });
    } catch (error: any) {
      const status = error?.response?.status;
      setFeedback({
        visible: true,
        title: status === 409 ? "Already requested" : "Unable to send request",
        message:
          status === 409
            ? "A request for this bonus was already sent."
            : getErrorMessage(error, "Failed to send bonus request."),
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Bonuses</Text>
          </View>
          <SpinningCoin source={coinImage} size={74} style={styles.coin} />
        </View>

        <ThemedCard glow="none" style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <View style={styles.infoHeadingWrap}>
              <Text style={styles.infoEyebrow}>BONUS ACCESS</Text>
              <Text style={styles.infoTitle}>
                Bonuses are open for players under {BONUS_LIMIT} O²
              </Text>
            </View>

            <View
              style={[
                styles.accessBadge,
                eligible ? styles.accessBadgeOpen : styles.accessBadgeLocked,
              ]}
            >
              <Text
                style={[
                  styles.accessBadgeText,
                  eligible ? styles.accessBadgeTextOpen : styles.accessBadgeTextLocked,
                ]}
              >
                {eligible ? "Open" : "Locked"}
              </Text>
            </View>
          </View>

          <View style={styles.infoStatsRow}>
            <View style={styles.infoStatBox}>
              <Text style={styles.infoStatValue}>Current balance: {formatAmount(balance)} O²</Text>
            </View>
          </View>
        </ThemedCard>

        {loadError ? (
          <ThemedCard glow="none" style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Could not load bonuses</Text>
            <Text style={styles.noticeText}>{loadError}</Text>
          </ThemedCard>
        ) : null}

        <View style={styles.list}>
          {bonuses.map((item) => {
            const disabled =
              !eligible || item.hasPendingRequest || loadingId === item.id;

            const buttonTitle =
              loadingId === item.id
                ? ""
                : item.hasPendingRequest
                  ? "Pending"
                  : eligible
                    ? "Request"
                    : "Locked";

            const descriptionText = item.description?.trim() || "No description available.";

            return (
              <View key={item.id} style={styles.cardWrap}>
                <ThemedCard glow="none" style={styles.bonusCard}>
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.bonusImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>O²</Text>
                    </View>
                  )}

                  <View style={styles.cardBody}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={[styles.bonusTitleCard, getTextDirectionStyle(item.title)]}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.bonusAmountCard}>{formatAmount(item.amount)} O²</Text>

                    <Text
                      numberOfLines={3}
                      ellipsizeMode="tail"
                      style={[styles.descriptionCard, getTextDirectionStyle(descriptionText)]}
                    >
                      {descriptionText}
                    </Text>
                  </View>

                  <BonusActionButton
                    title={buttonTitle}
                    disabled={disabled}
                    loading={loadingId === item.id}
                    active={eligible && !item.hasPendingRequest}
                    onPress={() => requestBonus(item)}
                    compact
                  />
                </ThemedCard>
              </View>
            );
          })}
        </View>

        {!loadError && bonuses.length === 0 ? (
          <ThemedCard glow="none" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bonuses are available right now</Text>
            <Text style={styles.emptyText}>Pull to refresh and try again in a moment.</Text>
          </ThemedCard>
        ) : null}
      </ScreenContainer>

      <AppModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        onConfirm={() => setFeedback({ visible: false, title: "", message: "" })}
        confirmLabel="Close"
      />
    </>
  );
}

function BonusActionButton({
  title,
  disabled,
  loading,
  active,
  onPress,
  compact = false,
}: {
  title: string;
  disabled: boolean;
  loading: boolean;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const textColor = active ? "#1a130b" : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        compact ? styles.actionButtonCompact : null,
        active ? styles.actionButtonActive : styles.actionButtonInactive,
        disabled ? styles.actionButtonDisabled : null,
        pressed && !disabled ? styles.actionButtonPressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          style={[
            styles.actionButtonText,
            compact ? styles.actionButtonTextCompact : null,
            active ? styles.actionButtonTextActive : styles.actionButtonTextInactive,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

function getTextDirectionStyle(text: string) {
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  return hasHebrew
    ? {
      textAlign: "right" as const,
      writingDirection: "rtl" as const,
    }
    : {
      textAlign: "left" as const,
      writingDirection: "ltr" as const,
    };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.textSoft,
    marginTop: 8,
    lineHeight: 22,
    fontSize: 15,
    maxWidth: 260,
  },
  coinWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,179,106,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coin: {
    width: 74,
    height: 74,
  },
  infoCard: {
    marginBottom: 16,
    paddingVertical: 16,
  },
  infoTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  infoHeadingWrap: {
    flex: 1,
  },
  infoEyebrow: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  infoTitle: {
    color: theme.colors.gold2,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  accessBadge: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  accessBadgeOpen: {
    backgroundColor: "rgba(214,179,106,0.12)",
    borderColor: theme.colors.gold2,
  },
  accessBadgeLocked: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: theme.colors.borderStrong,
  },
  accessBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  accessBadgeTextOpen: {
    color: theme.colors.gold2,
  },
  accessBadgeTextLocked: {
    color: theme.colors.textSoft,
  },
  infoText: {
    color: theme.colors.textSoft,
    marginTop: 12,
    lineHeight: 22,
    fontSize: 15,
  },
  infoStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  infoStatBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoStatLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  infoStatValue: {
    color: theme.colors.gold2,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  noticeCard: {
    marginBottom: 16,
  },
  noticeTitle: {
    color: theme.colors.gold2,
    fontSize: 18,
    fontWeight: "900",
  },
  noticeText: {
    color: theme.colors.textSoft,
    marginTop: 8,
    lineHeight: 21,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardWrap: {
    width: "48.2%",
    marginBottom: 14,
  },
  bonusCard: {
    padding: 12,
    minHeight: 318,
    overflow: "hidden",
  },
  cardStatusRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  cardStatusBadge: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardStatusBadgeOpen: {
    backgroundColor: "rgba(214,179,106,0.12)",
    borderColor: theme.colors.gold2,
  },
  cardStatusBadgeLocked: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: theme.colors.borderStrong,
  },
  cardStatusBadgePending: {
    backgroundColor: "rgba(214,179,106,0.1)",
    borderColor: theme.colors.borderStrong,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardStatusTextOpen: {
    color: theme.colors.gold2,
  },
  cardStatusTextLocked: {
    color: theme.colors.textSoft,
  },
  cardStatusTextPending: {
    color: theme.colors.gold2,
  },
  bonusImage: {
    width: "100%",
    height: 120,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,179,106,0.08)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imagePlaceholderText: {
    color: theme.colors.gold2,
    fontWeight: "900",
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
    marginTop: 12,
  },
  bonusTitleCard: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    minHeight: 44,
  },
  bonusAmountCard: {
    color: theme.colors.gold2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  descriptionCard: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    minHeight: 54,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1.2,
    width: "100%",
  },
  actionButtonCompact: {
    minHeight: 44,
  },
  actionButtonActive: {
    backgroundColor: theme.colors.gold2,
    borderColor: theme.colors.gold2,
  },
  actionButtonInactive: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: theme.colors.borderStrong,
  },
  actionButtonDisabled: {
    opacity: 0.96,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  actionButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  actionButtonTextCompact: {
    fontSize: 13,
  },
  actionButtonTextActive: {
    color: "#1a130b",
  },
  actionButtonTextInactive: {
    color: theme.colors.text,
  },
  emptyCard: {
    paddingVertical: 22,
  },
  emptyTitle: {
    color: theme.colors.gold2,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
});
