import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import ThemedCard from "../src/components/ThemedCard";
import ThemedButton from "../src/components/ThemedButton";
import CoinPreviewModal from "../src/components/CoinPreviewModal";
import { api } from "../src/lib/api";
import { formatAmount, theme } from "../src/theme/theme";

const appCoinImage = require("../assets/images/doubleo-coin.png");

type CoinStatus = "AVAILABLE" | "PAID_OWNED" | "FOR_SALE" | "EXCLUSIVE_LOCKED";
type TreasureAction = "BUY" | "REQUEST" | "LIST";
type SortMode = "PRICE" | "NAME";

type TreasureCoin = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
  image_mime?: string | null;
  image_base64?: string | null;
  status: CoinStatus;
  current_price: number;
  owner_user_id?: number | null;
  owner_username?: string | null;
  last_purchase_price?: number | null;
  sale_original_price?: number | null;
  sale_seller_user_id?: number | null;
  sale_seller_username?: string | null;
  sale_paid_upfront?: number | null;
  locked_forever?: boolean;
  has_pending_request?: boolean;
  owned_by_me?: boolean;
  listed_by_me?: boolean;
  can_buy?: boolean;
  can_list_for_sale?: boolean;
  can_request_exclusive?: boolean;
  insufficient_balance?: boolean;
};

