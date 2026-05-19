import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../theme/theme";
import CoinPreviewModal from "./CoinPreviewModal";

const appCoinImage = require("../../assets/images/doubleo-coin.png");
const winnerCoinImage = require("../../assets/images/winner-coin.png");

const place1CoinImage = require("../../assets/images/place-1-coin.png");
const place2CoinImage = require("../../assets/images/place-2-coin.png");
const place3CoinImage = require("../../assets/images/place-3-coin.png");
const place4CoinImage = require("../../assets/images/place-4-coin.png");
const place5CoinImage = require("../../assets/images/place-5-coin.png");

const highCardCoinImage = require("../../assets/images/high-card-coin.png");
const pairCoinImage = require("../../assets/images/pair-coin.png");
const twoPairCoinImage = require("../../assets/images/two-pair-coin.png");
const threeOfAKindCoinImage = require("../../assets/images/three-of-a-kind-coin.png");
const straightCoinImage = require("../../assets/images/straight-coin.png");
const flushCoinImage = require("../../assets/images/flush-coin.png");
const fullHouseCoinImage = require("../../assets/images/full-house-coin.png");
const fourOfAKindCoinImage = require("../../assets/images/four-of-a-kind-coin.png");
const straightFlushCoinImage = require("../../assets/images/straight-flush-coin.png");
const royalFlushCoinImage = require("../../assets/images/royal-flush-coin.png");

export type CardHandKey =
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

export type SelectedCoinKey = "APP" | "CARD" | "PLACE" | `SPECIAL_${number}`;

export type SpecialCoin = {
  id: number;
  code?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  image_mime?: string | null;
  image_base64?: string | null;
  ownership_type?: "PAID" | "EXCLUSIVE" | string | null;
  last_purchase_price?: number | null;
  locked_forever?: boolean;
};

export type AvatarPlayer = {
  id?: number;
  user_id?: number;
  username: string;
  rank?: number | null;
  profile_image_base64?: string | null;
  secondary_profile_image_base64?: string | null;
  card_hand?: CardHandKey | string | null;
  selected_coin_1?: SelectedCoinKey | string | null;
  selected_coin_2?: SelectedCoinKey | string | null;
  is_winner_coin_holder?: boolean;
  special_coins?: SpecialCoin[];
};

type DisplayCoin = {
  key: string;
  label: string;
  image: ImageSourcePropType;
  kind: "winner" | "selected";
};

type Props = {
  player: AvatarPlayer;
  size: number;
  coinSize?: number;
  winnerSize?: number;
  borderColor?: string;
  enableImageToggle?: boolean;
  onAvatarPress?: () => void;
};

