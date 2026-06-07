import { JSX, useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenContainer from "../../src/components/ScreenContainer";
import SpinningCoin from "../../src/components/SpinningCoin";
import ThemedCard from "../../src/components/ThemedCard";
import ThemedButton from "../../src/components/ThemedButton";
import LuxuryInput from "../../src/components/LuxuryInput";
import AppModal from "../../src/components/AppModal";
import ProfileAvatarWithCoins from "../../src/components/AvatarWithCoins";
import PlayerProfileModal, { PlayerProfileEntry } from "../../src/components/PlayerProfileModal";
import StepperNumberInput from "../../src/components/StepperNumberInput";
import { api } from "../../src/lib/api";
import type { AchievementCoin } from "../../src/lib/achievementCoins";
import { useAuth } from "../../src/context/AuthContext";
import { formatAmount, formatSignedAmount, theme } from "../../src/theme/theme";

const coinImage = require("../../assets/images/doubleo-coin.png");
const whiteChip = require("../../assets/chips/white.png");
const redChip = require("../../assets/chips/red.png");
const blueChip = require("../../assets/chips/blue.png");
const greenChip = require("../../assets/chips/green.png");
const blackChip = require("../../assets/chips/black.png");

type CardHandKey =
  | "HIGH_CARD"
  | "PAIR"
  | "TWO_PAIR"
  | "THREE_OF_A_KIND"
  | "STRAIGHT"
  | "FLUSH"
  | "FULL_HOUSE"
  | "FOUR_OF_A_KIND"
  | "STRAIGHT_FLUSH"
  | "ROYAL_FLUSH";

type SelectedCoinKey = "APP" | "CARD" | "PLACE" | `SPECIAL_${number}` | `ACHIEVEMENT_${string}`;

type SpecialCoin = {
  id: number;
  title: string;
  image_mime?: string | null;
  image_base64?: string | null;
  ownership_type?: "PAID" | "EXCLUSIVE" | string | null;
  locked_forever?: boolean;
};

type UserCoinFields = {
  card_hand?: CardHandKey | string | null;
  selected_coin_1?: SelectedCoinKey | string | null;
  selected_coin_2?: SelectedCoinKey | string | null;
  is_winner_coin_holder?: boolean;
  special_coins?: SpecialCoin[];
  achievement_coins?: AchievementCoin[];
};

type ChipKey = "white" | "red" | "blue" | "green" | "black";
type ChipCounts = Record<ChipKey, number>;
type InputMode = "TOTAL_AMOUNT" | "CHIP_BREAKDOWN";

type PlayingPlayer = UserCoinFields & {
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  secondary_profile_image_base64?: string | null;
  buy_in_total?: number;
  stack_amount?: number;
};

type WaitingBuyIn = UserCoinFields & {
  id: number;
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  secondary_profile_image_base64?: string | null;
  amount_total: number;
};

type WaitingCashOut = UserCoinFields & {
  id: number;
  user_id: number;
  username: string;
  profile_image_base64?: string | null;
  secondary_profile_image_base64?: string | null;
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

type LeaderboardEntry = UserCoinFields & {
  rank: number;
  id: number;
  username: string;
  balance: number;
  todayNet?: number;
  profile_image_base64?: string | null;
  secondary_profile_image_base64?: string | null;
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
  const [addBuyInVisible, setAddBuyInVisible] = useState(false);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<PlayerProfileEntry | null>(null);

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
      loadData().catch(() => { });
    }, []),
  );

  const isAdmin = user?.role === "ADMIN";
  const top3 = leaderboard.slice(0, 3);
  const myPending = activeSession?.myPendingRequest || null;

  const leaderboardByUserId = useMemo(() => {
    const map = new Map<number, LeaderboardEntry>();
    leaderboard.forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [leaderboard]);

  function openPlayerProfileFromSession(userId: number, fallback: any) {
    const leaderboardEntry = leaderboardByUserId.get(userId);

    if (leaderboardEntry) {
      setSelectedPlayerProfile(leaderboardEntry as PlayerProfileEntry);
      return;
    }

    setSelectedPlayerProfile({
      id: userId,
      rank: 999,
      username: fallback.username || fallback.name || "Player",
      balance: 0,
      todayNet: 0,
      profile_image_base64: fallback.profile_image_base64 || fallback.image || null,
      secondary_profile_image_base64: fallback.secondary_profile_image_base64 || null,
      card_hand: fallback.card_hand || null,
      selected_coin_1: fallback.selected_coin_1 || null,
      selected_coin_2: fallback.selected_coin_2 || null,
      is_winner_coin_holder: !!fallback.is_winner_coin_holder,
      special_coins: fallback.special_coins || [],
      achievement_coins: fallback.achievement_coins || [],
    });
  }

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
    return playingPlayers.reduce((sum, item) => sum + Number(item.stack_amount || item.buy_in_total || 0), 0);
  }, [playingPlayers]);

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
        session_add_on: isAdmin && amIPlaying,
      });

      setPlayerBuyInAmount(0);
      setPlayerBuyInChips(emptyChips());
      setAddBuyInVisible(false);
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
          <SpinningCoin source={coinImage} size={70} style={styles.coin} />
        </View>

        {!activeSession ? (
          isAdmin ? (
            <>
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

              <CasinoPodium top3={top3} onOpenProfile={(entry) => setSelectedPlayerProfile(entry as PlayerProfileEntry)} />
            </>
          ) : (
            <>
              <ThemedCard glow="gold" style={styles.cardSpacing}>
                <Text style={styles.emptySessionTitle}>No active session</Text>
              </ThemedCard>
              <CasinoPodium top3={top3} onOpenProfile={(entry) => setSelectedPlayerProfile(entry as PlayerProfileEntry)} />
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
                  secondaryImage={player.secondary_profile_image_base64}
                  amount={`${formatAmount(player.stack_amount || player.buy_in_total || 0)} O²`}
                  detail={`Buy in ${formatAmount(player.buy_in_total || 0)} O²`}
                  badge="IN"
                  badgeVariant="success"
                  rank={leaderboardByUserId.get(player.user_id)?.rank}
                  cardHand={player.card_hand}
                  selectedCoin1={player.selected_coin_1}
                  selectedCoin2={player.selected_coin_2}
                  isWinnerCoinHolder={player.is_winner_coin_holder}
                  specialCoins={player.special_coins || []}
                  achievementCoins={player.achievement_coins || []}
                  onProfilePress={() => openPlayerProfileFromSession(player.user_id, player)}
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
                  secondaryImage={request.secondary_profile_image_base64}
                  amount={`${formatAmount(request.amount_total)} O²`}
                  badge="PENDING"
                  badgeVariant="pending"
                  rank={leaderboardByUserId.get(request.user_id)?.rank}
                  cardHand={request.card_hand}
                  selectedCoin1={request.selected_coin_1}
                  selectedCoin2={request.selected_coin_2}
                  isWinnerCoinHolder={request.is_winner_coin_holder}
                  specialCoins={request.special_coins || []}
                  achievementCoins={request.achievement_coins || []}
                  onProfilePress={() => openPlayerProfileFromSession(request.user_id, request)}
                  onPress={isAdmin ? () => router.push("/admin-requests") : undefined}
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
                  secondaryImage={request.secondary_profile_image_base64}
                  amount={`${formatAmount(request.amount_total)} O²`}
                  detail={request.pnl === undefined ? undefined : `${request.pnl >= 0 ? "Profit" : "Loss"} ${formatSignedAmount(request.pnl)} O²`}
                  detailColor={request.pnl === undefined ? theme.colors.textSoft : request.pnl >= 0 ? theme.colors.success : theme.colors.danger}
                  badge="PENDING"
                  badgeVariant="pending"
                  rank={leaderboardByUserId.get(request.user_id)?.rank}
                  cardHand={request.card_hand}
                  selectedCoin1={request.selected_coin_1}
                  selectedCoin2={request.selected_coin_2}
                  isWinnerCoinHolder={request.is_winner_coin_holder}
                  specialCoins={request.special_coins || []}
                  achievementCoins={request.achievement_coins || []}
                  onProfilePress={() => openPlayerProfileFromSession(request.user_id, request)}
                  onPress={isAdmin ? () => router.push("/admin-requests") : undefined}
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

            {amIPlaying && !myPending ? (
              <ThemedCard glow="none" style={styles.cardSpacing}>
                {isAdmin ? (
                  <Pressable
                    onPress={() => setAddBuyInVisible(true)}
                    style={({ pressed }) => [styles.adminAddOnButton, pressed ? styles.addOnButtonPressed : null]}
                  >
                    <Text style={styles.adminAddOnButtonText}>+ Add Buy In</Text>
                  </Pressable>
                ) : (
                  <View style={styles.playerActionRow}>
                    <ThemedButton
                      title="Request Cash Out"
                      onPress={() => router.push("/cashout?fromSession=1")}
                      style={styles.playerActionPrimary}
                    />

                    <Pressable
                      onPress={() => setAddBuyInVisible(true)}
                      style={({ pressed }) => [styles.addOnButton, pressed ? styles.addOnButtonPressed : null]}
                    >
                      <Text style={styles.addOnButtonText}>+ Add Buy In</Text>
                    </Pressable>
                  </View>
                )}
              </ThemedCard>
            ) : null}

            {amIPlaying && myPending?.type === "TO_CHIPS" ? (
              <ThemedCard glow="none" style={styles.cardSpacing}>
                <Text style={styles.pendingInlineText}>Your add-on buy in is waiting for admin approval.</Text>
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

      <PlayerProfileModal
        entry={selectedPlayerProfile}
        onClose={() => setSelectedPlayerProfile(null)}
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

      <Modal visible={addBuyInVisible} transparent animationType="fade" onRequestClose={() => setAddBuyInVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddBuyInVisible(false)} />
          <ThemedCard glow="gold" style={styles.addBuyInModalCard}>
            <Text style={styles.addBuyInTitle}>Add Buy In</Text>

            <ScrollView
              style={styles.addBuyInScroll}
              contentContainerStyle={styles.addBuyInScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AmountEditor
                mode={playerBuyInMode}
                setMode={setPlayerBuyInMode}
                amount={playerBuyInAmount}
                setAmount={setPlayerBuyInAmount}
                chips={playerBuyInChips}
                setChips={setPlayerBuyInChips}
                compact
              />
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <ThemedButton
                title="Cancel"
                variant="dark"
                onPress={() => setAddBuyInVisible(false)}
                disabled={buyInSubmitting}
                style={styles.modalActionButton}
              />
              <ThemedButton
                title={buyInSubmitting ? "Sending..." : "Send"}
                onPress={createBuyInRequest}
                loading={buyInSubmitting}
                style={styles.modalActionButton}
              />
            </View>
          </ThemedCard>
        </View>
      </Modal>
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
  compact = false,
}: {
  mode: InputMode;
  setMode: (value: InputMode) => void;
  amount: number;
  setAmount: (value: number) => void;
  chips: ChipCounts;
  setChips: (value: ChipCounts) => void;
  compact?: boolean;
}) {
  return (
    <View>
      <View style={[styles.segmentRow, compact && styles.segmentRowCompact]}>
        <Segment active={mode === "TOTAL_AMOUNT"} label="Amount" onPress={() => setMode("TOTAL_AMOUNT")} compact={compact} />
        <Segment active={mode === "CHIP_BREAKDOWN"} label="Chips" onPress={() => setMode("CHIP_BREAKDOWN")} compact={compact} />
      </View>

      {mode === "TOTAL_AMOUNT" ? (
        <View style={[styles.amountBlock, compact && styles.amountBlockCompact]}>
          <StepperNumberInput
            value={amount}
            onChange={setAmount}
            width={compact ? 112 : 140}
            controlSize={compact ? 36 : 42}
            controlTextSize={compact ? 19 : 22}
            inputStyle={compact ? styles.compactAmountInput : undefined}
          />
        </View>
      ) : (
        <View style={[styles.chipStack, compact && styles.chipStackCompact]}>
          {chipConfig.map((chip) => (
            <View key={chip.key} style={[styles.chipRow, compact && styles.chipRowCompact]}>
              <View style={[styles.chipLeft, compact && styles.chipLeftCompact]}>
                <Image source={chip.image} style={[styles.chipImage, compact && styles.chipImageCompact]} />
                <View>
                  <Text style={[styles.chipName, compact && styles.chipNameCompact]}>{chip.label}</Text>
                  <Text style={[styles.chipValue, compact && styles.chipValueCompact]}>{chip.value}</Text>
                </View>
              </View>
              <StepperNumberInput
                value={chips[chip.key]}
                onChange={(next) => setChips({ ...chips, [chip.key]: next })}
                width={compact ? 50 : 58}
                gap={compact ? 0 : 2}
                controlSize={compact ? 16 : 18}
                controlTextSize={compact ? 16 : 18}
                borderlessControls
                inputStyle={[styles.compactInput, compact && styles.compactInputTight]}
                controlTextStyle={styles.compactControlText}
              />
            </View>
          ))}
          <View style={[styles.totalBox, compact && styles.totalBoxCompact]}>
            <Text style={[styles.totalLabel, compact && styles.totalLabelCompact]}>Total</Text>
            <Text style={[styles.totalValue, compact && styles.totalValueCompact]}>{formatAmount(totalFromChips(chips))} O²</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Segment({ active, label, onPress, compact = false }: { active: boolean; label: string; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, compact && styles.segmentCompact, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, compact && styles.segmentTextCompact, active && styles.segmentTextActive]}>{label}</Text>
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
  secondaryImage,
  amount,
  detail,
  detailColor,
  badge,
  badgeVariant,
  rank,
  cardHand,
  selectedCoin1,
  selectedCoin2,
  isWinnerCoinHolder,
  specialCoins,
  achievementCoins,
  onProfilePress,
  onPress,
}: {
  name: string;
  image?: string | null;
  secondaryImage?: string | null;
  amount: string;
  detail?: string;
  detailColor?: string;
  badge: string;
  badgeVariant: "success" | "pending";
  rank?: number;
  cardHand?: string | null;
  selectedCoin1?: string | null;
  selectedCoin2?: string | null;
  isWinnerCoinHolder?: boolean;
  specialCoins?: SpecialCoin[];
  achievementCoins?: AchievementCoin[];
  onProfilePress?: () => void;
  onPress?: () => void;
}) {
  const content = (
    <ThemedCard glow="none">
      <View style={styles.playerRow}>
        <Pressable onPress={onProfilePress} disabled={!onProfilePress} style={styles.playerIdentity}>
          <ProfileAvatarWithCoins
            player={{
              username: name,
              rank,
              profile_image_base64: image || null,
              secondary_profile_image_base64: secondaryImage || null,
              card_hand: cardHand,
              selected_coin_1: selectedCoin1,
              selected_coin_2: selectedCoin2,
              is_winner_coin_holder: isWinnerCoinHolder,
              special_coins: specialCoins || [],
              achievement_coins: achievementCoins || [],
            }}
            size={60}
            coinSize={30}
            winnerSize={35}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{name}</Text>
            {detail ? <Text style={[styles.playerDetail, detailColor ? { color: detailColor } : null]}>{detail}</Text> : null}
          </View>
        </Pressable>
        <View style={styles.playerRight}>
          <Text style={styles.playerAmount}>{amount}</Text>
          <View style={[styles.stateBadge, badgeVariant === "success" ? styles.badgeIn : styles.badgePending]}>
            <Text style={styles.stateBadgeText}>{badge}</Text>
          </View>
        </View>
      </View>
    </ThemedCard>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pendingPressablePressed : null)}>
      {content}
    </Pressable>
  );
}

function CasinoPodium({ top3, onOpenProfile }: { top3: LeaderboardEntry[]; onOpenProfile: (entry: LeaderboardEntry) => void }) {
  if (top3.length === 0) return null;
  const second = top3[1];
  const first = top3[0];
  const third = top3[2];
  return (
    <ThemedCard glow="gold" style={styles.cardSpacing}>
      <View style={styles.podiumStage}>
        {second ? <PodiumColumn entry={second} place="2" height={110} onOpenProfile={onOpenProfile} /> : <View style={styles.podiumSpacer} />}
        {first ? <PodiumColumn entry={first} place="1" height={148} featured onOpenProfile={onOpenProfile} /> : <View style={styles.podiumSpacer} />}
        {third ? <PodiumColumn entry={third} place="3" height={92} onOpenProfile={onOpenProfile} /> : <View style={styles.podiumSpacer} />}
      </View>
    </ThemedCard>
  );
}

function PodiumColumn({ entry, place, height, featured = false, onOpenProfile }: { entry: LeaderboardEntry; place: string; height: number; featured?: boolean; onOpenProfile: (entry: LeaderboardEntry) => void }) {
  return (
    <Pressable onPress={() => onOpenProfile(entry)} style={styles.podiumColumnWrap}>
      <ProfileAvatarWithCoins
        player={entry}
        size={featured ? 68 : 59}
        coinSize={featured ? 29 : 26}
        winnerSize={featured ? 35 : 31}
      />
      <Text style={styles.podiumName}>{entry.username}</Text>
      <Text style={styles.podiumBalance}>{formatAmount(entry.balance)} O²</Text>
      <View style={[styles.podiumBlock, { height }, featured && styles.podiumBlockFeatured]}>
        <Text style={styles.podiumPlace}>{place}</Text>
      </View>
    </Pressable>
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
  segmentRowCompact: {
    gap: 8,
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
  segmentCompact: {
    minHeight: 32,
  },
  segmentTextCompact: {
    fontSize: 12,
  },
  amountBlock: {
    marginTop: 18,
    alignItems: "center",
  },
  amountBlockCompact: {
    marginTop: 12,
  },
  compactAmountInput: {
    minHeight: 38,
    fontSize: 14,
  },
  chipStack: {
    marginTop: 18,
    gap: 12,
  },
  chipStackCompact: {
    marginTop: 7,
    gap: 3,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  chipRowCompact: {
    minHeight: 38,
    gap: 5,
  },
  chipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  chipLeftCompact: {
    gap: 7,
  },
  chipImage: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  chipImageCompact: {
    width: 34,
    height: 34,
  },
  chipName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  chipNameCompact: {
    fontSize: 12,
  },
  chipValue: {
    color: theme.colors.textSoft,
    marginTop: 2,
  },
  chipValueCompact: {
    fontSize: 10,
    marginTop: -1,
  },
  compactInput: {
    minHeight: 34,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  compactInputTight: {
    minHeight: 27,
    fontSize: 13,
    paddingHorizontal: 5,
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
  totalBoxCompact: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginTop: 1,
  },
  totalLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalLabelCompact: {
    fontSize: 10,
  },
  totalValue: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  totalValueCompact: {
    fontSize: 18,
    marginTop: 2,
  },
  stack: {
    gap: 12,
  },
  playerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playerActionPrimary: {
    flex: 1.25,
  },
  addOnButton: {
    flex: 0.95,
    minHeight: 50,
    borderRadius: theme.radius.pill,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  addOnButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  addOnButtonText: {
    color: theme.colors.gold2,
    fontSize: 14,
    fontWeight: "900",
  },
  adminAddOnButton: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.13)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  adminAddOnButtonText: {
    color: theme.colors.gold2,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  pendingInlineText: {
    color: theme.colors.textSoft,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  pendingPressablePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  addBuyInModalCard: {
    maxHeight: "82%",
    width: "100%",
    paddingVertical: 16,
  },
  addBuyInScroll: {
    maxHeight: 390,
  },
  addBuyInScrollContent: {
    paddingBottom: 4,
  },
  addBuyInTitle: {
    color: theme.colors.gold2,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  addBuyInSubtitle: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
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
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
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
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
  },
  playerRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  playerAmount: {
    color: theme.colors.gold2,
    fontWeight: "900",
    fontSize: 24,
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
    marginBottom: 6,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
  },
  podiumAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
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
    marginBottom: 6,
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