export default function TreasureRoomScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<TreasureCoin[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: TreasureAction; coin: TreasureCoin } | null>(null);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    coin?: TreasureCoin | null;
    action?: TreasureAction | null;
  }>({
    visible: false,
    title: "",
    message: "",
    coin: null,
    action: null,
  });
  const [previewCoin, setPreviewCoin] = useState<TreasureCoin | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("PRICE");

  async function loadData() {
    const response = await api.get("/coins");
    setCoins(Array.isArray(response.data?.coins) ? response.data.coins : []);
    setBalance(Number(response.data?.balance || 0));
  }

  async function loadInitial() {
    try {
      setLoading(true);
      await loadData();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Could not load Treasure Room",
        message: error?.response?.data?.message || "Please try again.",
        coin: null,
        action: null,
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

  const visibleCoins = useMemo(() => {
    const byName = compareCoinNames;

    if (sortMode === "NAME") {
      return [...coins].sort(byName);
    }

    const marketCoins = coins
      .filter(isMarketCoin)
      .sort((a, b) => Number(a.current_price || 0) - Number(b.current_price || 0) || byName(a, b));

    const lockedCoins = coins.filter((coin) => !isMarketCoin(coin)).sort(byName);

    return [...marketCoins, ...lockedCoins];
  }, [coins, sortMode]);

  async function runConfirmedAction() {
    if (!confirmAction) return;

    const { coin, action } = confirmAction;
    const key = `${action}-${coin.id}`;

    try {
      setActionLoadingKey(key);

      if (action === "BUY") {
        await api.post(`/coins/${coin.id}/buy`);
      } else if (action === "LIST") {
        await api.post(`/coins/${coin.id}/list-for-sale`);
      } else {
        await api.post(`/coins/${coin.id}/request-exclusive`);
      }

      setConfirmAction(null);
      await loadData();
      setFeedback({
        visible: true,
        title: getSuccessTitle(action),
        message: getSuccessMessage(action, coin),
        coin,
        action,
      });
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: getErrorTitle(action),
        message: error?.response?.data?.message || "Please try again.",
        coin,
        action: null,
      });
    } finally {
      setActionLoadingKey(null);
    }
  }

  return (
    <>
      <LinearGradient
        colors={theme.gradients.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <Text style={styles.cornerTop}>♠</Text>
          <Text style={styles.cornerBottom}>♦</Text>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            stickyHeaderIndices={[2]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.gold2}
              />
            }
          >
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>‹</Text>
              </Pressable>

              <View style={styles.headerTextWrap}>
                <Text style={styles.eyebrow}>DOUBLEO VAULT</Text>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                  Treasure Room
                </Text>
              </View>

              <Image source={appCoinImage} style={styles.headerCoin} />
            </View>

            <LinearGradient
              colors={["rgba(86,55,15,0.82)", "rgba(20,15,9,0.98)", "rgba(8,7,6,0.98)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>PRIVATE COIN MARKET</Text>
              <Text style={styles.heroText}>
                Buy coins instantly, list paid coins for sale, or ask the admin to approve exclusive ownership for a real physical coin.
              </Text>
            </LinearGradient>

            <View style={styles.stickyBalanceShell}>
              <View style={styles.balancePill}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  {formatAmount(balance)} O²
                </Text>
              </View>
            </View>

            <View style={styles.controlsPanel}>
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort by</Text>
                <View style={styles.sortButtons}>
                  <SortButton title="Price" active={sortMode === "PRICE"} onPress={() => setSortMode("PRICE")} />
                  <SortButton title="Name" active={sortMode === "NAME"} onPress={() => setSortMode("NAME")} />
                </View>
              </View>
            </View>

            {loading ? (
              <ThemedCard glow="none" style={styles.loadingCard}>
                <ActivityIndicator size="large" color={theme.colors.gold2} />
                <Text style={styles.loadingText}>Opening the vault...</Text>
              </ThemedCard>
            ) : null}

            {!loading ? (
              <View style={styles.grid}>
                {visibleCoins.map((coin) => (
                  <TreasureCoinCard
                    key={coin.id}
                    coin={coin}
                    actionLoadingKey={actionLoadingKey}
                    onAction={(action) => setConfirmAction({ action, coin })}
                    onPreview={() => setPreviewCoin(coin)}
                  />
                ))}

                {visibleCoins.length === 0 ? (
                  <ThemedCard glow="none">
                    <Text style={styles.empty}>No coins yet.</Text>
                  </ThemedCard>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <CoinPreviewModal
        visible={!!previewCoin}
        title={previewCoin ? getCoinName(previewCoin) : ""}
        image={previewCoin ? getCoinPreviewImage(previewCoin) : null}
        onClose={() => setPreviewCoin(null)}
      />

      <TreasureModal
        visible={!!confirmAction}
        title={getConfirmTitle(confirmAction)}
        message={getConfirmMessage(confirmAction)}
        coin={confirmAction?.coin ?? null}
        confirmLabel={getConfirmLabel(confirmAction)}
        cancelLabel="Cancel"
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        loading={!!actionLoadingKey}
        dismissable={!actionLoadingKey}
      />

      <TreasureModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        coin={feedback.coin ?? null}
        onConfirm={() => setFeedback({ visible: false, title: "", message: "", coin: null, action: null })}
        confirmLabel="Close"
        animateCoin={feedback.action === "BUY"}
      />
    </>
  );
}

function TreasureCoinCard({
  coin,
  actionLoadingKey,
  onAction,
  onPreview,
}: {
  coin: TreasureCoin;
  actionLoadingKey: string | null;
  onAction: (action: TreasureAction) => void;
  onPreview: () => void;
}) {
  const imageUri = getCoinImageUri(coin);
  const badge = getBadge(coin);
  const ownerLine = getOwnerLine(coin);
  const buyLoading = actionLoadingKey === `BUY-${coin.id}`;
  const requestLoading = actionLoadingKey === `REQUEST-${coin.id}`;
  const listLoading = actionLoadingKey === `LIST-${coin.id}`;
  const showBuy = coin.can_buy && coin.status !== "EXCLUSIVE_LOCKED";
  const showList = coin.can_list_for_sale;
  const showRequest = coin.can_request_exclusive && coin.status !== "EXCLUSIVE_LOCKED";
  const buyButtonTitle = coin.listed_by_me
    ? `Buy back for ${formatAmount(coin.current_price)} O²`
    : `Buy for ${formatAmount(coin.current_price)} O²`;

  return (
    <LinearGradient
      colors={coin.status === "EXCLUSIVE_LOCKED" ? ["#2B1D0C", "#101010", "#070707"] : ["#181109", "#0D0B08", "#17100A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, coin.status === "EXCLUSIVE_LOCKED" ? styles.cardExclusive : null]}
    >
      <View style={styles.cardTopLine} />

      <View style={styles.cardHeaderRow}>
        <View style={[styles.badge, { borderColor: badge.border, backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{getCoinName(coin)}</Text>
      </View>

      <View style={styles.cardBodyRow}>
        <Pressable onPress={onPreview} style={({ pressed }) => [styles.coinThumbWrap, pressed ? styles.pressed : null]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.coinThumb} resizeMode="contain" />
          ) : (
            <Image source={appCoinImage} style={styles.coinThumb} resizeMode="contain" />
          )}
        </Pressable>

        <View style={styles.cardDetails}>
          {ownerLine ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{ownerLine.label}</Text>
              <Text
                style={[styles.infoValue, coin.status === "EXCLUSIVE_LOCKED" ? styles.exclusiveValue : null]}
                numberOfLines={1}
              >
                {ownerLine.value}
              </Text>
            </View>
          ) : null}

          {coin.status === "EXCLUSIVE_LOCKED" ? (
            <View style={styles.exclusiveSeal}>
              <Text style={styles.exclusiveSealIcon}>◆</Text>
              <Text style={styles.exclusiveSealText}>PHYSICAL OWNER · NEVER FOR SALE</Text>
            </View>
          ) : null}

          {coin.status === "FOR_SALE" && coin.sale_original_price ? (
            <Text style={styles.saleHint}>SALE · was {formatAmount(coin.sale_original_price)} O²</Text>
          ) : null}

          {coin.has_pending_request ? <Text style={styles.pendingHint}>REQUEST PENDING</Text> : null}
          {coin.insufficient_balance ? <Text style={styles.errorHint}>INSUFFICIENT BALANCE</Text> : null}
        </View>
      </View>

      <View style={styles.actionsStack}>
        {showBuy ? (
          <VaultButton
            title={buyButtonTitle}
            loading={buyLoading}
            disabled={!!coin.insufficient_balance || !!actionLoadingKey}
            onPress={() => onAction("BUY")}
          />
        ) : null}

        {showRequest ? (
          <VaultButton
            title="Request"
            variant="request"
            compact
            loading={requestLoading}
            disabled={!!actionLoadingKey || !!coin.has_pending_request}
            onPress={() => onAction("REQUEST")}
          />
        ) : null}

        {showList ? (
          <VaultButton
            title="List for sale"
            loading={listLoading}
            disabled={!!actionLoadingKey}
            onPress={() => onAction("LIST")}
          />
        ) : null}
      </View>
    </LinearGradient>
  );
}

function VaultButton({
  title,
  variant = "gold",
  compact = false,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  variant?: "gold" | "dark" | "ghost" | "request";
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const isGold = variant === "gold";
  const isRequest = variant === "request";
  const isDisabled = disabled || loading;

  const content = loading ? (
    <ActivityIndicator size="small" color={isGold ? "#0B0F16" : theme.colors.gold2} />
  ) : (
    <Text
      style={[
        styles.vaultButtonText,
        compact ? styles.vaultButtonTextCompact : null,
        isGold ? styles.vaultButtonTextGold : styles.vaultButtonTextLight,
      ]}
      numberOfLines={2}
    >
      {title}
    </Text>
  );

  if (isGold || isRequest) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [pressed ? styles.pressed : null, isDisabled ? styles.disabled : null]}
      >
        <LinearGradient
          colors={isRequest ? ["#19342E", "#0D1917"] : theme.gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.vaultButton,
            compact ? styles.vaultButtonCompact : null,
            isRequest ? styles.vaultButtonRequest : styles.vaultButtonGold,
          ]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.vaultButton,
        compact ? styles.vaultButtonCompact : null,
        variant === "dark" ? styles.vaultButtonDark : styles.vaultButtonGhost,
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

function SortButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sortButton, active ? styles.sortButtonActive : null]}>
      <Text style={[styles.sortButtonText, active ? styles.sortButtonTextActive : null]}>{title}</Text>
    </Pressable>
  );
}

function TreasureModal({
  visible,
  title,
  message,
  coin,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  dismissable = true,
  animateCoin = false,
}: {
  visible: boolean;
  title: string;
  message?: string;
  coin?: TreasureCoin | null;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  dismissable?: boolean;
  animateCoin?: boolean;
}) {
  const coinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !animateCoin || !coin) {
      coinAnim.setValue(0);
      return;
    }

    coinAnim.setValue(0);
    Animated.sequence([
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(coinAnim, {
        toValue: 0.72,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateCoin, coin, coinAnim, visible]);

  const animatedCoinStyle = animateCoin
    ? {
        transform: [
          { scale: coinAnim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0.78, 1.12, 1] }) },
          { rotateY: coinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
        ],
      }
    : null;

  const animatedGlowStyle = animateCoin
    ? {
        opacity: coinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.72, 0.32] }),
        transform: [
          { scale: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.28] }) },
        ],
      }
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onCancel : undefined} statusBarTranslucent>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onCancel : undefined} />
        <View style={styles.modalCenterWrap}>
          <ThemedCard glow="gold" style={styles.modalCard}>
            {coin ? (
              <LinearGradient
                colors={["rgba(214,179,106,0.24)", "rgba(20,15,9,0.98)", "rgba(7,7,7,0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalCoinShowcase}
              >
                <Animated.View style={[styles.modalCoinAura, animatedGlowStyle]} />
                <Animated.View style={[styles.modalCoinFrame, animatedCoinStyle]}>
                  <Image source={getCoinPreviewImage(coin)} style={styles.modalCoinImage} resizeMode="contain" />
                </Animated.View>
                <View style={styles.modalCoinTextWrap}>
                  {animateCoin ? <Text style={styles.purchaseSuccessPill}>ADDED TO COLLECTION</Text> : null}
                  <Text style={styles.modalCoinEyebrow}>TREASURE COIN</Text>
                  <Text style={styles.modalCoinName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {getCoinName(coin)}
                  </Text>
                </View>
              </LinearGradient>
            ) : null}

            <Text style={styles.modalTitle}>{title}</Text>
            {message ? <Text style={styles.modalMessage}>{message}</Text> : null}

            <View style={styles.modalActions}>
              {onCancel ? (
                <ThemedButton title={cancelLabel} variant="dark" onPress={onCancel} style={styles.modalButton} />
              ) : null}
              <ThemedButton
                title={confirmLabel}
                onPress={onConfirm}
                loading={loading}
                style={styles.modalButton}
                variant="gold"
              />
            </View>
          </ThemedCard>
        </View>
      </View>
    </Modal>
  );
}

function getCoinImageUri(coin: TreasureCoin) {
  if (!coin.image_base64) return null;
  return `data:${coin.image_mime || "image/png"};base64,${coin.image_base64}`;
}

function getCoinPreviewImage(coin: TreasureCoin) {
  const imageUri = getCoinImageUri(coin);
  return imageUri ? { uri: imageUri } : appCoinImage;
}

function getCoinName(coin: TreasureCoin) {
  return coin.title || coin.code || `Coin ${coin.id}`;
}

function compareCoinNames(a: TreasureCoin, b: TreasureCoin) {
  const nameCompare = compareNaturalText(getCoinName(a), getCoinName(b));
  if (nameCompare !== 0) return nameCompare;

  const codeCompare = compareNaturalText(a.code || "", b.code || "");
  if (codeCompare !== 0) return codeCompare;

  return Number(a.id || 0) - Number(b.id || 0);
}

function compareNaturalText(a: string, b: string) {
  const leftParts = splitNaturalText(a.trim().toLowerCase());
  const rightParts = splitNaturalText(b.trim().toLowerCase());
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const bothNumbers = /^\d+$/.test(leftPart) && /^\d+$/.test(rightPart);

    if (bothNumbers) {
      const difference = Number(leftPart) - Number(rightPart);
      if (difference !== 0) return difference;
      continue;
    }

    const textCompare = leftPart.localeCompare(rightPart);
    if (textCompare !== 0) return textCompare;
  }

  return 0;
}

