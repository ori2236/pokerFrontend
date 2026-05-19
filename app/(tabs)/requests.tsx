import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import { api } from "../../src/lib/api";
import { formatAmount, formatDateTime, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");

type ScopeFilter = "mine" | "all";
type StatusFilter = "all" | "pending" | "approved" | "rejected";

type ActionRow = {
  id: string;
  action_type: string;
  username: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  created_at: string;
  admin_username?: string | null;
  source_kind: string;
  direction?: "CREDIT" | "DEBIT" | string | null;
  session_id?: number | null;
  session_title?: string | null;
  bonus_title?: string | null;
};

export default function ActionsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actions, setActions] = useState<ActionRow[]>([]);

  async function loadData(nextScope = scope, nextStatus = statusFilter) {
    try {
      const response = await api.get(`/actions?scope=${nextScope}&status=${nextStatus}`);
      setActions(normalizeActionRows(response.data));
      return;
    } catch {}

    if (nextStatus === "all" || nextStatus === "approved") {
      try {
        const response = await api.get(nextScope === "all" ? "/transactions/all" : "/transactions/me");
        setActions(normalizeActionRows(response.data));
        return;
      } catch {}
    }

    const response = await api.get(`/requests/history?scope=${nextScope}&status=${nextStatus}&type=all`);
    setActions(normalizeActionRows(response.data));
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

  function changeScope(nextScope: ScopeFilter) {
    setScope(nextScope);
  }

  function changeStatus(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus);
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Actions</Text>
          <Text style={styles.subtitle}>Coin, bonus and balance history</Text>
        </View>
        <Image source={coinImage} style={styles.coin} />
      </View>

      <View style={styles.filterRow}>
        <Segment active={scope === "all"} label="All Players" onPress={() => changeScope("all")} />
        <Segment active={scope === "mine"} label="Mine" onPress={() => changeScope("mine")} />
      </View>

      <View style={styles.statusGrid}>
        <SegmentGrid active={statusFilter === "all"} label="All" onPress={() => changeStatus("all")} />
        <SegmentGrid active={statusFilter === "pending"} label="Pending" onPress={() => changeStatus("pending")} />
        <SegmentGrid active={statusFilter === "approved"} label="Approved" onPress={() => changeStatus("approved")} />
        <SegmentGrid active={statusFilter === "rejected"} label="Rejected" onPress={() => changeStatus("rejected")} />
      </View>

      <View style={styles.stack}>
        {actions.map((item) => {
          const label = getActionLabel(item);
          const showUsername = scope === "all";

          return (
            <ThemedCard key={item.id} glow="none" style={styles.actionCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.actionTitle} numberOfLines={1}>
                      {label}
                    </Text>
                    {showUsername ? <Text style={styles.dot}>•</Text> : null}
                    {showUsername ? (
                      <Text style={styles.username} numberOfLines={1}>
                        {item.username}
                      </Text>
                    ) : null}
                  </View>

                  {item.action_type === "BONUS" && item.bonus_title ? (
                    <Text style={styles.bonusName}>{item.bonus_title}</Text>
                  ) : null}

                  {item.session_title ? (
                    <Text style={styles.sessionName} numberOfLines={1}>
                      Session: {item.session_title}
                    </Text>
                  ) : null}

                  {item.note ? (
                    <Text style={styles.noteText} numberOfLines={3}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>

                <StatusBadge item={item} />
              </View>

              <View style={styles.metaRow}>
                <Text
                  style={[
                    styles.amount,
                    item.amount < 0 ? styles.amountNegative : item.amount > 0 ? styles.amountPositive : null,
                  ]}
                >
                  {item.amount < 0 ? "-" : item.amount > 0 ? "+" : ""}
                  {formatAmount(Math.abs(item.amount))} O²
                </Text>
                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
              </View>
            </ThemedCard>
          );
        })}

        {actions.length === 0 ? (
          <ThemedCard glow="none" style={styles.emptyCard}>
            <Image source={coinImage} style={styles.emptyCoin} />
            <Text style={styles.emptyTitle}>No actions found</Text>
            <Text style={styles.empty}>Actions will appear here after purchases, refunds, bonuses and requests.</Text>
          </ThemedCard>
        ) : null}

        <View style={{ height: 18 }} />
      </View>
    </ScreenContainer>
  );
}

function normalizeActionRows(payload: any): ActionRow[] {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

  return list.map((item: any) => {
    const direction = item.direction ?? null;
    const rawAmount = Number(item.amount ?? item.amount_total ?? item.amount_snapshot ?? 0);
    const signedAmount = direction === "DEBIT" ? -Math.abs(rawAmount) : rawAmount;
    const actionType = String(item.action_type || item.transaction_type || item.type || "TRANSACTION");

    return {
      id: String(item.id),
      action_type: actionType,
      username: String(item.username || ""),
      amount: signedAmount,
      status: item.status === "REJECTED" ? "REJECTED" : item.status === "PENDING" ? "PENDING" : "APPROVED",
      note: item.note ?? null,
      created_at: item.created_at,
      admin_username: item.admin_username ?? item.created_by_username ?? null,
      source_kind: String(item.source_kind || "TRANSACTION"),
      direction,
      session_id: item.session_id ?? null,
      session_title: item.session_title ?? item.sessionTitle ?? null,
      bonus_title: item.bonus_title ?? item.title ?? item.bonus?.title ?? null,
    };
  });
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
  const status = item.status;
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
  if (item.action_type === "WELCOME_BONUS") return "Welcome Bonus";
  if (item.action_type === "INITIAL_GRANT") return "Initial Grant";
  if (item.action_type === "ADMIN_DEPOSIT") return "Admin Deposit";
  if (item.action_type === "ADMIN_WITHDRAW") return "Admin Withdraw";
  if (item.action_type === "CONVERSION_TO_CHIPS") return "Buy In Approved";
  if (item.action_type === "CONVERSION_TO_COINS") return "Cash Out Approved";
  if (item.action_type === "COIN_PURCHASE") return "Treasure Coin Purchase";
  if (item.action_type === "COIN_OWNER_REFUND") return "Coin Refund";
  if (item.action_type === "COIN_REFUND") return "Coin Refund";
  if (item.action_type === "COIN_LIST_FOR_SALE") return "Listed Coin for Sale";
  if (item.action_type === "COIN_SALE_FINAL_REFUND") return "Final Coin Sale Refund";
  if (item.action_type === "COIN_EXCLUSIVE_GRANTED") return "Exclusive Coin Approved";
  if (item.action_type === "COIN_EXCLUSIVE_REFUND") return "Exclusive Coin Refund";
  if (item.action_type === "COIN_EXCLUSIVE_REQUEST") return "Exclusive Coin Request";
  if (item.action_type === "BUY_IN") return item.session_id === null || item.session_id === undefined ? "Withdraw" : "Buy In";
  if (item.action_type === "CASH_OUT") return item.session_id === null || item.session_id === undefined ? "Deposit" : "Cash Out";
  if (item.action_type === "TO_CHIPS") return "Buy In";
  if (item.action_type === "TO_COINS") return "Cash Out";
  return item.action_type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
    letterSpacing: 0.35,
  },
  coin: {
    width: 68,
    height: 68,
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
  actionCard: {
    borderColor: "rgba(214,179,106,0.23)",
  },
  rowTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
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
    maxWidth: "100%",
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
  noteText: {
    color: theme.colors.textSoft,
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
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
  amountPositive: {
    color: theme.colors.success,
  },
  amountNegative: {
    color: theme.colors.danger,
  },
  date: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 26,
  },
  emptyCoin: {
    width: 58,
    height: 58,
    opacity: 0.82,
    marginBottom: 12,
  },
  emptyTitle: {
    color: theme.colors.gold2,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 7,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
    lineHeight: 19,
  },
});
