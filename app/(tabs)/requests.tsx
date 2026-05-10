import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";
import { formatAmount, formatDateTime, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");

type ScopeFilter = "mine" | "all";
type StatusFilter = "all" | "approved" | "rejected" | "pending";

type ActionRow = {
  id: string;
  action_type: "BUY_IN" | "CASH_OUT" | "BONUS";
  username: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  created_at: string;
  admin_username?: string | null;
  source_kind: "REQUEST" | "BONUS";
  session_id?: number | null;
};

export default function ActionsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actions, setActions] = useState<ActionRow[]>([]);

  async function loadData(nextScope = scope, nextStatus = statusFilter) {
    const response = await api.get(`/conversion-requests?scope=${nextScope}&status=${nextStatus}`);
    setActions(response.data);
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
    }, [scope, statusFilter]),
  );

  const counts = useMemo(
    () => ({
      total: actions.length,
      pending: actions.filter((item) => item.status === "PENDING").length,
    }),
    [actions],
  );

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.title}>Actions</Text>
        <Image source={coinImage} style={styles.coin} />
      </View>

      <View style={styles.metricsRow}>
        <MiniMetric label="Visible" value={String(counts.total)} />
        <MiniMetric label="Pending" value={String(counts.pending)} />
      </View>

      <View style={styles.filterRow}>
        <Segment active={scope === "mine"} label="Mine" onPress={() => setScope("mine")} />
        <Segment active={scope === "all"} label="All" onPress={() => setScope("all")} />
      </View>

      <View style={styles.statusGrid}>
        <SegmentGrid active={statusFilter === "all"} label="All" onPress={() => setStatusFilter("all")} />
        <SegmentGrid active={statusFilter === "pending"} label="Pending" onPress={() => setStatusFilter("pending")} />
        <SegmentGrid active={statusFilter === "approved"} label="Approved" onPress={() => setStatusFilter("approved")} />
        <SegmentGrid active={statusFilter === "rejected"} label="Rejected" onPress={() => setStatusFilter("rejected")} />
      </View>

      <View style={styles.stack}>
        {actions.map((item) => {
          const label = getActionLabel(item);
          return (
            <ThemedCard key={item.id} glow="none">
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.actionTitle}>{label}</Text>
                    {scope === "all" ? <Text style={styles.dot}>•</Text> : null}
                    {scope === "all" ? <Text style={styles.username}>{item.username}</Text> : null}
                  </View>
                </View>
                <StatusBadge item={item} />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.amount}>{formatAmount(item.amount)} O²</Text>
                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
              </View>
            </ThemedCard>
          );
        })}

        {actions.length === 0 ? (
          <ThemedCard glow="none">
            <Text style={styles.empty}>No actions match these filters.</Text>
          </ThemedCard>
        ) : null}

        {!isAdmin ? <View style={{ height: 10 }} /> : null}
      </View>
    </ScreenContainer>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <ThemedCard glow="none" style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </ThemedCard>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SegmentGrid({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentGrid, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatusBadge({ item }: { item: ActionRow }) {
  const status = item.action_type === "BONUS" ? "APPROVED" : item.status;
  const bg =
    status === "APPROVED"
      ? "rgba(88,211,155,0.15)"
      : status === "REJECTED"
        ? "rgba(255,107,129,0.15)"
        : "rgba(214,179,106,0.14)";

  const color =
    status === "APPROVED"
      ? theme.colors.success
      : status === "REJECTED"
        ? theme.colors.danger
        : theme.colors.gold2;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function getActionLabel(item: ActionRow) {
  if (item.action_type === "BONUS") return "Bonus";
  if (item.session_id === null || item.session_id === undefined) {
    return item.action_type === "BUY_IN" ? "Deposit" : "Withdraw";
  }
  return item.action_type === "BUY_IN" ? "Buy In" : "Cash Out";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
  },
  segmentGrid: {
    width: "47%",
    minHeight: 44,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
  },
  segmentActive: {
    backgroundColor: "rgba(214,179,106,0.18)",
    borderColor: theme.colors.borderStrong,
  },
  segmentInactive: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: theme.colors.border,
  },
  segmentText: {
    color: theme.colors.textSoft,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: theme.colors.gold2,
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
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.7,
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
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
