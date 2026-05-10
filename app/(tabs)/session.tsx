import { JSX, useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import ThemedCard from "../../src/components/ThemedCard";
import ThemedButton from "../../src/components/ThemedButton";
import LuxuryInput from "../../src/components/LuxuryInput";
import AppModal from "../../src/components/AppModal";
import StepperNumberInput from "../../src/components/StepperNumberInput";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";
import { formatAmount, formatSignedAmount, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");
const whiteChip = require("../../assets/chips/white.png");
const redChip = require("../../assets/chips/red.png");
const blueChip = require("../../assets/chips/blue.png");
const greenChip = require("../../assets/chips/green.png");
const blackChip = require("../../assets/chips/black.png");

type ChipKey = "white" | "red" | "blue" | "green" | "black";
type ChipCounts = Record<ChipKey, number>;
type InputMode = "TOTAL_AMOUNT" | "CHIP_BREAKDOWN";

type PlayingPlayer = {
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  buy_in_total?: number;
  stack_amount?: number;
};

type WaitingBuyIn = {
  id: number;
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  amount_total: number;
};

type WaitingCashOut = {
  id: number;
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  amount_total: number;
  buy_in_total?: number;
  pnl?: number;
};

type ActiveSession = {
  id: number;
  title: string;
  players: PlayingPlayer[];
  waitingBuyIns: WaitingBuyIn[];
  waitingCashOuts: WaitingCashOut[];
  myPendingRequest: null | {
    id: number;
    type: "TO_CHIPS" | "TO_COINS";
    amount_total: number;
    status: "PENDING";
  };
  metrics?: {
    playingCount: number;
    waitingBuyInCount: number;
    waitingCashOutCount: number;
    tableTotal: number;
  };
};

type LeaderboardEntry = {
  rank: number;
  id: number;
  username: string;
  balance: number;
  profile_image_base64?: string | null;
};

const chipConfig: Array<{ key: ChipKey; label: string; value: number; image: any }> = [
  { key: "white", label: "White", value: 1, image: whiteChip },
  { key: "red", label: "Red", value: 5, image: redChip },
  { key: "blue", label: "Blue", value: 10, image: blueChip },
  { key: "green", label: "Green", value: 25, image: greenChip },
  { key: "black", label: "Black", value: 50, image: blackChip },
];

export default function SessionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [adminStartMode, setAdminStartMode] = useState<InputMode>("TOTAL_AMOUNT");
  const [adminEndMode, setAdminEndMode] = useState<InputMode>("TOTAL_AMOUNT");
  const [playerBuyInMode, setPlayerBuyInMode] = useState<InputMode>("TOTAL_AMOUNT");
  const [adminStartAmount, setAdminStartAmount] = useState(0);
  const [adminEndAmount, setAdminEndAmount] = useState(0);
  const [playerBuyInAmount, setPlayerBuyInAmount] = useState(0);
  const [adminStartChips, setAdminStartChips] = useState<ChipCounts>(emptyChips());
  const [adminEndChips, setAdminEndChips] = useState<ChipCounts>(emptyChips());
  const [playerBuyInChips, setPlayerBuyInChips] = useState<ChipCounts>(emptyChips());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buyInSubmitting, setBuyInSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: "" });
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);

  async function loadData() {
    const [sessionRes, leaderboardRes] = await Promise.all([
      api.get("/sessions/active"),
      api.get("/balances/leaderboard"),
    ]);

    setActiveSession(normalizeSession(sessionRes.data.activeSession));
    setLeaderboard(leaderboardRes.data);
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

  const isAdmin = user?.role === "ADMIN";
  const top3 = leaderboard.slice(0, 3);
  const myPending = activeSession?.myPendingRequest || null;

  const waitingCashOutUserIds = useMemo(
    () => new Set((activeSession?.waitingCashOuts || []).map((item) => item.user_id)),
    [activeSession?.waitingCashOuts],
  );

  const playingPlayers = useMemo(() => {
    return [...(activeSession?.players || [])]
      .filter((player) => !waitingCashOutUserIds.has(player.user_id))
      .sort((a, b) => Number(b.stack_amount || b.buy_in_total || 0) - Number(a.stack_amount || a.buy_in_total || 0));
  }, [activeSession?.players, waitingCashOutUserIds]);

  const waitingJoinPlayers = useMemo(
    () => [...(activeSession?.waitingBuyIns || [])].sort((a, b) => Number(b.amount_total || 0) - Number(a.amount_total || 0)),
    [activeSession?.waitingBuyIns],
  );

  const waitingCashOutPlayers = useMemo(
    () => [...(activeSession?.waitingCashOuts || [])].sort((a, b) => Number(b.amount_total || 0) - Number(a.amount_total || 0)),
    [activeSession?.waitingCashOuts],
  );

  const amIPlaying = useMemo(() => playingPlayers.some((player) => player.user_id === user?.id), [playingPlayers, user?.id]);

  const playingCount = playingPlayers.length;
  const waitingJoinCount = waitingJoinPlayers.length;
  const waitingCashOutCount = waitingCashOutPlayers.length;
  const totalForAllPlayers = useMemo(() => {
    const playingTotal = playingPlayers.reduce((sum, item) => sum + Number(item.stack_amount || item.buy_in_total || 0), 0);
    const waitingCashOutTotal = waitingCashOutPlayers.reduce((sum, item) => sum + Number(item.amount_total || 0), 0);
    return playingTotal + waitingCashOutTotal;
  }, [playingPlayers, waitingCashOutPlayers]);

  async function startSession() {
    try {
      if (!sessionTitle.trim()) {
        setFeedback({ visible: true, title: "Missing title", message: "Enter a session title." });
        return;
      }

      const payload = buildPayload({
        mode: adminStartMode,
        amount: adminStartAmount,
        chips: adminStartChips,
        requirePositive: true,
      });

      if (!payload) {
        setFeedback({ visible: true, title: "Invalid buy in", message: "Enter a valid admin buy-in." });
        return;
      }

      setLoading(true);
      await api.post("/sessions/start", {
        title: sessionTitle.trim(),
        ...payload,
      });
      setSessionTitle("");
      setAdminStartAmount(0);
      setAdminStartChips(emptyChips());
      await loadData();
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to open session", message: error?.response?.data?.message || "Failed to start session" });
    } finally {
      setLoading(false);
    }
  }

  async function endSession() {
    try {
      const payload = buildPayload({
        mode: adminEndMode,
        amount: adminEndAmount,
        chips: adminEndChips,
        requirePositive: false,
      });

      if (!payload) {
        setFeedback({ visible: true, title: "Invalid cash out", message: "Enter a valid admin cash-out." });
        return;
      }

      setLoading(true);
      await api.post("/sessions/active/end", payload);
      setAdminEndAmount(0);
      setAdminEndChips(emptyChips());
      setConfirmCloseVisible(false);
      await loadData();
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to close session", message: error?.response?.data?.message || "Failed to end session" });
    } finally {
      setLoading(false);
    }
  }

  async function createBuyInRequest() {
    try {
      const payload = buildPayload({
        mode: playerBuyInMode,
        amount: playerBuyInAmount,
        chips: playerBuyInChips,
        requirePositive: true,
      });

      if (!payload) {
        setFeedback({ visible: true, title: "Invalid buy in", message: "Enter a valid buy-in amount." });
        return;
      }

      setBuyInSubmitting(true);
      await api.post("/conversion-requests", {
        type: "TO_CHIPS",
        ...payload,
      });

      setPlayerBuyInAmount(0);
      setPlayerBuyInChips(emptyChips());
      await loadData();
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to send request", message: error?.response?.data?.message || "Failed to create request" });
    } finally {
      setBuyInSubmitting(false);
    }
  }

  const closeAmountText = useMemo(() => {
    if (adminEndMode === "TOTAL_AMOUNT") return `${formatAmount(adminEndAmount)} O²`;
    return `${formatAmount(totalFromChips(adminEndChips))} O²`;
  }, [adminEndAmount, adminEndChips, adminEndMode]);

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.title}>{activeSession ? activeSession.title : "Session"}</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>

        {!activeSession ? (
          isAdmin ? (
            <ThemedCard glow="gold" style={styles.cardSpacing}>
              <LuxuryInput label="Session Name" placeholder="Table name" value={sessionTitle} onChangeText={setSessionTitle} />
              <View style={styles.spacer} />
              <AmountEditor
                mode={adminStartMode}
                setMode={setAdminStartMode}
                amount={adminStartAmount}
                setAmount={setAdminStartAmount}
                chips={adminStartChips}
                setChips={setAdminStartChips}
              />
              <View style={styles.spacer} />
              <ThemedButton title={loading ? "Opening..." : "Open Session"} onPress={startSession} loading={loading} />
            </ThemedCard>
          ) : (
            <>
              <ThemedCard glow="gold" style={styles.cardSpacing}>
                <Text style={styles.emptySessionTitle}>No active session</Text>
              </ThemedCard>
              <CasinoPodium top3={top3} />
            </>
          )
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricBox label="Playing" value={String(playingCount)} />
              <MetricBox label="Waiting to Join" value={String(waitingJoinCount)} />
            </View>
            <ThemedCard glow="gold" style={styles.totalHeroCard}>
              <View style={styles.totalHeroRow}>
                <Text style={styles.totalHeroLabel}>Total on table</Text>
                {waitingCashOutCount > 0 ? <Text style={styles.waitingCashOutHint}>Cash out pending {waitingCashOutCount}</Text> : null}
              </View>
              <Text style={styles.totalHeroValue}>{formatAmount(totalForAllPlayers)} O²</Text>
            </ThemedCard>

            {!isAdmin && !amIPlaying && myPending?.type !== "TO_CHIPS" ? (
              <ThemedCard glow="gold" style={styles.cardSpacing}>
                <AmountEditor
                  mode={playerBuyInMode}
                  setMode={setPlayerBuyInMode}
                  amount={playerBuyInAmount}
                  setAmount={setPlayerBuyInAmount}
                  chips={playerBuyInChips}
                  setChips={setPlayerBuyInChips}
                />
                <View style={styles.spacer} />
                <ThemedButton
                  title={buyInSubmitting ? "Sending..." : "Send Buy In"}
                  onPress={createBuyInRequest}
                  loading={buyInSubmitting}
                />
              </ThemedCard>
            ) : null}

            {renderSection(
              "Playing",
              playingPlayers.map((player) => (
                <PlayerRow
                  key={`player-${player.user_id}`}
                  name={player.username}
                  image={player.profile_image_base64}
                  amount={`${formatAmount(player.stack_amount || player.buy_in_total || 0)} O²`}
                  detail={`Buy in ${formatAmount(player.buy_in_total || 0)} O²`}
                  badge="IN"
                  badgeVariant="success"
                />
              )),
            )}

            {renderSection(
              "Waiting to Join",
              waitingJoinPlayers.map((request) => (
                <PlayerRow
                  key={`wait-buy-${request.id}`}
                  name={request.username}
                  image={request.profile_image_base64}
                  amount={`${formatAmount(request.amount_total)} O²`}
                  badge="PENDING"
                  badgeVariant="pending"
                />
              )),
            )}

            {renderSection(
              "Waiting to Cash Out",
              waitingCashOutPlayers.map((request) => (
                <PlayerRow
                  key={`wait-out-${request.id}`}
                  name={request.username}
                  image={request.profile_image_base64}
                  amount={`${formatAmount(request.amount_total)} O²`}
                  detail={request.pnl === undefined ? undefined : `${request.pnl >= 0 ? "Profit" : "Loss"} ${formatSignedAmount(request.pnl)} O²`}
                  detailColor={request.pnl === undefined ? theme.colors.textSoft : request.pnl >= 0 ? theme.colors.success : theme.colors.danger}
                  badge="PENDING"
                  badgeVariant="pending"
                />
              )),
            )}

            {isAdmin ? (
              <ThemedCard glow="none" style={styles.cardSpacing}>
                <AmountEditor
                  mode={adminEndMode}
                  setMode={setAdminEndMode}
                  amount={adminEndAmount}
                  setAmount={setAdminEndAmount}
                  chips={adminEndChips}
                  setChips={setAdminEndChips}
                />
                <View style={styles.spacer} />
                <ThemedButton title={loading ? "Closing..." : "Close Session"} onPress={() => setConfirmCloseVisible(true)} loading={loading} />
              </ThemedCard>
            ) : null}

            {!isAdmin && amIPlaying && myPending?.type !== "TO_COINS" ? (
              <ThemedCard glow="none" style={styles.cardSpacing}>
                <ThemedButton title="Request Cash Out" onPress={() => router.push("/cashout?fromSession=1")} />
              </ThemedCard>
            ) : null}
          </>
        )}
      </ScreenContainer>

      <AppModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        onConfirm={() => setFeedback({ visible: false, title: "", message: "" })}
        confirmLabel="Close"
      />

      <AppModal
        visible={confirmCloseVisible}
        title="Close session?"
        message={`Admin cash out: ${closeAmountText}`}
        onConfirm={endSession}
        onCancel={() => setConfirmCloseVisible(false)}
        confirmLabel="Confirm"
        loading={loading}
      />
    </>
  );
}

