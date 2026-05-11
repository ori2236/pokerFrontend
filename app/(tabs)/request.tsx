import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import ThemedButton from "../../src/components/ThemedButton";
import AppModal from "../../src/components/AppModal";
import { api } from "../../src/lib/api";
import { formatAmount, formatDateTime, theme } from "../../src/theme/theme";
import { useAuth } from "../../src/context/AuthContext";

const coinImage = require("../../assets/images/doubleo-coin.png");

type PendingRequest = {
  id: number;
  request_kind: "CONVERSION" | "BONUS";
  username: string;
  conversion_type: "TO_CHIPS" | "TO_COINS" | null;
  bonus_title: string | null;
  amount_total: number;
  created_at: string;
};

export default function RequestQueueScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message?: string;
  }>({ visible: false, title: "" });

  async function loadRequests() {
    try {
      const response = await api.get("/requests/pending");
      setRequests(normalizePendingRequests(response.data));
    } catch {
      const fallback = await api.get("/conversion-requests/pending");
      setRequests(
        (Array.isArray(fallback.data) ? fallback.data : []).map((item: any) => ({
          id: Number(item.id),
          request_kind: "CONVERSION",
          username: String(item.username || ""),
          conversion_type: item.type === "TO_COINS" ? "TO_COINS" : "TO_CHIPS",
          bonus_title: null,
          amount_total: Number(item.amount_total || 0),
          created_at: item.created_at,
        })),
      );
    }
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  }

  async function approveRequest(item: PendingRequest) {
    const actionKey = `${item.request_kind}-${item.id}`;

    try {
      setLoadingKey(actionKey);

      if (item.request_kind === "BONUS") {
        await api.post(`/requests/bonus/${item.id}/approve`);
      } else {
        try {
          await api.post(`/requests/conversion/${item.id}/approve`);
        } catch {
          await api.post(`/conversion-requests/${item.id}/approve`);
        }
      }

      await loadRequests();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to approve",
        message: error?.response?.data?.message || "Failed to approve request",
      });
    } finally {
      setLoadingKey(null);
    }
  }

  async function rejectRequest(item: PendingRequest) {
    const actionKey = `${item.request_kind}-${item.id}`;

    try {
      setLoadingKey(actionKey);

      if (item.request_kind === "BONUS") {
        await api.post(`/requests/bonus/${item.id}/reject`);
      } else {
        try {
          await api.post(`/requests/conversion/${item.id}/reject`);
        } catch {
          await api.post(`/conversion-requests/${item.id}/reject`);
        }
      }

      await loadRequests();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to reject",
        message: error?.response?.data?.message || "Failed to reject request",
      });
    } finally {
      setLoadingKey(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests().catch(() => { });
    }, []),
  );

  if (user?.role !== "ADMIN") {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.title}>Approvals</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>

        <View style={styles.stack}>
          {requests.map((item) => {
            const actionKey = `${item.request_kind}-${item.id}`;

            return (
              <ThemedCard key={actionKey} glow="none">
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.username}</Text>
                    <Text style={styles.requestType}>{getRequestTypeLabel(item)}</Text>

                    {item.request_kind === "BONUS" && item.bonus_title ? (
                      <Text style={styles.bonusTitle}>{item.bonus_title}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.amount}>{formatAmount(item.amount_total)} O²</Text>
                </View>

                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>

                <View style={styles.buttonRow}>
                  <ThemedButton
                    title={loadingKey === actionKey ? "Working..." : "Approve"}
                    onPress={() => approveRequest(item)}
                    loading={loadingKey === actionKey}
                    style={styles.rowButton}
                  />
                  <ThemedButton
                    title="Reject"
                    variant="dark"
                    onPress={() => rejectRequest(item)}
                    disabled={loadingKey === actionKey}
                    style={styles.rowButton}
                  />
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

function normalizePendingRequests(payload: any): PendingRequest[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return list.map((item: any) => ({
    id: Number(item.id),
    request_kind:
      item.request_kind === "BONUS" || item.kind === "BONUS"
        ? "BONUS"
        : "CONVERSION",
    username: String(item.username || ""),
    conversion_type:
      item.request_kind === "BONUS" || item.kind === "BONUS"
        ? null
        : item.conversion_type === "TO_COINS" || item.type === "TO_COINS"
          ? "TO_COINS"
          : "TO_CHIPS",
    bonus_title: item.bonus_title ?? item.title ?? item.bonus?.title ?? null,
    amount_total: Number(item.amount_total ?? item.amount ?? item.amount_snapshot ?? 0),
    created_at: item.created_at,
  }));
}

function getRequestTypeLabel(item: PendingRequest) {
  if (item.request_kind === "BONUS") return "Bonus";
  return item.conversion_type === "TO_CHIPS" ? "Buy In" : "Cash Out";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 32,
    fontWeight: "900",
  },
  coin: {
    width: 68,
    height: 68,
  },
  stack: {
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  requestType: {
    color: theme.colors.textSoft,
    marginTop: 4,
  },
  bonusTitle: {
    color: theme.colors.gold2,
    marginTop: 6,
    fontWeight: "800",
  },
  amount: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
  },
  date: {
    color: theme.colors.muted,
    marginTop: 10,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  rowButton: {
    flex: 1,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});