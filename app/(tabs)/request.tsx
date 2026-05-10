import { useCallback, useMemo, useState } from "react";
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
  username: string;
  type: "TO_CHIPS" | "TO_COINS";
  amount_total: number;
  created_at: string;
};

export default function RequestQueueScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: "" });

  async function loadRequests() {
    const response = await api.get("/conversion-requests/pending");
    setRequests(response.data);
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  }

  async function approveRequest(id: number) {
    try {
      setLoadingId(id);
      await api.post(`/conversion-requests/${id}/approve`);
      await loadRequests();
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to approve", message: error?.response?.data?.message || "Failed to approve request" });
    } finally {
      setLoadingId(null);
    }
  }

  async function rejectRequest(id: number) {
    try {
      setLoadingId(id);
      await api.post(`/conversion-requests/${id}/reject`);
      await loadRequests();
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to reject", message: error?.response?.data?.message || "Failed to reject request" });
    } finally {
      setLoadingId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests().catch(() => {});
    }, []),
  );

  const counts = useMemo(() => {
    return {
      buyIn: requests.filter((item) => item.type === "TO_CHIPS").length,
      cashOut: requests.filter((item) => item.type === "TO_COINS").length,
    };
  }, [requests]);

  if (user?.role !== "ADMIN") {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.title}>Request</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>

        <View style={styles.metricRow}>
          <MetricCard label="Pending" value={String(requests.length)} />
          <MetricCard label="Buy In" value={String(counts.buyIn)} />
          <MetricCard label="Cash Out" value={String(counts.cashOut)} />
        </View>

        <View style={styles.stack}>
          {requests.map((item) => (
            <ThemedCard key={item.id} glow="none">
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.username}</Text>
                  <Text style={styles.requestType}>{item.type === "TO_CHIPS" ? "Buy In" : "Cash Out"}</Text>
                </View>
                <Text style={styles.amount}>{formatAmount(item.amount_total)} O²</Text>
              </View>

              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>

              <View style={styles.buttonRow}>
                <ThemedButton
                  title={loadingId === item.id ? "Working..." : "Approve"}
                  onPress={() => approveRequest(item.id)}
                  loading={loadingId === item.id}
                />
                <ThemedButton
                  title="Reject"
                  variant="dark"
                  onPress={() => rejectRequest(item.id)}
                  disabled={loadingId === item.id}
                />
              </View>
            </ThemedCard>
          ))}

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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <ThemedCard glow="none" style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </ThemedCard>
  );
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
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
    fontSize: 11,
  },
  metricValue: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
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
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