export default function AvatarWithCoins({
  player,
  size,
  coinSize = Math.round(size * 0.46),
  winnerSize = Math.round(size * 0.54),
  borderColor = theme.colors.borderStrong,
  enableImageToggle = true,
  onAvatarPress,
}: Props) {
  const [showSecondary, setShowSecondary] = useState(false);
  const [previewCoin, setPreviewCoin] = useState<DisplayCoin | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipProgress = useRef(new Animated.Value(0)).current;

  const hasSecondary = !!player.secondary_profile_image_base64;
  const currentImage = showSecondary && hasSecondary
    ? player.secondary_profile_image_base64
    : player.profile_image_base64;
  const avatarUri = currentImage ? `data:image/jpeg;base64,${currentImage}` : null;

  const selectedCoins = useMemo(() => getSelectedCoinsForDisplay(player), [player]);
  const firstCoin = selectedCoins[0] || null;
  const secondCoin = selectedCoins[1] || null;
  const onlyOneSelectedCoin = !!firstCoin && !secondCoin;
  const winnerCoin = player.is_winner_coin_holder
    ? { key: "WINNER", label: "Last Session Winner", image: winnerCoinImage as ImageSourcePropType, kind: "winner" as const }
    : null;

  const largestCoinSize = Math.max(coinSize, winnerSize);
  const containerWidth = size;
  const containerHeight = size + largestCoinSize * 0.24;
  const avatarLeft = 0;

  const rotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "112deg"],
  });

  const flipScale = flipProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.9, 0.82],
  });

  const flipRotateZ = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "5deg"],
  });

  const flipShineOpacity = flipProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.65, 0.95],
  });

  function runFlip() {
    if (!enableImageToggle || !hasSecondary || isFlipping) return;

    setIsFlipping(true);

    Animated.timing(flipProgress, {
      toValue: 1,
      duration: 720,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShowSecondary((prev) => !prev);

      Animated.sequence([
        Animated.timing(flipProgress, {
          toValue: 0.18,
          duration: 330,
          easing: Easing.out(Easing.back(1.75)),
          useNativeDriver: true,
        }),
        Animated.timing(flipProgress, {
          toValue: 0,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setIsFlipping(false));
    });
  }

  function handleAvatarPress() {
    if (onAvatarPress) {
      onAvatarPress();
      return;
    }

    runFlip();
  }

  return (
    <View style={{ width: containerWidth, height: containerHeight, alignItems: "center" }}>
      <Pressable
        onPress={handleAvatarPress}
        disabled={!onAvatarPress && (!enableImageToggle || !hasSecondary)}
        style={[styles.avatarPressable, { left: avatarLeft, width: size, height: size }]}
      >
        <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY }, { rotateZ: flipRotateZ }, { scale: flipScale }] }}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.35,
                borderColor,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            />
          ) : (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.35,
                borderColor,
                backgroundColor: "rgba(214,179,106,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[styles.fallbackText, { fontSize: Math.max(13, size * 0.35) }]}>
                {player.username.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flipShine,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: flipShineOpacity,
              },
            ]}
          />
        </Animated.View>
      </Pressable>

      {winnerCoin ? (
        <CoinButton
          coin={winnerCoin}
          size={winnerSize}
          style={{
            position: "absolute",
            left: avatarLeft - winnerSize * 0.4,
            bottom: 0,
            zIndex: 5,
          }}
          onPress={setPreviewCoin}
        />
      ) : null}

      {secondCoin ? (
        <CoinButton
          coin={{ ...secondCoin, kind: "selected" }}
          size={coinSize}
          style={{
            position: "absolute",
            left: avatarLeft + size - coinSize * 0.5,
            bottom: coinSize * 0.55,
            zIndex: 4,
          }}
          onPress={setPreviewCoin}
        />
      ) : null}

      {firstCoin ? (
        <CoinButton
          coin={{ ...firstCoin, kind: "selected" }}
          size={coinSize}
          style={{
            position: "absolute",
            left: avatarLeft + size - coinSize * (onlyOneSelectedCoin ? 0.75 : 0.8),
            bottom: onlyOneSelectedCoin ? coinSize * 0.2 : 0,
            zIndex: 6,
          }}
          onPress={setPreviewCoin}
        />
      ) : null}

      <CoinPreviewModal
        visible={!!previewCoin}
        title={previewCoin?.label || "Coin"}
        image={previewCoin?.image || null}
        onClose={() => setPreviewCoin(null)}
      />
    </View>
  );
}

function CoinButton({
  coin,
  size,
  style,
  onPress,
}: {
  coin: DisplayCoin;
  size: number;
  style: any;
  onPress: (coin: DisplayCoin) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(coin)}
      hitSlop={8}
      style={[
        style,
        styles.coinButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
      ]}
    >
      <Image
        source={coin.image}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="contain"
      />
    </Pressable>
  );
}

export function getAllOwnedCoinsForDisplay(player: AvatarPlayer) {
  const rank = Number(player.rank || 0);
  const coins: { key: string; label: string; image: ImageSourcePropType }[] = [
    { key: "APP", label: "App Coin", image: appCoinImage },
    {
      key: `CARD_${normalizeCardHand(player.card_hand)}`,
      label: getCardHandLabel(normalizeCardHand(player.card_hand)),
      image: getCardHandCoinSource(normalizeCardHand(player.card_hand)),
    },
  ];

  if (rank >= 1 && rank <= 5) {
    coins.push({ key: `PLACE_${rank}`, label: formatRankPlace(rank), image: getPlaceCoinSource(rank) });
  }

  if (player.is_winner_coin_holder) {
    coins.push({ key: "WINNER", label: "Winner Coin", image: winnerCoinImage });
  }

  (player.special_coins || []).forEach((coin) => {
    const uri = getSpecialCoinImageUri(coin);
    if (!uri) return;

    coins.push({
      key: `SPECIAL_${coin.id}`,
      label: coin.title || "Treasure Coin",
      image: { uri },
    });
  });

  return coins;
}

export function getSpecialCoinImageUri(coin: SpecialCoin | null | undefined) {
  if (!coin?.image_base64) return null;

  const mime = coin.image_mime || "image/png";
  return `data:${mime};base64,${coin.image_base64}`;
}

export function getSelectedCoinsForDisplay(player: AvatarPlayer) {
  const first = normalizeSelectedCoin(player.selected_coin_1);
  const second = normalizeSelectedCoin(player.selected_coin_2);
  const coins: { key: string; label: string; image: ImageSourcePropType }[] = [];

  if (first) {
    const coin = getSelectedCoin(first, player);
    if (coin) coins.push(coin);
  }

  if (second && second !== first) {
    const coin = getSelectedCoin(second, player);
    if (coin) coins.push(coin);
  }

  return coins;
}

