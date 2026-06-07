import type { ImageSourcePropType } from "react-native";

const frame1Image = require("../../assets/frames/frame-1.png");
const frame3Image = require("../../assets/frames/frame-3.png");
const frame5Image = require("../../assets/frames/frame-5.png");
const frame7Image = require("../../assets/frames/frame-7.png");
const frame10Image = require("../../assets/frames/frame-10.png");
const frame13Image = require("../../assets/frames/frame-13.png");
const frame15Image = require("../../assets/frames/frame-15.png");

export type ProfileFrameLevel = 1 | 3 | 5 | 7 | 10 | 13 | 15;

export type FramePlayerLike = {
  username?: string | null;
  profile_image_base64?: string | null;
  rank?: number | null;
  is_winner_coin_holder?: boolean | number | null;
  special_coins?: { id?: number | string | null }[] | null;
  achievement_coins?: { code?: string | null }[] | null;
};

export type ProfileFrameGalleryItem = {
  level: ProfileFrameLevel;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  unlocked: boolean;
  active: boolean;
};

export type ProfileFrameFit = {
  /** AvatarWithCoins: changes only the profile photo size inside the frame. */
  avatarScale: number;
  /** AvatarWithCoins: positive = move photo right, negative = move left. Measured as avatar size percentage. */
  avatarTranslateX: number;
  /** AvatarWithCoins: positive = move photo down, negative = move up. Measured as avatar size percentage. */
  avatarTranslateY: number;
  /** AvatarWithCoins: changes only the frame image size. */
  frameScale: number;
  /** AvatarWithCoins: positive = move frame right, negative = move left. Measured as avatar size percentage. */
  frameTranslateX: number;
  /** AvatarWithCoins: positive = move frame down, negative = move up. Measured as avatar size percentage. */
  frameTranslateY: number;
  /** Frame popup: frame image size. */
  modalFrameScale: number;
  /** Frame popup: frame horizontal offset. Measured in pixels. */
  modalFrameTranslateX: number;
  /** Frame popup: frame vertical offset. Measured in pixels. */
  modalFrameTranslateY: number;
};

export const PROFILE_FRAME_LEVELS: ProfileFrameLevel[] = [1, 3, 5, 7, 10, 13, 15];

// One shared base layout for every place that renders profile frames.
// AvatarWithCoins uses this directly, and the Treasure Room frame cards use the same ratios.
// If you change these values, the leaderboard/profile/session avatars and the Treasure Room previews stay proportional.
export const PROFILE_FRAME_BASE_LAYOUT = {
  avatarImageScale: 0.8,
  frameScale: 1.24,
};

export const PROFILE_FRAME_IMAGES: Record<ProfileFrameLevel, ImageSourcePropType> = {
  1: frame1Image,
  3: frame3Image,
  5: frame5Image,
  7: frame7Image,
  10: frame10Image,
  13: frame13Image,
  15: frame15Image,
};

// Manual tuning for every frame.
// Change these numbers when a specific frame/photo does not sit perfectly in the frame hole.
// Scale examples: 0.92 = smaller, 1.08 = bigger.
// Translate examples: 0.03 in AvatarWithCoins = move by 3% of avatar size; 4 in cards/modals = move by 4 pixels.
export const PROFILE_FRAME_FIT: Record<ProfileFrameLevel, ProfileFrameFit> = {
  1: {
    avatarScale: 1.06,
    avatarTranslateX: 0.0025,
    avatarTranslateY: 0,
    frameScale: 1,
    frameTranslateX: 0,
    frameTranslateY: 0,
    modalFrameScale: 1,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 0,
  },
  3: {
    avatarScale: 1,
    avatarTranslateX: -0.0045,
    avatarTranslateY: 0.0215,
    frameScale: 1,
    frameTranslateX: 0,
    frameTranslateY: 0,
    modalFrameScale: 1,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 0,
  },
  5: {
    avatarScale: 0.92,
    avatarTranslateX: 0.005,
    avatarTranslateY: 0.0125,
    frameScale: 1.01,
    frameTranslateX: 0,
    frameTranslateY: 0,
    modalFrameScale: 1.02,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 0,
  },
  7: {
    avatarScale: 0.77,
    avatarTranslateX: 0.003,
    avatarTranslateY: -0.007,
    frameScale: 1.02,
    frameTranslateX: 0,
    frameTranslateY: 0,
    modalFrameScale: 1.04,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 0,
  },
  10: {
    avatarScale: 0.775,
    avatarTranslateX: 0.005,
    avatarTranslateY: 0.014,
    frameScale: 1.02,
    frameTranslateX: 0,
    frameTranslateY: 0,
    modalFrameScale: 1.04,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 0,
  },
  13: {
    avatarScale: 0.69,
    avatarTranslateX: 0.0055,
    avatarTranslateY: 0.069,
    frameScale: 1.03,
    frameTranslateX: 0,
    frameTranslateY: 0,
    // Crown frames have extra transparent/top height, so the modal keeps them slightly tighter and lower.
    modalFrameScale: 1.01,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 8,
  },
  15: {
    avatarScale: 0.69,
    avatarTranslateX: -0.002,
    avatarTranslateY: 0.071,
    frameScale: 1.03,
    frameTranslateX: 0,
    frameTranslateY: 0,
    // Crown frames have extra transparent/top height, so the modal keeps them slightly tighter and lower.
    modalFrameScale: 1,
    modalFrameTranslateX: 0,
    modalFrameTranslateY: 8,
  },
};

