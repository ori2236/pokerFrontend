import type { ImageSourcePropType } from "react-native";

export type AchievementCoinCode =
  | "DOUBLE_UP"
  | "TRIPLE_UP"
  | "QUINTUPLE_UP"
  | "MARKET_SHARK"
  | "HIGH_ROLLER"
  | "WIN_STREAK"
  | "HOT_STREAK"
  | "UNSTOPPABLE"
  | "PODIUM"
  | "ULTIMATE_TYCOON"
  | "PROGRAMMER"
  | "BEST_HAND_EVER"
  | "CARD_FULL_HOUSE"
  | "CARD_FOUR_OF_A_KIND"
  | "CARD_STRAIGHT_FLUSH"
  | "CARD_ROYAL_FLUSH"
  | "AA_WIN"
  | "SEVEN_DEUCE"
  | "HOST_MASTER"
  | "CO_FOUNDER";

export type AchievementCoin = {
  code: AchievementCoinCode | string;
  title: string;
  description?: string | null;
  award_mode?: "AUTO" | "ADMIN" | string | null;
  image_name?: string | null;
  sort_order?: number | null;
  awarded_at?: string | null;
  awarded_by_user_id?: number | null;
  source_session_id?: number | null;
};

export type AchievementCoinCatalogItem = {
  code: AchievementCoinCode;
  title: string;
  description: string;
  award_mode: "AUTO" | "ADMIN";
  image: ImageSourcePropType;
  group: "AUTO" | "CARD" | "MANUAL";
};

const achievementCoinImages: Record<AchievementCoinCode, ImageSourcePropType> = {
  DOUBLE_UP: require("../../assets/coins/double-up-coin.png"),
  TRIPLE_UP: require("../../assets/coins/triple-up-coin.png"),
  QUINTUPLE_UP: require("../../assets/coins/quintaple-up-coin.png"),
  MARKET_SHARK: require("../../assets/coins/market-shark-coin.png"),
  HIGH_ROLLER: require("../../assets/coins/high-roller-coin.png"),
  WIN_STREAK: require("../../assets/coins/win-streak-coin.png"),
  HOT_STREAK: require("../../assets/coins/hot-streak-coin.png"),
  UNSTOPPABLE: require("../../assets/coins/unstoppable-coin.png"),
  PODIUM: require("../../assets/coins/podium-coin.png"),
  ULTIMATE_TYCOON: require("../../assets/coins/ultimate-tycoon.png"),
  PROGRAMMER: require("../../assets/coins/programmer-coin.png"),
  BEST_HAND_EVER: require("../../assets/coins/best-hand-ever-coin.png"),
  CARD_FULL_HOUSE: require("../../assets/coins/full-house-coin.png"),
  CARD_FOUR_OF_A_KIND: require("../../assets/coins/four-of-a-kind-coin.png"),
  CARD_STRAIGHT_FLUSH: require("../../assets/coins/straight-flush-coin.png"),
  CARD_ROYAL_FLUSH: require("../../assets/coins/royal-flush-coin.png"),
  AA_WIN: require("../../assets/coins/aa-coin.png"),
  SEVEN_DEUCE: require("../../assets/coins/seven-deuce-coin.png"),
  HOST_MASTER: require("../../assets/coins/host-master.png"),
  CO_FOUNDER: require("../../assets/coins/co-founder-coin.png"),
};