function renderSection(title: string, items: JSX.Element[]) {
  if (items.length === 0) return null;
  return (
    <View style={styles.cardSpacing}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.stack}>{items}</View>
    </View>
  );
}

function AmountEditor({
  mode,
  setMode,
  amount,
  setAmount,
  chips,
  setChips,
}: {
  mode: InputMode;
  setMode: (value: InputMode) => void;
  amount: number;
  setAmount: (value: number) => void;
  chips: ChipCounts;
  setChips: (value: ChipCounts) => void;
}) {
  return (
    <View>
      <View style={styles.segmentRow}>
        <Segment active={mode === "TOTAL_AMOUNT"} label="Amount" onPress={() => setMode("TOTAL_AMOUNT")} />
        <Segment active={mode === "CHIP_BREAKDOWN"} label="Chips" onPress={() => setMode("CHIP_BREAKDOWN")} />
      </View>

      {mode === "TOTAL_AMOUNT" ? (
        <View style={styles.amountBlock}>
          <StepperNumberInput value={amount} onChange={setAmount} width={140} />
        </View>
      ) : (
        <View style={styles.chipStack}>
          {chipConfig.map((chip) => (
            <View key={chip.key} style={styles.chipRow}>
              <View style={styles.chipLeft}>
                <Image source={chip.image} style={styles.chipImage} />
                <View>
                  <Text style={styles.chipName}>{chip.label}</Text>
                  <Text style={styles.chipValue}>{chip.value}</Text>
                </View>
              </View>
              <StepperNumberInput
                value={chips[chip.key]}
                onChange={(next) => setChips({ ...chips, [chip.key]: next })}
                width={58}
                gap={2}
                controlSize={18}
                controlTextSize={18}
                borderlessControls
                inputStyle={styles.compactInput}
                controlTextStyle={styles.compactControlText}
              />
            </View>
          ))}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatAmount(totalFromChips(chips))} O²</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <ThemedCard glow="none" style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </ThemedCard>
  );
}

function PlayerRow({
  name,
  image,
  amount,
  detail,
  detailColor,
  badge,
  badgeVariant,
}: {
  name: string;
  image?: string | null;
  amount: string;
  detail?: string;
  detailColor?: string;
  badge: string;
  badgeVariant: "success" | "pending";
}) {
  const avatarUri = image ? `data:image/jpeg;base64,${image}` : null;
  return (
    <ThemedCard glow="none">
      <View style={styles.playerRow}>
        <View style={styles.playerIdentity}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.playerAvatar} />
          ) : (
            <View style={styles.playerAvatarFallback}>
              <Text style={styles.playerAvatarFallbackText}>{name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{name}</Text>
            {detail ? <Text style={[styles.playerDetail, detailColor ? { color: detailColor } : null]}>{detail}</Text> : null}
          </View>
        </View>
        <View style={styles.playerRight}>
          <Text style={styles.playerAmount}>{amount}</Text>
          <View style={[styles.stateBadge, badgeVariant === "success" ? styles.badgeIn : styles.badgePending]}>
            <Text style={styles.stateBadgeText}>{badge}</Text>
          </View>
        </View>
      </View>
    </ThemedCard>
  );
}

function CasinoPodium({ top3 }: { top3: LeaderboardEntry[] }) {
  if (top3.length === 0) return null;
  const second = top3[1];
  const first = top3[0];
  const third = top3[2];
  return (
    <ThemedCard glow="gold" style={styles.cardSpacing}>
      <View style={styles.podiumStage}>
        {second ? <PodiumColumn entry={second} place="2" height={110} /> : <View style={styles.podiumSpacer} />}
        {first ? <PodiumColumn entry={first} place="1" height={148} featured /> : <View style={styles.podiumSpacer} />}
        {third ? <PodiumColumn entry={third} place="3" height={92} /> : <View style={styles.podiumSpacer} />}
      </View>
    </ThemedCard>
  );
}

function PodiumColumn({ entry, place, height, featured = false }: { entry: LeaderboardEntry; place: string; height: number; featured?: boolean }) {
  const avatarUri = entry.profile_image_base64 ? `data:image/jpeg;base64,${entry.profile_image_base64}` : null;
  return (
    <View style={styles.podiumColumnWrap}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={[styles.podiumAvatar, featured && styles.podiumAvatarFeatured]} />
      ) : (
        <View style={[styles.podiumAvatarFallback, featured && styles.podiumAvatarFeatured]}>
          <Text style={styles.podiumAvatarFallbackText}>{entry.username.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.podiumName}>{entry.username}</Text>
      <Text style={styles.podiumBalance}>{formatAmount(entry.balance)} O²</Text>
      <View style={[styles.podiumBlock, { height }, featured && styles.podiumBlockFeatured]}>
        <Text style={styles.podiumPlace}>{place}</Text>
      </View>
    </View>
  );
}

function normalizeSession(raw: any): ActiveSession | null {
  if (!raw) return null;
  const pendingRequests = raw.pendingRequests || [];
  const waitingBuyIns = raw.waitingBuyIns || pendingRequests.filter((item: any) => item.type === "TO_CHIPS");
  const waitingCashOuts = raw.waitingCashOuts || pendingRequests.filter((item: any) => item.type === "TO_COINS");
  return {
    ...raw,
    players: raw.players || [],
    waitingBuyIns,
    waitingCashOuts,
    metrics: raw.metrics || {
      playingCount: (raw.players || []).length,
      waitingBuyInCount: waitingBuyIns.length,
      waitingCashOutCount: waitingCashOuts.length,
      tableTotal: 0,
    },
  };
}

function emptyChips(): ChipCounts {
  return { white: 0, red: 0, blue: 0, green: 0, black: 0 };
}

function totalFromChips(chips: ChipCounts) {
  return chips.white * 1 + chips.red * 5 + chips.blue * 10 + chips.green * 25 + chips.black * 50;
}

function buildPayload({
  mode,
  amount,
  chips,
  requirePositive,
}: {
  mode: InputMode;
  amount: number;
  chips: ChipCounts;
  requirePositive: boolean;
}) {
  if (mode === "TOTAL_AMOUNT") {
    if (amount === undefined || Number.isNaN(Number(amount)) || Number(amount) < 0) return null;
    if (requirePositive && Number(amount) <= 0) return null;
    return { amount_mode: "TOTAL_AMOUNT" as const, amount_total: Number(amount) };
  }

  const total = totalFromChips(chips);
  if (requirePositive && total <= 0) return null;
  return {
    amount_mode: "CHIP_BREAKDOWN" as const,
    white_count: chips.white,
    red_count: chips.red,
    blue_count: chips.blue,
    green_count: chips.green,
    black_count: chips.black,
  };
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
    flex: 1,
  },
  coin: {
    width: 70,
    height: 70,
  },
  cardSpacing: {
    marginBottom: 18,
  },
  spacer: {
    height: 16,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
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
  totalHeroCard: {
    marginBottom: 18,
  },
  totalHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  totalHeroLabel: {
    color: theme.colors.gold2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  waitingCashOutHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  totalHeroValue: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  emptySessionTitle: {
    color: theme.colors.gold2,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  sectionTitle: {
    color: theme.colors.gold2,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segment: {
    flex: 1,
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
  amountBlock: {
    marginTop: 18,
    alignItems: "center",
  },
  chipStack: {
    marginTop: 18,
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  chipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  chipImage: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  chipName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  chipValue: {
    color: theme.colors.textSoft,
    marginTop: 2,
  },
  compactInput: {
    minHeight: 34,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  compactControlText: {
    fontWeight: "800",
  },
  totalBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.08)",
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  totalLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  stack: {
    gap: 12,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  playerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  playerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  playerAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(214,179,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarFallbackText: {
    color: theme.colors.gold2,
    fontWeight: "900",
  },
  playerName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    flexShrink: 1,
  },
  playerDetail: {
    color: theme.colors.textSoft,
    marginTop: 4,
    fontWeight: "700",
  },
  playerRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  playerAmount: {
    color: theme.colors.gold2,
    fontWeight: "900",
    fontSize: 22,
  },
  stateBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeIn: {
    backgroundColor: "rgba(88,211,155,0.14)",
  },
  badgePending: {
    backgroundColor: "rgba(214,179,106,0.14)",
  },
  stateBadgeText: {
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: 0.7,
    fontSize: 11,
  },
  podiumStage: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  podiumSpacer: {
    flex: 1,
  },
  podiumColumnWrap: {
    flex: 1,
    alignItems: "center",
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
  },
  podiumAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumAvatarFeatured: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  podiumAvatarFallbackText: {
    color: theme.colors.gold2,
    fontWeight: "900",
    fontSize: 24,
  },
  podiumName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  podiumBalance: {
    color: theme.colors.textSoft,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    textAlign: "center",
  },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumBlockFeatured: {
    backgroundColor: "rgba(214,179,106,0.18)",
  },
  podiumPlace: {
    color: theme.colors.gold2,
    fontSize: 34,
    fontWeight: "900",
  },
});
