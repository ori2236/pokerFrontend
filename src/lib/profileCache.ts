export type ProfileCacheData = {
  users: any[];
  profile: any | null;
  balance: number;
  todayNet: number;
  leaderboard: any[];
  dailySummary: any[];
};

let cachedProfileData: ProfileCacheData | null = null;

export function getProfileCache() {
  return cachedProfileData;
}

export function setProfileCache(data: ProfileCacheData) {
  cachedProfileData = data;
}

export function clearProfileCache() {
  cachedProfileData = null;
}