function splitNaturalText(value: string) {
  return value.match(/\d+|\D+/g) || [value];
}

function isMarketCoin(coin: TreasureCoin) {
  return coin.status !== "EXCLUSIVE_LOCKED";
}

function getBadge(coin: TreasureCoin) {
  if (coin.status === "EXCLUSIVE_LOCKED") {
    return {
      label: "◆ PHYSICAL",
      color: "#FFF4C8",
      border: "rgba(255,232,170,0.95)",
      bg: "rgba(214,179,106,0.24)",
    };
  }

  if (coin.owned_by_me) {
    return {
      label: "OWNED BY YOU",
      color: theme.colors.success,
      border: "rgba(88,211,155,0.55)",
      bg: "rgba(88,211,155,0.12)",
    };
  }

  if (coin.status === "FOR_SALE") {
    return {
      label: "SALE",
      color: "#FFE7A4",
      border: "rgba(255,231,164,0.7)",
      bg: "rgba(214,179,106,0.14)",
    };
  }

  if (coin.status === "PAID_OWNED") {
    return {
      label: "OWNED",
      color: theme.colors.gold2,
      border: theme.colors.borderStrong,
      bg: "rgba(214,179,106,0.12)",
    };
  }

  return {
    label: "AVAILABLE",
    color: theme.colors.gold2,
    border: theme.colors.borderStrong,
    bg: "rgba(214,179,106,0.14)",
  };
}