export const ACHIEVEMENT_COIN_CATALOG: AchievementCoinCatalogItem[] = [
  {
    code: "DOUBLE_UP",
    title: "Double Up Coin",
    description: "Cashed out at least 2x the total session buy-in.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.DOUBLE_UP,
  },
  {
    code: "TRIPLE_UP",
    title: "Triple Up Coin",
    description: "Cashed out at least 3x the total session buy-in.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.TRIPLE_UP,
  },
  {
    code: "QUINTUPLE_UP",
    title: "Quintuple Up Coin",
    description: "Cashed out at least 5x the total session buy-in.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.QUINTUPLE_UP,
  },
  {
    code: "MARKET_SHARK",
    title: "Market Shark Coin",
    description: "Bought a treasure coin that belonged to another player.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.MARKET_SHARK,
  },
  {
    code: "HIGH_ROLLER",
    title: "High Roller Coin",
    description: "Bought a treasure coin for 300 O² or more.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.HIGH_ROLLER,
  },
  {
    code: "WIN_STREAK",
    title: "Win Streak Coin",
    description: "Finished 2 sessions in a row with profit.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.WIN_STREAK,
  },
  {
    code: "HOT_STREAK",
    title: "Hot Streak Coin",
    description: "Finished 3 sessions in a row with profit.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.HOT_STREAK,
  },
  {
    code: "UNSTOPPABLE",
    title: "Unstoppable Coin",
    description: "Finished 5 sessions in a row with profit.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.UNSTOPPABLE,
  },
  {
    code: "PODIUM",
    title: "Podium Coin",
    description: "Reached the top 3 places on the leaderboard.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.PODIUM,
  },
  {
    code: "ULTIMATE_TYCOON",
    title: "Ultimate Tycoon Coin",
    description: "Belongs to the player currently ranked first on the leaderboard.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.ULTIMATE_TYCOON,
  },
  {
    code: "PROGRAMMER",
    title: "Programmer Coin",
    description: "Automatically belongs to the app programmer/admin.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.PROGRAMMER,
  },
  {
    code: "BEST_HAND_EVER",
    title: "Best Hand Ever Coin",
    description:
      "Automatically held by the player or players with the strongest recorded card-hand coin.",
    award_mode: "AUTO",
    group: "AUTO",
    image: achievementCoinImages.BEST_HAND_EVER,
  },
  {
    code: "CARD_FULL_HOUSE",
    title: "Full House Coin",
    description: "Recorded Full House hand.",
    award_mode: "ADMIN",
    group: "CARD",
    image: achievementCoinImages.CARD_FULL_HOUSE,
  },
  {
    code: "CARD_FOUR_OF_A_KIND",
    title: "Four of a Kind Coin",
    description: "Recorded Four of a Kind hand.",
    award_mode: "ADMIN",
    group: "CARD",
    image: achievementCoinImages.CARD_FOUR_OF_A_KIND,
  },
  {
    code: "CARD_STRAIGHT_FLUSH",
    title: "Straight Flush Coin",
    description: "Recorded Straight Flush hand.",
    award_mode: "ADMIN",
    group: "CARD",
    image: achievementCoinImages.CARD_STRAIGHT_FLUSH,
  },
  {
    code: "CARD_ROYAL_FLUSH",
    title: "Royal Flush Coin",
    description: "Recorded Royal Flush hand.",
    award_mode: "ADMIN",
    group: "CARD",
    image: achievementCoinImages.CARD_ROYAL_FLUSH,
  },
  {
    code: "AA_WIN",
    title: "Pocket Aces Coin",
    description: "Won a hand with pocket aces.",
    award_mode: "ADMIN",
    group: "MANUAL",
    image: achievementCoinImages.AA_WIN,
  },
  {
    code: "SEVEN_DEUCE",
    title: "Seven Deuce Coin",
    description: "Won a hand with Seven-Deuce.",
    award_mode: "ADMIN",
    group: "MANUAL",
    image: achievementCoinImages.SEVEN_DEUCE,
  },
  {
    code: "HOST_MASTER",
    title: "Host Master Coin",
    description: "Awarded by the admin to whoever hosts the poker night.",
    award_mode: "ADMIN",
    group: "MANUAL",
    image: achievementCoinImages.HOST_MASTER,
  },
  {
    code: "CO_FOUNDER",
    title: "Co-Founder Coin",
    description: "Awarded by the admin to the app co-founders.",
    award_mode: "ADMIN",
    group: "MANUAL",
    image: achievementCoinImages.CO_FOUNDER,
  },
];

export const ADMIN_ACHIEVEMENT_COIN_CATALOG = ACHIEVEMENT_COIN_CATALOG.filter(
  (coin) => coin.award_mode === "ADMIN",
);

export const CARD_HAND_ACHIEVEMENT_COIN_CATALOG = ACHIEVEMENT_COIN_CATALOG.filter(
  (coin) => coin.group === "CARD",
);

export function normalizeAchievementCoinCode(value: any): AchievementCoinCode | null {
  const normalized = String(value || "").trim().toUpperCase() as AchievementCoinCode;
  return Object.prototype.hasOwnProperty.call(achievementCoinImages, normalized) ? normalized : null;
}

export function getAchievementCoinImage(code: any): ImageSourcePropType | null {
  const normalized = normalizeAchievementCoinCode(code);
  return normalized ? achievementCoinImages[normalized] : null;
}

export function getAchievementCoinTitle(code: any, fallback = "Achievement Coin") {
  const normalized = normalizeAchievementCoinCode(code);
  return ACHIEVEMENT_COIN_CATALOG.find((coin) => coin.code === normalized)?.title || fallback;
}
