import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenContainer from "../src/components/ScreenContainer";
import ThemedCard from "../src/components/ThemedCard";
import AppModal from "../src/components/AppModal";
import { api } from "../src/lib/api";
import { formatAmount, formatDateTime, theme } from "../src/theme/theme";

const coinImage = require("../assets/images/doubleo-coin.png");

type PendingRequest = {
  id: number;
  request_kind: "CONVERSION" | "BONUS" | "COIN";
  username: string;
  conversion_type: "TO_CHIPS" | "TO_COINS" | null;
  bonus_title: string | null;
  coin_title?: string | null;
  coin_image_mime?: string | null;
  coin_image_base64?: string | null;
  amount_total: number;
  created_at: string;
};

export default function AdminRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ visible: false, title: "", message: "" });

  async function loadData() {
    const response = await api.get("/requests/pending");
    setRequests(Array.isArray(response.data) ? response.data : []);
  }

  async function loadInitial() {
    try {
      setLoading(true);
      await loadData();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Could not load requests",
        message: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
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
      loadInitial().catch(() => {});
    }, []),
  );

  async function handleDecision(item: PendingRequest, decision: "approve" | "reject") {
    const key = `${item.request_kind}-${item.id}-${decision}`;
    const requestType = item.request_kind === "BONUS" ? "bonus" : item.request_kind === "COIN" ? "coin" : "conversion";

    try {
      setActionKey(key);
      await api.post(`/requests/${requestType}/${item.id}/${decision}`);
      await loadData();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: decision === "approve" ? "Could not approve" : "Could not reject",
        message: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setActionKey(null);
    }
  }


  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.title}>Requests</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>


        {loading ? (
          <ThemedCard glow="none" style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.gold2} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </ThemedCard>
        ) : null}

        {!loading ? (
          <View style={styles.stack}>
            {requests.map((item) => {
              const label = getRequestLabel(item);
              const subtitle = getRequestSubtitle(item);
              const approveKey = `${item.request_kind}-${item.id}-approve`;
              const rejectKey = `${item.request_kind}-${item.id}-reject`;
              const isAnyActionLoading = actionKey?.startsWith(`${item.request_kind}-${item.id}-`);

              return (
                <ThemedCard key={`${item.request_kind}-${item.id}`} glow="none">
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.actionTitle}>{label}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.username} numberOfLines={1}>
                          {item.username}
                        </Text>
                      </View>

                      {subtitle ? (
                        <Text style={item.request_kind === "BONUS" || item.request_kind === "COIN" ? styles.bonusName : styles.sessionName} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>

                    {item.request_kind === "COIN" && item.coin_image_base64 ? (
                      <Image
                        source={{ uri: `data:${item.coin_image_mime || "image/png"};base64,${item.coin_image_base64}` }}
                        style={styles.requestCoinImage}
                        resizeMode="contain"
                      />
                    ) : null}

                    <StatusBadge label="PENDING" />
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.amount}>
                      {item.request_kind === "COIN" ? "Exclusive" : `${formatAmount(item.amount_total)} O²`}
                    </Text>
                    <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
                  </View>

                  <View style={styles.buttonsRow}>
                    <Pressable
                      onPress={() => handleDecision(item, "approve")}
                      disabled={isAnyActionLoading}
                      style={({ pressed }) => [
                        styles.decisionButtonPressable,
                        pressed ? styles.pressedButton : null,
                        isAnyActionLoading ? styles.disabledButton : null,
                      ]}
                    >
                      <LinearGradient
                        colors={theme.gradients.gold}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.decisionButton, styles.approveButton]}
                      >
                        {actionKey === approveKey ? (
                          <ActivityIndicator size="small" color="#1A1208" />
                        ) : (
                          <Text style={styles.approveButtonText}>Approve</Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDecision(item, "reject")}
                      disabled={isAnyActionLoading}
                      style={[styles.decisionButton, styles.rejectButton, isAnyActionLoading && styles.disabledButton]}
                    >
                      {actionKey === rejectKey ? (
                        <ActivityIndicator size="small" color={theme.colors.gold2} />
                      ) : (
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      )}
                    </Pressable>
                  </View>
                </ThemedCard>
              );
            })}

            {requests.length === 0 ? (
              <ThemedCard glow="none">
                <Text style={styles.empty}>No pending requests.</Text>
              </ThemedCard>
            ) : null}
          </View>
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


function StatusBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function getRequestLabel(item: PendingRequest) {
  if (item.request_kind === "COIN") return "Exclusive Coin";
  if (item.request_kind === "BONUS") return "Bonus";
  if (item.conversion_type === "TO_COINS") return "Cash Out";
  return "Buy In";
}

function getRequestSubtitle(item: PendingRequest) {
  if (item.request_kind === "COIN") {
    return item.coin_title ? `Request Exclusive Ownership: ${item.coin_title}` : "Request Exclusive Ownership";
  }

  if (item.request_kind === "BONUS") {
    return item.bonus_title ? `Bonus: ${item.bonus_title}` : "Bonus request";
  }

  if (item.conversion_type === "TO_COINS") {
    return "Convert chips back to Double O";
  }

  return "Convert Double O to chips";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.1,
    borderColor: theme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,179,106,0.08)",
  },
  backButtonText: {
    color: theme.colors.gold2,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: -2,
  },
  title: {
    flex: 1,
    color: theme.colors.gold2,
    fontSize: 32,
    fontWeight: "900",
  },
  coin: {
    width: 64,
    height: 64,
  },
  requestCoinImage: {
    width: 52,
    height: 52,
    marginLeft: 8,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValue: {
    color: theme.colors.gold2,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  loadingCard: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textSoft,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
  rowTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  dot: {
    color: theme.colors.muted,
  },
  username: {
    color: theme.colors.textSoft,
    fontWeight: "700",
    flexShrink: 1,
  },
  bonusName: {
    color: theme.colors.gold2,
    marginTop: 8,
    fontWeight: "800",
  },
  sessionName: {
    color: theme.colors.gold2,
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(214,179,106,0.14)",
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.7,
    color: theme.colors.gold2,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  amount: {
    color: theme.colors.gold2,
    fontSize: 20,
    fontWeight: "900",
  },
  date: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  decisionButtonPressable: {
    flex: 1,
    borderRadius: theme.radius.pill,
  },
  decisionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.1,
  },
  approveButton: {
    borderColor: "rgba(214,179,106,0.25)",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  rejectButton: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: theme.colors.borderStrong,
  },
  approveButtonText: {
    color: "#1A1208",
    fontWeight: "900",
    fontSize: 14,
  },
  rejectButtonText: {
    color: theme.colors.gold2,
    fontWeight: "900",
    fontSize: 14,
  },
  pressedButton: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.72,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