export function getProfileFrameCoinCount(player: FramePlayerLike | null | undefined) {
  const ownedSelectableCoins = new Set<string>();

  ownedSelectableCoins.add("APP");

  const rank = Number(player?.rank || 0);
  if (rank >= 1 && rank <= 5) {
    ownedSelectableCoins.add("PLACE");
  }

  (player?.special_coins || []).forEach((coin) => {
    const id = Number(coin?.id || 0);
    if (Number.isInteger(id) && id > 0) {
      ownedSelectableCoins.add(`SPECIAL_${id}`);
    }
  });

  (player?.achievement_coins || []).forEach((coin) => {
    const code = String(coin?.code || "").trim().toUpperCase();
    if (code) {
      ownedSelectableCoins.add(`ACHIEVEMENT_${code}`);
    }
  });

  if (Boolean(player?.is_winner_coin_holder)) {
    ownedSelectableCoins.add("WINNER");
  }

  return ownedSelectableCoins.size;
}

export function getProfileFrameLevelByCount(coinCount: number): ProfileFrameLevel {
  const normalizedCount = Math.max(1, Number(coinCount || 1));
  let selectedLevel: ProfileFrameLevel = 1;

  PROFILE_FRAME_LEVELS.forEach((level) => {
    if (normalizedCount >= level) {
      selectedLevel = level;
    }
  });

  return selectedLevel;
}

export function getProfileFrameImageSource(player: FramePlayerLike | null | undefined) {
  const count = getProfileFrameCoinCount(player);
  return PROFILE_FRAME_IMAGES[getProfileFrameLevelByCount(count)];
}

export function getProfileFrameFit(level: ProfileFrameLevel | number | null | undefined) {
  const normalizedLevel = PROFILE_FRAME_LEVELS.includes(level as ProfileFrameLevel)
    ? (level as ProfileFrameLevel)
    : 1;

  return PROFILE_FRAME_FIT[normalizedLevel];
}

export function getProfileFrameInfo(player: FramePlayerLike | null | undefined) {
  const coinCount = getProfileFrameCoinCount(player);
  const level = getProfileFrameLevelByCount(coinCount);
  const nextLevel = PROFILE_FRAME_LEVELS.find((item) => item > coinCount) || null;

  return {
    coinCount,
    level,
    image: PROFILE_FRAME_IMAGES[level],
    fit: getProfileFrameFit(level),
    nextLevel,
    coinsToNextLevel: nextLevel ? nextLevel - coinCount : 0,
  };
}

export function getProfileFrameTitle(level: ProfileFrameLevel) {
  return `${level} COIN${level === 1 ? "" : "S"}`;
}

export function getProfileFrameGalleryItems(player: FramePlayerLike | null | undefined): ProfileFrameGalleryItem[] {
  const info = getProfileFrameInfo(player);

  return PROFILE_FRAME_LEVELS.map((level) => ({
    level,
    title: getProfileFrameTitle(level),
    subtitle: level === 1 ? "Default profile frame" : `Unlocks at ${level} profile coins`,
    image: PROFILE_FRAME_IMAGES[level],
    unlocked: info.coinCount >= level,
    active: info.level === level,
  }));
}