function getOwnerLine(coin: TreasureCoin) {
  if (coin.status === "EXCLUSIVE_LOCKED") {
    return {
      label: "Physical owner",
      value: coin.owner_username || "Unknown",
    };
  }

  if (coin.status === "PAID_OWNED") {
    return {
      label: "Owned by",
      value: coin.owner_username || "Unknown",
    };
  }

  if (coin.status === "FOR_SALE" && coin.sale_seller_username) {
    return {
      label: "Listed by",
      value: coin.sale_seller_username,
    };
  }

  return null;
}

function getConfirmTitle(confirmAction: { action: TreasureAction; coin: TreasureCoin } | null) {
  if (!confirmAction) return "Confirm";
  if (confirmAction.action === "BUY") return "Buy this coin?";
  if (confirmAction.action === "LIST") return "List for sale?";
  return "Request exclusive ownership?";
}

function getConfirmMessage(confirmAction: { action: TreasureAction; coin: TreasureCoin } | null) {
  if (!confirmAction) return "";
  const { action, coin } = confirmAction;

  if (action === "BUY") {
    if (coin.listed_by_me) {
      return `You are about to buy back ${getCoinName(coin)} for ${formatAmount(coin.current_price)} O². You already received the upfront sale refund, so you will not receive the remaining sale refund when buying it yourself.`;
    }

    return `You are about to buy ${getCoinName(coin)} for ${formatAmount(coin.current_price)} O². If someone buys it after you, you will receive a full refund of what you paid.`;
  }

  if (action === "LIST") {
    const paid = Number(coin.last_purchase_price || 0);
    const upfront = Math.floor(paid / 2);
    return `You will list ${getCoinName(coin)} for sale. You receive ${formatAmount(upfront)} O² now, the coin leaves your collection, and you receive the remaining ${formatAmount(paid - upfront)} O² when another player buys it.`;
  }

  return `Ask the admin to approve ${getCoinName(coin)} as your exclusive physical coin. If approved, it will be yours forever and will never be for sale.`;
}