function getSelectedCoin(coinKey: SelectedCoinKey, player: AvatarPlayer) {
  const specialMatch = String(coinKey).match(/^SPECIAL_(\d+)$/);

  if (specialMatch) {
    const coinId = Number(specialMatch[1]);
    const specialCoin = (player.special_coins || []).find((coin) => Number(coin.id) === coinId);
    const uri = getSpecialCoinImageUri(specialCoin);

    if (specialCoin && uri) {
      return { key: `SPECIAL_${coinId}`, label: specialCoin.title || "Treasure Coin", image: { uri } as ImageSourcePropType };
    }

    return null;
  }

  if (coinKey === "APP") return { key: "APP", label: "App Coin", image: appCoinImage as ImageSourcePropType };
  if (coinKey === "CARD") {
    const hand = normalizeCardHand(player.card_hand);
    return { key: `CARD_${hand}`, label: getCardHandLabel(hand), image: getCardHandCoinSource(hand) };
  }
  if (coinKey === "PLACE") {
    const rank = Number(player.rank || 0);
    if (rank >= 1 && rank <= 5) return { key: `PLACE_${rank}`, label: formatRankPlace(rank), image: getPlaceCoinSource(rank) };
  }
  return null;
}

export function normalizeSelectedCoin(value: any): SelectedCoinKey | null {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "APP" || normalized === "CARD" || normalized === "PLACE") return normalized;

  const specialMatch = normalized.match(/^SPECIAL_(\d+)$/);
  if (specialMatch) return `SPECIAL_${Number(specialMatch[1])}` as SelectedCoinKey;

  return null;
}

export function normalizeCardHand(value: any): CardHandKey {
  const normalized = String(value || "").toUpperCase() as CardHandKey;
  const validHands: CardHandKey[] = [
    "HIGH_CARD",
    "PAIR",
    "TWO_PAIR",
    "THREE_OF_A_KIND",
    "STRAIGHT",
    "FLUSH",
    "FULL_HOUSE",
    "FOUR_OF_A_KIND",
    "STRAIGHT_FLUSH",
    "ROYAL_FLUSH",
  ];
  return validHands.includes(normalized) ? normalized : "HIGH_CARD";
}

export function getCardHandLabel(hand: CardHandKey) {
  if (hand === "PAIR") return "Pair";
  if (hand === "TWO_PAIR") return "Two Pair";
  if (hand === "THREE_OF_A_KIND") return "Three of a Kind";
  if (hand === "STRAIGHT") return "Straight";
  if (hand === "FLUSH") return "Flush";
  if (hand === "FULL_HOUSE") return "Full House";
  if (hand === "FOUR_OF_A_KIND") return "Four of a Kind";
  if (hand === "STRAIGHT_FLUSH") return "Straight Flush";
  if (hand === "ROYAL_FLUSH") return "Royal Flush";
  return "High Card";
}

export function getCardHandCoinSource(hand: CardHandKey): ImageSourcePropType {
  if (hand === "PAIR") return pairCoinImage;
  if (hand === "TWO_PAIR") return twoPairCoinImage;
  if (hand === "THREE_OF_A_KIND") return threeOfAKindCoinImage;
  if (hand === "STRAIGHT") return straightCoinImage;
  if (hand === "FLUSH") return flushCoinImage;
  if (hand === "FULL_HOUSE") return fullHouseCoinImage;
  if (hand === "FOUR_OF_A_KIND") return fourOfAKindCoinImage;
  if (hand === "STRAIGHT_FLUSH") return straightFlushCoinImage;
  if (hand === "ROYAL_FLUSH") return royalFlushCoinImage;
  return highCardCoinImage;
}

export function getPlaceCoinSource(rank: number): ImageSourcePropType {
  if (rank === 1) return place1CoinImage;
  if (rank === 2) return place2CoinImage;
  if (rank === 3) return place3CoinImage;
  if (rank === 4) return place4CoinImage;
  if (rank === 5) return place5CoinImage;
  return appCoinImage;
}

export function formatRankPlace(rank: number) {
  const lastTwoDigits = rank % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${rank}TH PLACE`;
  const lastDigit = rank % 10;
  if (lastDigit === 1) return `${rank}ST PLACE`;
  if (lastDigit === 2) return `${rank}ND PLACE`;
  if (lastDigit === 3) return `${rank}RD PLACE`;
  return `${rank}TH PLACE`;
}

const styles = StyleSheet.create({
  avatarPressable: {
    position: "absolute",
    top: 0,
  },
  coinButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  flipShine: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(255,245,205,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,245,205,0.35)",
  },
  fallbackText: {
    color: theme.colors.gold2,
    fontWeight: "900",
  },
});