function getConfirmLabel(confirmAction: { action: TreasureAction; coin: TreasureCoin } | null) {
  if (!confirmAction) return "Confirm";
  if (confirmAction.action === "BUY") return "Buy";
  if (confirmAction.action === "LIST") return "List";
  return "Send Request";
}

function getSuccessTitle(action: TreasureAction) {
  if (action === "BUY") return "Coin bought";
  if (action === "LIST") return "Coin listed";
  return "Request sent";
}

function getSuccessMessage(action: TreasureAction, coin: TreasureCoin) {
  if (action === "BUY") {
    return coin.listed_by_me
      ? `${getCoinName(coin)} was returned to your collection.`
      : `${getCoinName(coin)} was added to your collection.`;
  }
  if (action === "LIST") return `${getCoinName(coin)} is now listed in the Treasure Room.`;
  return `Your request for ${getCoinName(coin)} is waiting for admin approval.`;
}

function getErrorTitle(action: TreasureAction) {
  if (action === "BUY") return "Could not buy coin";
  if (action === "LIST") return "Could not list coin";
  return "Could not send request";
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 84,
  },
  cornerTop: {
    position: "absolute",
    top: 8,
    right: 14,
    fontSize: 70,
    color: "rgba(214,179,106,0.08)",
    zIndex: 0,
  },
  cornerBottom: {
    position: "absolute",
    bottom: 8,
    left: 10,
    fontSize: 92,
    color: "rgba(243,228,190,0.06)",
    zIndex: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    zIndex: 1,
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
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  headerCoin: {
    width: 48,
    height: 48,
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    zIndex: 1,
  },
  heroEyebrow: {
    color: theme.colors.gold2,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  heroText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  stickyBalanceShell: {
    backgroundColor: "rgba(5,5,5,0.96)",
    paddingBottom: 10,
    zIndex: 20,
  },
  balancePill: {
    minHeight: 58,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(14,11,7,0.98)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  balanceLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  balanceValue: {
    color: theme.colors.gold2,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    maxWidth: 190,
    textAlign: "right",
  },
  controlsPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    marginBottom: 12,
    zIndex: 1,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sortLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  sortButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sortButton: {
    minHeight: 32,
    minWidth: 68,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  sortButtonActive: {
    backgroundColor: "rgba(214,179,106,0.22)",
    borderColor: theme.colors.gold2,
  },
  sortButtonText: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sortButtonTextActive: {
    color: theme.colors.gold2,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  card: {
    width: "48.5%",
    borderRadius: 22,
    borderWidth: 1.1,
    borderColor: theme.colors.borderStrong,
    padding: 10,
    overflow: "hidden",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.17,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardExclusive: {
    borderColor: "rgba(255,232,170,0.72)",
    shadowOpacity: 0.26,
  },
  cardTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
    backgroundColor: "rgba(243,228,190,0.68)",
  },
  cardHeaderRow: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "center",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.35,
  },
  cardTitle: {
    color: theme.colors.gold2,
    flex: 1,
    minWidth: 0,
    fontSize: 10.6,
    lineHeight: 13,
    fontWeight: "900",
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  cardBodyRow: {
    alignItems: "center",
    gap: 8,
  },
  coinThumbWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(214,179,106,0.18)",
    backgroundColor: "rgba(214,179,106,0.05)",
    paddingVertical: 8,
  },
  coinThumb: {
    width: 92,
    height: 92,
  },
  cardDetails: {
    width: "100%",
    minWidth: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  infoLabel: {
    color: theme.colors.textSoft,
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  infoValue: {
    color: theme.colors.gold2,
    fontSize: 11.5,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
  },
  exclusiveValue: {
    color: "#FFF2BF",
  },
  exclusiveSeal: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,232,170,0.5)",
    backgroundColor: "rgba(214,179,106,0.11)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 6,
  },
  exclusiveSealIcon: {
    color: "#FFF2BF",
    fontSize: 9,
    fontWeight: "900",
  },
  exclusiveSealText: {
    color: "#FFF2BF",
    fontSize: 7.6,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.35,
    textAlign: "center",
  },
  saleHint: {
    color: theme.colors.gold2,
    fontSize: 9.5,
    fontWeight: "900",
    marginTop: 1,
    letterSpacing: 0.55,
  },
  pendingHint: {
    color: theme.colors.gold2,
    fontSize: 9.2,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 0.65,
  },
  errorHint: {
    color: theme.colors.danger,
    fontSize: 9.2,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 0.55,
  },
  actionsStack: {
    gap: 7,
    marginTop: 8,
  },
  vaultButton: {
    minHeight: 38,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  vaultButtonCompact: {
    minHeight: 32,
    alignSelf: "center",
    minWidth: 118,
    paddingHorizontal: 14,
  },
  vaultButtonGold: {
    borderColor: "rgba(214,179,106,0.18)",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  vaultButtonRequest: {
    borderColor: "rgba(214,179,106,0.48)",
    shadowColor: "#0E3A32",
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  vaultButtonDark: {
    backgroundColor: "rgba(214,179,106,0.12)",
    borderColor: theme.colors.borderStrong,
  },
  vaultButtonGhost: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: theme.colors.border,
  },
  vaultButtonText: {
    fontSize: 9.8,
    lineHeight: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  vaultButtonTextCompact: {
    fontSize: 9.4,
    letterSpacing: 0.8,
  },
  vaultButtonTextGold: {
    color: "#130D05",
  },
  vaultButtonTextLight: {
    color: theme.colors.gold2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: 22,
  },
  modalCenterWrap: {
    justifyContent: "center",
  },
  modalCard: {
    maxWidth: 460,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    padding: 14,
  },
  modalCoinShowcase: {
    width: "100%",
    minHeight: 122,
    borderRadius: 24,
    borderWidth: 1.1,
    borderColor: theme.colors.borderStrong,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  modalCoinAura: {
    position: "absolute",
    left: -22,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "rgba(214,179,106,0.13)",
  },
  modalCoinFrame: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(5,5,5,0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadowGold,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  modalCoinImage: {
    width: 76,
    height: 76,
  },
  modalCoinTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  purchaseSuccessPill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,232,170,0.75)",
    backgroundColor: "rgba(214,179,106,0.2)",
    color: "#FFF2BF",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    marginBottom: 7,
  },
  modalCoinEyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  modalCoinName: {
    color: theme.colors.gold2,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: theme.colors.gold2,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  modalMessage: {
    color: theme.colors.textSoft,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  modalButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
