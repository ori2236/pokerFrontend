import { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../../src/components/ScreenContainer";
import SpinningCoin from "../../src/components/SpinningCoin";
import ThemedCard from "../../src/components/ThemedCard";
import ThemedButton from "../../src/components/ThemedButton";
import AppModal from "../../src/components/AppModal";
import LuxuryInput from "../../src/components/LuxuryInput";
import AvatarWithCoins from "../../src/components/AvatarWithCoins";
import CoinPreviewModal from "../../src/components/CoinPreviewModal";
import {
    ADMIN_ACHIEVEMENT_COIN_CATALOG,
    getAchievementCoinImage,
    getAchievementCoinTitle,
    normalizeAchievementCoinCode,
} from "../../src/lib/achievementCoins";
import type { AchievementCoin, AchievementCoinCode } from "../../src/lib/achievementCoins";
import { api } from "../../src/lib/api";
import { getProfileCache, setProfileCache } from "../../src/lib/profileCache";
import { useAuth } from "../../src/context/AuthContext";
import { formatAmount, formatShortDate, theme } from "../../src/theme/theme";

const appCoinImage = require("../../assets/images/doubleo-coin.png");
const winnerCoinImage = require("../../assets/images/winner-coin.png");
const place1CoinImage = require("../../assets/images/place-1-coin.png");
const place2CoinImage = require("../../assets/images/place-2-coin.png");
const place3CoinImage = require("../../assets/images/place-3-coin.png");
const place4CoinImage = require("../../assets/images/place-4-coin.png");
const place5CoinImage = require("../../assets/images/place-5-coin.png");

const fullHouseCoinImage = require("../../assets/coins/full-house-coin.png");
const fourOfAKindCoinImage = require("../../assets/coins/four-of-a-kind-coin.png");
const straightFlushCoinImage = require("../../assets/coins/straight-flush-coin.png");
const royalFlushCoinImage = require("../../assets/coins/royal-flush-coin.png");

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

type SelectedCoinKey = "APP" | "PLACE" | `SPECIAL_${number}` | `ACHIEVEMENT_${string}`;

type UserRow = {
    id: number;
    username: string;
    role: "ADMIN" | "USER";
    profile_image_base64: string | null;
    secondary_profile_image_base64?: string | null;
    card_hand?: CardHandKey | string | null;
    selected_coin_1?: SelectedCoinKey | string | null;
    selected_coin_2?: SelectedCoinKey | string | null;
    is_winner_coin_holder?: boolean;
    special_coins?: SpecialCoin[];
    achievement_coins?: AchievementCoin[];
};

type LeaderboardUser = {
    rank: number;
    id: number;
    username: string;
    balance: number;
    todayNet?: number;
    profile_image_base64?: string | null;
    secondary_profile_image_base64?: string | null;
    card_hand?: CardHandKey | string | null;
    selected_coin_1?: SelectedCoinKey | string | null;
    selected_coin_2?: SelectedCoinKey | string | null;
    is_winner_coin_holder?: boolean;
    special_coins?: SpecialCoin[];
    achievement_coins?: AchievementCoin[];
};

type DailySummary = {
    date: string;
    totalIn: number;
    totalOut: number;
    net: number;
};

type CoinOption = {
    key: SelectedCoinKey;
    label: string;
    image: any;
};

type SpecialCoin = {
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

const CARD_HANDS: {
    key: CardHandKey;
    label: string;
    image: any;
}[] = [
        { key: "FULL_HOUSE", label: "Full House", image: fullHouseCoinImage },
        { key: "FOUR_OF_A_KIND", label: "Four of a Kind", image: fourOfAKindCoinImage },
        { key: "STRAIGHT_FLUSH", label: "Straight Flush", image: straightFlushCoinImage },
        { key: "ROYAL_FLUSH", label: "Royal Flush", image: royalFlushCoinImage },
    ];

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const cachedProfile = getProfileCache();

    const [users, setUsers] = useState<UserRow[]>(cachedProfile?.users || []);
    const [profile, setProfile] = useState<UserRow | null>(cachedProfile?.profile || null);
    const [balance, setBalance] = useState(Number(cachedProfile?.balance || 0));
    const [todayNet, setTodayNet] = useState(Number(cachedProfile?.todayNet || 0));
    const [dailySummary, setDailySummary] = useState<DailySummary[]>(cachedProfile?.dailySummary || []);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(cachedProfile?.leaderboard || []);
    const [refreshing, setRefreshing] = useState(false);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [adminToolsExpanded, setAdminToolsExpanded] = useState(false);

    const [activeCoinSlot, setActiveCoinSlot] = useState<1 | 2>(1);
    const [savingSelection, setSavingSelection] = useState(false);
    const [previewCoin, setPreviewCoin] = useState<{ label: string; image: any } | null>(null);

    const [cardManagerVisible, setCardManagerVisible] = useState(false);
    const [selectedAdminUserId, setSelectedAdminUserId] = useState<number | null>(null);
    const [selectedAdminHand, setSelectedAdminHand] = useState<CardHandKey>("FULL_HOUSE");
    const [savingCardHand, setSavingCardHand] = useState(false);

    const [achievementManagerVisible, setAchievementManagerVisible] = useState(false);
    const [selectedAchievementUserId, setSelectedAchievementUserId] = useState<number | null>(null);
    const [selectedAchievementCode, setSelectedAchievementCode] = useState<AchievementCoinCode>("AA_WIN");
    const [savingAchievementCoinCode, setSavingAchievementCoinCode] = useState<AchievementCoinCode | null>(null);

    const [deleteManagerVisible, setDeleteManagerVisible] = useState(false);
    const [selectedDeleteUserId, setSelectedDeleteUserId] = useState<number | null>(null);
    const [adminPasswordForDelete, setAdminPasswordForDelete] = useState("");
    const [deletingUser, setDeletingUser] = useState(false);

    const [userToolsMode, setUserToolsMode] = useState<"image" | "password" | null>(null);
    const [selectedToolsUserId, setSelectedToolsUserId] = useState<number | null>(null);
    const [secondaryImageBase64, setSecondaryImageBase64] = useState<string | null>(null);
    const [savingSecondaryImage, setSavingSecondaryImage] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);

    const [feedback, setFeedback] = useState<{
        visible: boolean;
        title: string;
        message?: string;
    }>({
        visible: false,
        title: "",
        message: "",
    });

    async function loadData() {
        const [usersRes, balanceRes, leaderboardRes, summaryRes] = await Promise.all([
            api.get("/users"),
            api.get("/balances/me"),
            api.get("/balances/leaderboard"),
            api.get("/transactions/daily-summary/me"),
        ]);

        const loadedUsers: UserRow[] = usersRes.data || [];
        const me = loadedUsers.find((item) => item.id === user?.id) || null;

        const nextBalance = Number(balanceRes.data?.balance || 0);
        const nextTodayNet = Number(balanceRes.data?.todayNet || 0);
        const nextLeaderboard = leaderboardRes.data || [];
        const nextDailySummary = (summaryRes.data || []).slice(0, 4);

        setUsers(loadedUsers);
        setProfile(me);
        setBalance(nextBalance);
        setTodayNet(nextTodayNet);
        setLeaderboard(nextLeaderboard);
        setDailySummary(nextDailySummary);
        setProfileCache({
            users: loadedUsers,
            profile: me,
            balance: nextBalance,
            todayNet: nextTodayNet,
            leaderboard: nextLeaderboard,
            dailySummary: nextDailySummary,
        });
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

    async function onLogoutConfirm() {
        try {
            await logout();
            router.replace("/login");
        } catch {
            setLogoutModalVisible(false);
        }
    }

    const myRank = useMemo(
        () => leaderboard.find((entry) => entry.id === user?.id)?.rank ?? null,
        [leaderboard, user?.id],
    );

    const isAdmin = user?.role === "ADMIN";

    const availableCoins = useMemo<CoinOption[]>(() => {
        const coins: CoinOption[] = [
            {
                key: "APP",
                label: "App Coin",
                image: appCoinImage,
            },
        ];

        if (myRank && myRank >= 1 && myRank <= 5) {
            coins.push({
                key: "PLACE",
                label: formatRankPlace(myRank),
                image: getPlaceCoinSource(myRank),
            });
        }

        (profile?.special_coins || []).forEach((coin) => {
            const imageUri = getSpecialCoinImageUri(coin);

            coins.push({
                key: `SPECIAL_${coin.id}` as SelectedCoinKey,
                label: coin.title || "Treasure Coin",
                image: imageUri ? { uri: imageUri } : appCoinImage,
            });
        });

        (profile?.achievement_coins || []).forEach((coin) => {
            const image = getAchievementCoinImage(coin.code);
            if (!image) return;

            coins.push({
                key: `ACHIEVEMENT_${coin.code}` as SelectedCoinKey,
                label: coin.title || getAchievementCoinTitle(coin.code),
                image,
            });
        });

        return coins;
    }, [profile?.special_coins, profile?.achievement_coins, myRank]);

    const coinRows = useMemo(() => {
        const rows: CoinOption[][] = [];

        for (let index = 0; index < availableCoins.length; index += 3) {
            rows.push(availableCoins.slice(index, index + 3));
        }

        return rows;
    }, [availableCoins]);

    const selectedCoin1 = normalizeSelectedCoin(profile?.selected_coin_1);
    const selectedCoin2 = normalizeSelectedCoin(profile?.selected_coin_2);

    const selectedCoin1Data = selectedCoin1
        ? availableCoins.find((item) => item.key === selectedCoin1) || null
        : null;

    const selectedCoin2Data = selectedCoin2
        ? availableCoins.find((item) => item.key === selectedCoin2) || null
        : null;

    const stats = [
        { label: "Balance", value: formatAmount(balance), valueColor: theme.colors.text },
        { label: "Rank", value: myRank ? `#${myRank}` : "-", valueColor: theme.colors.text },
        ...(todayNet !== 0
            ? [
                {
                    label: "Today",
                    value: `${todayNet > 0 ? "+" : "-"}${formatAmount(Math.abs(todayNet))}`,
                    valueColor: todayNet > 0 ? theme.colors.success : theme.colors.danger,
                },
            ]
            : []),
    ];

    async function saveSelectedCoins(
        nextFirst: SelectedCoinKey | null,
        nextSecond: SelectedCoinKey | null,
    ) {
        if (!profile) return;

        setProfile({
            ...profile,
            selected_coin_1: nextFirst,
            selected_coin_2: nextSecond,
        });

        try {
            setSavingSelection(true);
            await api.patch("/users/me/selected-coins", {
                selectedCoin1: nextFirst,
                selectedCoin2: nextSecond,
            });
            await loadData();
        } catch (error: any) {
            await loadData();
            setFeedback({
                visible: true,
                title: "Could not update coins",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setSavingSelection(false);
        }
    }

    async function chooseCoinForActiveSlot(coinKey: SelectedCoinKey) {
        let nextFirst = selectedCoin1;
        let nextSecond = selectedCoin2;

        if (activeCoinSlot === 1) {
            nextFirst = nextFirst === coinKey ? null : coinKey;

            if (nextSecond === coinKey) {
                nextSecond = null;
            }
        } else {
            nextSecond = nextSecond === coinKey ? null : coinKey;

            if (nextFirst === coinKey) {
                nextFirst = null;
            }
        }

        await saveSelectedCoins(nextFirst, nextSecond);
    }

    async function clearCoinSlot(slot: 1 | 2) {
        const nextFirst = slot === 1 ? null : selectedCoin1;
        const nextSecond = slot === 2 ? null : selectedCoin2;

        await saveSelectedCoins(nextFirst, nextSecond);
    }

    function openCardManager() {
        const firstUser = users[0] || null;
        setSelectedAdminUserId(firstUser?.id || null);
        setSelectedAdminHand(normalizeAdminCardHand(firstUser?.card_hand));
        setCardManagerVisible(true);
    }

    function onSelectAdminUser(selectedUser: UserRow) {
        setSelectedAdminUserId(selectedUser.id);
        setSelectedAdminHand(normalizeAdminCardHand(selectedUser.card_hand));
    }

    async function saveCardHand() {
        if (!selectedAdminUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        try {
            setSavingCardHand(true);
            await api.patch(`/users/${selectedAdminUserId}/card-hand`, {
                cardHand: selectedAdminHand,
            });
            await loadData();
            setCardManagerVisible(false);
            setFeedback({
                visible: true,
                title: "Card coin updated",
                message: "The user card achievement was updated successfully.",
            });
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: "Could not update card coin",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setSavingCardHand(false);
        }
    }

    function openAchievementManager() {
        const firstUser = users[0] || null;
        setSelectedAchievementUserId(firstUser?.id || null);
        setSelectedAchievementCode(ADMIN_ACHIEVEMENT_COIN_CATALOG[0]?.code || "AA_WIN");
        setSavingAchievementCoinCode(null);
        setAchievementManagerVisible(true);
    }

    function userOwnsAchievementCoin(userId: number | null, coinCode: AchievementCoinCode) {
        const selectedUser = users.find((entry) => entry.id === userId) || null;
        return (selectedUser?.achievement_coins || []).some(
            (coin) => normalizeAchievementCoinCode(coin.code) === coinCode,
        );
    }

    async function toggleAchievementCoin(coinCode: AchievementCoinCode) {
        if (!selectedAchievementUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        const targetUserId = selectedAchievementUserId;
        const alreadyOwned = userOwnsAchievementCoin(targetUserId, coinCode);

        try {
            setSelectedAchievementCode(coinCode);
            setSavingAchievementCoinCode(coinCode);

            if (alreadyOwned) {
                await api.delete(`/achievement-coins/users/${targetUserId}/${coinCode}`);
            } else {
                await api.post(`/achievement-coins/users/${targetUserId}/grant`, {
                    coinCode,
                });
            }

            await loadData();
            setSelectedAchievementUserId(targetUserId);
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: alreadyOwned ? "Could not remove coin" : "Could not award coin",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setSavingAchievementCoinCode(null);
        }
    }


    function openDeleteManager() {
        const firstUser = users.find((item) => item.role !== "ADMIN" && item.id !== user?.id) || null;
        setSelectedDeleteUserId(firstUser?.id || null);
        setAdminPasswordForDelete("");
        setDeleteManagerVisible(true);
    }

    async function deleteSelectedUser() {
        if (!selectedDeleteUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        if (!adminPasswordForDelete) {
            setFeedback({
                visible: true,
                title: "Password required",
                message: "Enter your admin password to confirm deletion.",
            });
            return;
        }

        try {
            setDeletingUser(true);
            await api.post(`/users/${selectedDeleteUserId}/delete`, {
                adminPassword: adminPasswordForDelete,
            });
            setDeleteManagerVisible(false);
            setAdminPasswordForDelete("");
            await loadData();
            setFeedback({
                visible: true,
                title: "User deleted",
                message: "The user was hidden from the app, active sessions were closed, and coin ownership links were cleared.",
            });
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: "Could not delete user",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setDeletingUser(false);
        }
    }

    function prepareUserTools() {
        const firstUser = users.find((item) => item.role !== "ADMIN") || users[0] || null;
        setSelectedToolsUserId(firstUser?.id || null);
        setSecondaryImageBase64(firstUser?.secondary_profile_image_base64 || null);
    }

    function openUserImageTools() {
        prepareUserTools();
        setUserToolsMode("image");
    }

    function openPasswordTools() {
        prepareUserTools();
        setUserToolsMode("password");
    }

    function onSelectToolsUser(selectedUser: UserRow) {
        setSelectedToolsUserId(selectedUser.id);
        setSecondaryImageBase64(selectedUser.secondary_profile_image_base64 || null);
    }

    async function pickSecondaryImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setFeedback({
                visible: true,
                title: "Permission required",
                message: "Allow photo access to choose a secondary image.",
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.72,
            base64: true,
        });

        if (!result.canceled && result.assets?.[0]?.base64) {
            setSecondaryImageBase64(result.assets[0].base64);
        }
    }

    async function saveSecondaryImage() {
        if (!selectedToolsUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        try {
            setSavingSecondaryImage(true);
            await api.patch(`/users/${selectedToolsUserId}/secondary-image`, {
                secondaryProfileImageBase64: secondaryImageBase64,
            });
            await loadData();
            setUserToolsMode(null);
            setFeedback({
                visible: true,
                title: "Secondary image saved",
                message: "Tap a user profile image to switch between regular and secondary image.",
            });
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: "Could not save image",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setSavingSecondaryImage(false);
        }
    }

    async function resetSelectedUserPassword() {
        if (!selectedToolsUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        try {
            setResettingPassword(true);
            await api.post(`/users/${selectedToolsUserId}/reset-password`);
            setFeedback({
                visible: true,
                title: "Password reset",
                message: "The user's password is now 123456.",
            });
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: "Could not reset password",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setResettingPassword(false);
        }
    }

    async function resetManagedUserPassword() {
        if (!selectedDeleteUserId) {
            setFeedback({
                visible: true,
                title: "No user selected",
                message: "Choose a user first.",
            });
            return;
        }

        try {
            setResettingPassword(true);
            await api.post(`/users/${selectedDeleteUserId}/reset-password`);
            setFeedback({
                visible: true,
                title: "Password reset",
                message: "The user's password is now 123456.",
            });
        } catch (error: any) {
            setFeedback({
                visible: true,
                title: "Could not reset password",
                message: error?.response?.data?.message || "Please try again.",
            });
        } finally {
            setResettingPassword(false);
        }
    }



    return (
        <>
            <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
                <ThemedCard glow="gold" style={styles.heroCard}>
                    <View style={styles.heroTop}>
                        <AvatarWithCoins
                            player={{
                                id: profile?.id || user?.id || 0,
                                username: profile?.username || user?.username || "",
                                rank: myRank || undefined,
                                profile_image_base64: profile?.profile_image_base64 || null,
                                secondary_profile_image_base64: profile?.secondary_profile_image_base64 || null,
                                card_hand: profile?.card_hand,
                                selected_coin_1: profile?.selected_coin_1,
                                selected_coin_2: profile?.selected_coin_2,
                                is_winner_coin_holder: profile?.is_winner_coin_holder,
                                special_coins: profile?.special_coins || [],
                                achievement_coins: profile?.achievement_coins || [],
                            }}
                            size={92}
                            coinSize={38}
                            winnerSize={46}
                        />

                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.name}>{profile?.username || user?.username}</Text>
                        </View>

                        <SpinningCoin source={appCoinImage} size={56} style={styles.coin} />
                    </View>

                    <View style={styles.statsRow}>
                        {stats.map((item) => (
                            <StatBox
                                key={item.label}
                                label={item.label}
                                value={item.value}
                                valueColor={item.valueColor}
                            />
                        ))}
                    </View>

                    <View style={styles.coinsSection}>
                        <View style={styles.coinsHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.coinsTitle}>My Coins</Text>
                            </View>
                        </View>

                        <View style={styles.compactSlotsRow}>
                            <CompactCoinSlot
                                title="First"
                                subtitle="Right"
                                image={selectedCoin1Data?.image || null}
                                active={activeCoinSlot === 1}
                                accent="gold"
                                onPress={() => setActiveCoinSlot(1)}
                                onClear={() => clearCoinSlot(1)}
                                canClear={!!selectedCoin1Data}
                            />

                            <CompactCoinSlot
                                title="Second"
                                subtitle="Left"
                                image={selectedCoin2Data?.image || null}
                                active={activeCoinSlot === 2}
                                accent="silver"
                                onPress={() => setActiveCoinSlot(2)}
                                onClear={() => clearCoinSlot(2)}
                                canClear={!!selectedCoin2Data}
                            />
                        </View>

                        {profile?.is_winner_coin_holder ? (
                            <View style={styles.winnerInfoBox}>
                                <Image source={winnerCoinImage} style={styles.winnerInfoCoin} resizeMode="contain" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.winnerInfoTitle}>Last Session Winner</Text>
                                    <Text style={styles.winnerInfoText}>
                                        You currently hold the winner coin from the latest finished session.
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.coinsGrid}>
                            {coinRows.map((row, rowIndex) => (
                                <View key={`coin-row-${rowIndex}`} style={styles.coinsGridRow}>
                                    {row.map((coin) => {
                                        const selectionIndex =
                                            selectedCoin1 === coin.key ? 1 : selectedCoin2 === coin.key ? 2 : null;

                                        return (
                                            <View key={coin.key} style={styles.achievementCoinCell}>
                                                <AchievementCoin
                                                    label={coin.label}
                                                    image={coin.image}
                                                    selectionIndex={selectionIndex}
                                                    onPress={() => chooseCoinForActiveSlot(coin.key)}
                                                    onLongPress={() => setPreviewCoin({ label: coin.label, image: coin.image })}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>


                    </View>
                </ThemedCard>

                <ThemedCard glow="none" style={styles.sectionCard}>
                    <View style={styles.profileButtonsStack}>
                        <ThemedButton title="Treasure Room" onPress={() => router.push("/treasure-room" as Href)} />
                        <ThemedButton title="Edit Profile" variant="dark" onPress={() => router.push("/edit-profile")} />
                    </View>
                </ThemedCard>

                {isAdmin ? (
                    <ThemedCard glow="none" style={styles.sectionCard}>
                        <Pressable
                            onPress={() => setAdminToolsExpanded((prev) => !prev)}
                            style={styles.adminToolsHeaderButton}
                        >
                            <View>
                                <Text style={styles.sectionTitleNoMargin}>Admin Tools</Text>
                                <Text style={styles.adminToolsHint}>
                                    {adminToolsExpanded ? "Tap to hide admin actions" : "Tap to open admin actions"}
                                </Text>
                            </View>
                            <Text style={styles.adminToolsChevron}>{adminToolsExpanded ? "▲" : "▼"}</Text>
                        </Pressable>

                        {adminToolsExpanded ? (
                            <View style={styles.adminToolsStack}>
                                <ThemedButton
                                    title="Manual Conversion"
                                    variant="dark"
                                    onPress={() => router.push("/admin-conversion")}
                                />

                                <ThemedButton
                                    title="Approvals"
                                    variant="dark"
                                    onPress={() => router.push("/admin-requests" as Href)}
                                />

                                <ThemedButton
                                    title="Manage Bonuses"
                                    variant="dark"
                                    onPress={() => router.push("/admin-bonuses" as Href)}
                                />

                                <ThemedButton
                                    title="Manage Player Coins"
                                    variant="dark"
                                    onPress={openAchievementManager}
                                />

                                <ThemedButton
                                    title="Secondary Images"
                                    variant="dark"
                                    onPress={openUserImageTools}
                                />

                                <ThemedButton
                                    title="Manage Users"
                                    variant="dark"
                                    onPress={openDeleteManager}
                                />
                            </View>
                        ) : null}
                    </ThemedCard>
                ) : null}

                {dailySummary.length > 0 ? (
                    <ThemedCard glow="none" style={styles.sectionCard}>
                        <View style={styles.summaryStack}>
                            {dailySummary.map((item) => (
                                <View key={item.date} style={styles.summaryRow}>
                                    <View>
                                        <Text style={styles.summaryDate}>{formatShortDate(item.date)}</Text>
                                        <Text style={styles.summarySub}>
                                            In {formatAmount(item.totalIn)} · Out {formatAmount(item.totalOut)}
                                        </Text>
                                    </View>

                                    <Text
                                        style={[
                                            styles.summaryNet,
                                            { color: item.net >= 0 ? theme.colors.success : theme.colors.danger },
                                        ]}
                                    >
                                        {item.net >= 0 ? "+" : "-"}
                                        {formatAmount(Math.abs(item.net))}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ThemedCard>
                ) : null}

                <View style={styles.logoutWrap}>
                    <ThemedButton
                        title="Log Out"
                        variant="ghost"
                        onPress={() => setLogoutModalVisible(true)}
                    />
                </View>
            </ScreenContainer>

            <AchievementManagerModal
                visible={achievementManagerVisible}
                users={users}
                selectedUserId={selectedAchievementUserId}
                selectedCode={selectedAchievementCode}
                savingCode={savingAchievementCoinCode}
                onClose={() => setAchievementManagerVisible(false)}
                onSelectUser={(selectedUser) => setSelectedAchievementUserId(selectedUser.id)}
                onToggleCoin={toggleAchievementCoin}
            />

            <UserToolsModal
                visible={!!userToolsMode}
                mode={userToolsMode || "image"}
                users={users}
                selectedUserId={selectedToolsUserId}
                secondaryImageBase64={secondaryImageBase64}
                savingSecondaryImage={savingSecondaryImage}
                resettingPassword={resettingPassword}
                onClose={() => setUserToolsMode(null)}
                onSelectUser={onSelectToolsUser}
                onPickImage={pickSecondaryImage}
                onClearImage={() => setSecondaryImageBase64(null)}
                onSaveImage={saveSecondaryImage}
                onResetPassword={resetSelectedUserPassword}
            />

            <DeleteUserModal
                visible={deleteManagerVisible}
                users={users.filter((item) => item.role !== "ADMIN" && item.id !== user?.id)}
                selectedUserId={selectedDeleteUserId}
                adminPassword={adminPasswordForDelete}
                deleting={deletingUser}
                resettingPassword={resettingPassword}
                onClose={() => setDeleteManagerVisible(false)}
                onSelectUser={(selectedUser) => setSelectedDeleteUserId(selectedUser.id)}
                onChangePassword={setAdminPasswordForDelete}
                onResetPassword={resetManagedUserPassword}
                onDelete={deleteSelectedUser}
            />

            <CoinPreviewModal
                visible={!!previewCoin}
                title={previewCoin?.label || "Coin"}
                image={previewCoin?.image || null}
                onClose={() => setPreviewCoin(null)}
            />

            <AppModal
                visible={logoutModalVisible}
                title="Log out?"
                onConfirm={onLogoutConfirm}
                onCancel={() => setLogoutModalVisible(false)}
                confirmLabel="Log Out"
            />

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

function CompactCoinSlot({
    title,
    subtitle,
    image,
    active,
    accent,
    onPress,
    onClear,
    canClear,
}: {
    title: string;
    subtitle: string;
    image: any | null;
    active: boolean;
    accent: "gold" | "silver";
    onPress: () => void;
    onClear: () => void;
    canClear?: boolean;
}) {
    const activeStyle =
        accent === "gold" ? styles.compactSlotGoldActive : styles.compactSlotSilverActive;

    return (
        <Pressable onPress={onPress} style={[styles.compactSlot, active ? activeStyle : null]}>
            <View>
                <Text style={styles.compactSlotTitle}>{title}</Text>
                <Text style={styles.compactSlotSubtitle}>{subtitle}</Text>
            </View>

            <View style={styles.compactSlotRight}>
                {image ? (
                    <Image source={image} style={styles.compactSlotCoin} />
                ) : (
                    <View style={styles.compactSlotEmpty}>
                        <Text style={styles.compactSlotEmptyText}>—</Text>
                    </View>
                )}

                {canClear ? (
                    <Pressable onPress={onClear} style={styles.compactSlotClear}>
                        <Text style={styles.compactSlotClearText}>×</Text>
                    </Pressable>
                ) : null}
            </View>
        </Pressable>
    );
}

function AchievementCoin({
    label,
    image,
    selectionIndex,
    onPress,
    onLongPress,
}: {
    label: string;
    image: any;
    selectionIndex: 1 | 2 | null;
    onPress: () => void;
    onLongPress?: () => void;
}) {
    const longPressHandled = useRef(false);

    return (
        <Pressable
            delayLongPress={360}
            onLongPress={() => {
                longPressHandled.current = true;
                onLongPress?.();
            }}
            onPress={() => {
                if (longPressHandled.current) return;
                onPress();
            }}
            onPressOut={() => {
                if (!longPressHandled.current) return;

                setTimeout(() => {
                    longPressHandled.current = false;
                }, 90);
            }}
            style={[
                styles.achievementCoinWrap,
                selectionIndex === 1 ? styles.achievementCoinSelectedGold : null,
                selectionIndex === 2 ? styles.achievementCoinSelectedSilver : null,
            ]}
        >
            <Image source={image} style={styles.achievementCoinImage} />

            <Text style={styles.achievementCoinLabel} numberOfLines={2}>
                {label}
            </Text>

            {selectionIndex ? (
                <View
                    style={[
                        styles.selectionBadge,
                        selectionIndex === 1 ? styles.selectionBadgeGold : styles.selectionBadgeSilver,
                    ]}
                >
                    <Text style={styles.selectionBadgeText}>{selectionIndex}</Text>
                </View>
            ) : null}

        </Pressable>
    );
}





function UserToolsModal({
    visible,
    mode,
    users,
    selectedUserId,
    secondaryImageBase64,
    savingSecondaryImage,
    resettingPassword,
    onClose,
    onSelectUser,
    onPickImage,
    onClearImage,
    onSaveImage,
    onResetPassword,
}: {
    visible: boolean;
    mode: "image" | "password";
    users: UserRow[];
    selectedUserId: number | null;
    secondaryImageBase64: string | null;
    savingSecondaryImage: boolean;
    resettingPassword: boolean;
    onClose: () => void;
    onSelectUser: (user: UserRow) => void;
    onPickImage: () => void;
    onClearImage: () => void;
    onSaveImage: () => void;
    onResetPassword: () => void;
}) {
    const [userPickerOpen, setUserPickerOpen] = useState(false);
    const selectedUser = users.find((entry) => entry.id === selectedUserId) || null;
    const previewUri = secondaryImageBase64
        ? `data:image/jpeg;base64,${secondaryImageBase64}`
        : null;
    const isImageMode = mode === "image";

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.adminModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={styles.adminModalCard}>
                    <View style={styles.adminModalHeader}>
                        <View>
                            <Text style={styles.adminModalEyebrow}>ADMIN TOOL</Text>
                            <Text style={styles.adminModalTitle}>
                                {isImageMode ? "Secondary Images" : "Reset Password"}
                            </Text>
                        </View>

                        <Pressable onPress={onClose} style={styles.adminCloseButton}>
                            <Text style={styles.adminCloseButtonText}>×</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.adminModalSectionTitle}>Choose user</Text>
                    <Pressable style={styles.dropdown} onPress={() => setUserPickerOpen((prev) => !prev)}>
                        <Text style={[styles.dropdownText, !selectedUser && styles.dropdownTextMuted]}>
                            {selectedUser ? selectedUser.username : "Choose a user"}
                        </Text>
                        <Text style={styles.dropdownArrow}>{userPickerOpen ? "▲" : "▼"}</Text>
                    </Pressable>

                    {userPickerOpen ? (
                        <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 210 }}>
                                {users.map((item) => {
                                    const active = item.id === selectedUserId;
                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => {
                                                onSelectUser(item);
                                                setUserPickerOpen(false);
                                            }}
                                            style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                                        >
                                            <Text
                                                style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}
                                                numberOfLines={1}
                                            >
                                                {item.username}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : null}

                    {isImageMode ? (
                        <View style={styles.adminActionCard}>
                            <Text style={styles.adminActionTitle}>Secondary profile image</Text>
                            <Text style={styles.adminActionText}>
                                This image appears after tapping the player's profile photo.
                            </Text>

                            <View style={styles.secondaryImagePreviewWrap}>
                                {previewUri ? (
                                    <Image source={{ uri: previewUri }} style={styles.secondaryImagePreview} />
                                ) : (
                                    <View style={styles.secondaryImageEmpty}>
                                        <Text style={styles.secondaryImageEmptyText}>No image</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.userToolButtonsRow}>
                                <Pressable onPress={onPickImage} style={styles.userToolButton}>
                                    <Text style={styles.userToolButtonText}>Choose Image</Text>
                                </Pressable>

                                <Pressable onPress={onClearImage} style={styles.userToolButtonGhost}>
                                    <Text style={styles.userToolButtonGhostText}>Clear</Text>
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={onSaveImage}
                                disabled={savingSecondaryImage}
                                style={[styles.saveHandButton, savingSecondaryImage ? styles.saveHandButtonDisabled : null]}
                            >
                                {savingSecondaryImage ? (
                                    <ActivityIndicator size="small" color="#1A1208" />
                                ) : (
                                    <Text style={styles.saveHandButtonText}>Save Secondary Image</Text>
                                )}
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.adminActionCard}>
                            <Text style={styles.adminActionTitle}>Forgot password?</Text>
                            <Text style={styles.adminActionText}>
                                Reset the selected user's password to 123456.
                            </Text>

                            <View style={styles.resetPasswordLuxuryBox}>
                                <Text style={styles.resetPasswordLuxuryCode}>123456</Text>
                                <Text style={styles.resetPasswordLuxurySub}>Temporary password</Text>
                            </View>

                            <Pressable
                                onPress={onResetPassword}
                                disabled={resettingPassword}
                                style={[styles.resetPasswordButton, resettingPassword ? styles.saveHandButtonDisabled : null]}
                            >
                                {resettingPassword ? (
                                    <ActivityIndicator size="small" color="#1A1208" />
                                ) : (
                                    <Text style={styles.resetPasswordButtonText}>Reset Password</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

function DeleteUserModal({
    visible,
    users,
    selectedUserId,
    adminPassword,
    deleting,
    resettingPassword,
    onClose,
    onSelectUser,
    onChangePassword,
    onResetPassword,
    onDelete,
}: {
    visible: boolean;
    users: UserRow[];
    selectedUserId: number | null;
    adminPassword: string;
    deleting: boolean;
    resettingPassword: boolean;
    onClose: () => void;
    onSelectUser: (user: UserRow) => void;
    onChangePassword: (value: string) => void;
    onResetPassword: () => void;
    onDelete: () => void;
}) {
    const [userPickerOpen, setUserPickerOpen] = useState(false);
    const selectedUser = users.find((entry) => entry.id === selectedUserId) || null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.adminModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={[styles.adminModalCard, styles.userManagerCard]}>
                    <View style={styles.adminModalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.adminModalEyebrow}>ADMIN TOOL</Text>
                            <Text style={styles.adminModalTitle}>Manage Users</Text>
                            <Text style={styles.adminModalDescription}>
                                Reset a player password or remove a player from the active app lists.
                            </Text>
                        </View>

                        <Pressable onPress={onClose} style={styles.adminCloseButton}>
                            <Text style={styles.adminCloseButtonText}>×</Text>
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.adminModalScroll}
                        contentContainerStyle={styles.adminModalScrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.adminModalSectionTitle}>Choose user</Text>
                        <Pressable style={styles.dropdown} onPress={() => setUserPickerOpen((prev) => !prev)}>
                            <Text style={[styles.dropdownText, !selectedUser && styles.dropdownTextMuted]}>
                                {selectedUser ? selectedUser.username : "Choose a user"}
                            </Text>
                            <Text style={styles.dropdownArrow}>{userPickerOpen ? "▲" : "▼"}</Text>
                        </Pressable>

                        {userPickerOpen ? (
                            <View style={styles.dropdownList}>
                                <ScrollView nestedScrollEnabled style={{ maxHeight: 190 }}>
                                    {users.map((item) => {
                                        const active = item.id === selectedUserId;
                                        return (
                                            <Pressable
                                                key={item.id}
                                                onPress={() => {
                                                    onSelectUser(item);
                                                    setUserPickerOpen(false);
                                                }}
                                                style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                                            >
                                                <Text
                                                    style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}
                                                    numberOfLines={1}
                                                >
                                                    {item.username}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        ) : null}

                        <View style={styles.userManagerSectionCard}>
                            <View style={styles.userManagerSectionHeader}>
                                <View style={styles.userManagerIconBubble}>
                                    <Text style={styles.userManagerIconText}>↻</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.adminActionTitle}>Reset password</Text>
                                    <Text style={styles.adminActionText}>
                                        Sets the selected player's password to 123456 and logs them out.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.resetPasswordLuxuryBoxCompact}>
                                <Text style={styles.resetPasswordLuxuryCodeCompact}>123456</Text>
                                <Text style={styles.resetPasswordLuxurySub}>Temporary password</Text>
                            </View>

                            <Pressable
                                onPress={onResetPassword}
                                disabled={resettingPassword}
                                style={[styles.resetPasswordButton, resettingPassword ? styles.saveHandButtonDisabled : null]}
                            >
                                {resettingPassword ? (
                                    <ActivityIndicator size="small" color="#1A1208" />
                                ) : (
                                    <Text style={styles.resetPasswordButtonText}>Reset Password</Text>
                                )}
                            </Pressable>
                        </View>

                        <View style={[styles.userManagerSectionCard, styles.deleteDangerZone]}>
                            <View style={styles.userManagerSectionHeader}>
                                <View style={[styles.userManagerIconBubble, styles.userManagerDangerIconBubble]}>
                                    <Text style={[styles.userManagerIconText, styles.userManagerDangerIconText]}>!</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.deleteDangerTitle}>Delete user</Text>
                                    <Text style={styles.deleteWarningText}>
                                        The user will disappear from lists and will be logged out. History stays saved.
                                    </Text>
                                </View>
                            </View>

                            <LuxuryInput
                                label="Admin Password"
                                placeholder="Enter your password"
                                value={adminPassword}
                                onChangeText={onChangePassword}
                                secureTextEntry
                            />

                            <Pressable
                                onPress={onDelete}
                                disabled={deleting}
                                style={[styles.deleteUserButton, deleting ? styles.saveHandButtonDisabled : null]}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color={theme.colors.danger} />
                                ) : (
                                    <Text style={styles.deleteUserButtonText}>Delete User</Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function AchievementManagerModal({
    visible,
    users,
    selectedUserId,
    selectedCode,
    savingCode,
    onClose,
    onSelectUser,
    onToggleCoin,
}: {
    visible: boolean;
    users: UserRow[];
    selectedUserId: number | null;
    selectedCode: AchievementCoinCode;
    savingCode: AchievementCoinCode | null;
    onClose: () => void;
    onSelectUser: (user: UserRow) => void;
    onToggleCoin: (code: AchievementCoinCode) => void;
}) {
    const [userPickerOpen, setUserPickerOpen] = useState(false);
    const selectedUser = users.find((entry) => entry.id === selectedUserId) || null;
    const ownedCodes = useMemo(() => {
        const codes = new Set<AchievementCoinCode>();
        (selectedUser?.achievement_coins || []).forEach((coin) => {
            const normalized = normalizeAchievementCoinCode(coin.code);
            if (normalized) codes.add(normalized);
        });
        return codes;
    }, [selectedUser]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.adminModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={styles.adminModalCard}>
                    <View style={styles.adminModalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.adminModalEyebrow}>ADMIN TOOL</Text>
                            <Text style={styles.adminModalTitle}>Manage Player Coins</Text>
                            <Text style={styles.adminModalDescription}>
                                Tap a coin to award it. Tap an owned coin again to remove it.
                            </Text>
                        </View>

                        <Pressable onPress={onClose} style={styles.adminCloseButton}>
                            <Text style={styles.adminCloseButtonText}>×</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.adminModalSectionTitle}>Choose player</Text>

                    <Pressable style={styles.dropdown} onPress={() => setUserPickerOpen((prev) => !prev)}>
                        <Text style={[styles.dropdownText, !selectedUser && styles.dropdownTextMuted]}>
                            {selectedUser ? selectedUser.username : "Choose a member"}
                        </Text>
                        <Text style={styles.dropdownArrow}>{userPickerOpen ? "▲" : "▼"}</Text>
                    </Pressable>

                    {userPickerOpen ? (
                        <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 210 }}>
                                {users.map((item) => {
                                    const active = item.id === selectedUserId;

                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => {
                                                onSelectUser(item);
                                                setUserPickerOpen(false);
                                            }}
                                            style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dropdownItemText,
                                                    active && styles.dropdownItemTextActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.username}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : null}

                    <Text style={styles.adminModalSectionTitle}>Player coins</Text>

                    <ScrollView style={styles.handsScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.handsGrid}>
                            {ADMIN_ACHIEVEMENT_COIN_CATALOG.map((coin) => {
                                const owned = ownedCodes.has(coin.code);
                                const loading = savingCode === coin.code;

                                return (
                                    <Pressable
                                        key={coin.code}
                                        onPress={() => onToggleCoin(coin.code)}
                                        disabled={!!savingCode}
                                        style={[
                                            styles.handOption,
                                            owned ? styles.handOptionSelected : null,
                                            selectedCode === coin.code && !owned ? styles.handOptionFocused : null,
                                            savingCode && savingCode !== coin.code ? styles.handOptionDisabled : null,
                                        ]}
                                    >
                                        <View style={styles.coinOwnedBadgeWrap}>
                                            {loading ? (
                                                <ActivityIndicator size="small" color={theme.colors.gold2} />
                                            ) : owned ? (
                                                <View style={styles.coinOwnedBadge}>
                                                    <Text style={styles.coinOwnedBadgeText}>✓</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.coinNotOwnedBadge}>
                                                    <Text style={styles.coinNotOwnedBadgeText}>+</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Image source={coin.image} style={styles.handCoin} resizeMode="contain" />
                                        <Text
                                            style={[styles.handLabel, owned ? styles.handLabelSelected : null]}
                                            numberOfLines={2}
                                        >
                                            {coin.title}
                                        </Text>
                                        <Text style={styles.coinToggleHint} numberOfLines={1}>
                                            {owned ? "Owned" : "Tap to add"}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function CardManagerModal({
    visible,
    users,
    selectedUserId,
    selectedHand,
    saving,
    onClose,
    onSelectUser,
    onSelectHand,
    onSave,
}: {
    visible: boolean;
    users: UserRow[];
    selectedUserId: number | null;
    selectedHand: CardHandKey;
    saving: boolean;
    onClose: () => void;
    onSelectUser: (user: UserRow) => void;
    onSelectHand: (hand: CardHandKey) => void;
    onSave: () => void;
}) {
    const [userPickerOpen, setUserPickerOpen] = useState(false);

    const selectedUser = users.find((entry) => entry.id === selectedUserId) || null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.adminModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={styles.adminModalCard}>
                    <View style={styles.adminModalHeader}>
                        <View>
                            <Text style={styles.adminModalEyebrow}>ADMIN TOOL</Text>
                            <Text style={styles.adminModalTitle}>Manage Card Coins</Text>
                        </View>

                        <Pressable onPress={onClose} style={styles.adminCloseButton}>
                            <Text style={styles.adminCloseButtonText}>×</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.adminModalSectionTitle}>Choose player</Text>

                    <Pressable style={styles.dropdown} onPress={() => setUserPickerOpen((prev) => !prev)}>
                        <Text style={[styles.dropdownText, !selectedUser && styles.dropdownTextMuted]}>
                            {selectedUser ? selectedUser.username : "Choose a member"}
                        </Text>
                        <Text style={styles.dropdownArrow}>{userPickerOpen ? "▲" : "▼"}</Text>
                    </Pressable>

                    {userPickerOpen ? (
                        <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 210 }}>
                                {users.map((item) => {
                                    const active = item.id === selectedUserId;

                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => {
                                                onSelectUser(item);
                                                setUserPickerOpen(false);
                                            }}
                                            style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dropdownItemText,
                                                    active && styles.dropdownItemTextActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.username}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : null}

                    <Text style={styles.adminModalSectionTitle}>Choose card hand</Text>

                    <ScrollView style={styles.handsScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.handsGrid}>
                            {CARD_HANDS.map((hand) => {
                                const selected = hand.key === selectedHand;

                                return (
                                    <Pressable
                                        key={hand.key}
                                        onPress={() => onSelectHand(hand.key)}
                                        style={[styles.handOption, selected ? styles.handOptionSelected : null]}
                                    >
                                        <Image source={hand.image} style={styles.handCoin} />
                                        <Text
                                            style={[styles.handLabel, selected ? styles.handLabelSelected : null]}
                                            numberOfLines={2}
                                        >
                                            {hand.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <Pressable
                        onPress={onSave}
                        disabled={saving}
                        style={[styles.saveHandButton, saving ? styles.saveHandButtonDisabled : null]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#1A1208" />
                        ) : (
                            <Text style={styles.saveHandButtonText}>Save Card Coin</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

function StatBox({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
                {value}
            </Text>
        </View>
    );
}

function getSpecialCoinImageUri(coin: SpecialCoin | null | undefined) {
    if (!coin?.image_base64) return null;
    return `data:${coin.image_mime || "image/png"};base64,${coin.image_base64}`;
}

function normalizeCardHand(value: any): CardHandKey {
    const normalized = String(value || "").toUpperCase() as CardHandKey;
    return CARD_HANDS.some((hand) => hand.key === normalized) ? normalized : "HIGH_CARD";
}

function normalizeSelectedCoin(value: any): SelectedCoinKey | null {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "APP" || normalized === "PLACE") {
        return normalized;
    }

    const specialMatch = normalized.match(/^SPECIAL_(\d+)$/);
    if (specialMatch) {
        return `SPECIAL_${Number(specialMatch[1])}` as SelectedCoinKey;
    }

    const achievementMatch = normalized.match(/^ACHIEVEMENT_([A-Z0-9_]+)$/);
    if (achievementMatch) {
        const coinCode = normalizeAchievementCoinCode(achievementMatch[1]);
        if (coinCode) return `ACHIEVEMENT_${coinCode}` as SelectedCoinKey;
    }

    return null;
}

function isCardHandCoinEligible(hand: CardHandKey | string | null | undefined) {
    const normalized = normalizeCardHand(hand);
    return ["FULL_HOUSE", "FOUR_OF_A_KIND", "STRAIGHT_FLUSH", "ROYAL_FLUSH"].includes(normalized);
}

function normalizeAdminCardHand(value: any): CardHandKey {
    const normalized = normalizeCardHand(value);
    return isCardHandCoinEligible(normalized) ? normalized : "FULL_HOUSE";
}

function getPlaceCoinSource(rank: number) {
    if (rank === 1) return place1CoinImage;
    if (rank === 2) return place2CoinImage;
    if (rank === 3) return place3CoinImage;
    if (rank === 4) return place4CoinImage;
    if (rank === 5) return place5CoinImage;
    return appCoinImage;
}

function formatRankPlace(rank: number) {
    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${rank}TH PLACE`;
    }

    const lastDigit = rank % 10;

    if (lastDigit === 1) return `${rank}ST PLACE`;
    if (lastDigit === 2) return `${rank}ND PLACE`;
    if (lastDigit === 3) return `${rank}RD PLACE`;

    return `${rank}TH PLACE`;
}

const styles = StyleSheet.create({
    heroCard: {
        marginBottom: 18,
    },
    heroTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatarShell: {
        width: 92,
        height: 92,
        borderRadius: 46,
        padding: 3,
        borderWidth: 1.4,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.12)",
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 42,
    },
    avatarFallback: {
        flex: 1,
        borderRadius: 42,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(214,179,106,0.12)",
    },
    avatarFallbackText: {
        color: theme.colors.gold2,
        fontSize: 28,
        fontWeight: "900",
    },
    profileWinnerCoin: {
        position: "absolute",
        left: -10,
        bottom: 2,
        width: 30,
        height: 30,
        borderRadius: 15,
        zIndex: 5,
    },
    profileCoinsWrap: {
        position: "absolute",
        right: -14,
        bottom: 1,
        width: 60,
        height: 38,
    },
    profileCoinLeft: {
        position: "absolute",
        right: 22,
        bottom: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        zIndex: 1,
    },
    profileCoinRight: {
        position: "absolute",
        right: 0,
        bottom: 6,
        width: 32,
        height: 32,
        borderRadius: 16,
        zIndex: 2,
    },
    name: {
        color: theme.colors.text,
        fontSize: 30,
        fontWeight: "900",
    },
    coin: {
        width: 56,
        height: 56,
    },
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 18,
    },
    statBox: {
        flex: 1,
        borderRadius: theme.radius.md,
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.07)",
        padding: 12,
        alignItems: "center",
    },
    statLabel: {
        color: theme.colors.gold2,
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    statValue: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: "900",
        marginTop: 6,
    },

    coinsSection: {
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    coinsHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
    },
    coinsTitle: {
        color: theme.colors.gold2,
        fontSize: 15,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    coinsSubtitle: {
        color: theme.colors.textSoft,
        marginTop: 3,
        fontSize: 12,
        lineHeight: 16,
    },
    clearAllButton: {
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    clearAllButtonText: {
        color: theme.colors.textSoft,
        fontWeight: "900",
        fontSize: 11,
    },
    compactSlotsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    compactSlot: {
        flex: 1,
        minHeight: 64,
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.035)",
        paddingHorizontal: 10,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    compactSlotGoldActive: {
        borderColor: theme.colors.gold2,
        backgroundColor: "rgba(214,179,106,0.09)",
    },
    compactSlotSilverActive: {
        borderColor: "#D9E1EA",
        backgroundColor: "rgba(217,225,234,0.07)",
    },
    compactSlotTitle: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: "900",
    },
    compactSlotSubtitle: {
        color: theme.colors.textSoft,
        fontSize: 11,
        marginTop: 2,
    },
    compactSlotRight: {
        position: "relative",
    },
    compactSlotCoin: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    compactSlotEmpty: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    compactSlotEmptyText: {
        color: theme.colors.textSoft,
        fontSize: 20,
        fontWeight: "800",
    },
    compactSlotClear: {
        position: "absolute",
        right: -7,
        top: -7,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#211A12",
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
    },
    compactSlotClearText: {
        color: theme.colors.text,
        fontSize: 13,
        lineHeight: 13,
        fontWeight: "900",
    },
    coinsGrid: {
        marginHorizontal: -4,
    },
    coinsGridRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "stretch",
    },
    achievementCoinCell: {
        width: "33.3333%",
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    achievementCoinWrap: {
        width: "100%",
        minHeight: 104,
        borderRadius: 18,
        borderWidth: 1.1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.035)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 9,
        paddingHorizontal: 5,
        position: "relative",
    },
    achievementCoinSelectedGold: {
        borderColor: theme.colors.gold2,
        backgroundColor: "rgba(214,179,106,0.08)",
    },
    achievementCoinSelectedSilver: {
        borderColor: "#D9E1EA",
        backgroundColor: "rgba(217,225,234,0.06)",
    },
    achievementCoinImage: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    achievementCoinLabel: {
        color: theme.colors.text,
        fontSize: 10,
        lineHeight: 13,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 6,
        minHeight: 26,
    },
    selectionBadge: {
        position: "absolute",
        top: 5,
        right: 5,
        width: 19,
        height: 19,
        borderRadius: 9.5,
        alignItems: "center",
        justifyContent: "center",
    },
    selectionBadgeGold: {
        backgroundColor: theme.colors.gold2,
    },
    selectionBadgeSilver: {
        backgroundColor: "#D9E1EA",
    },
    selectionBadgeText: {
        color: "#1A1208",
        fontSize: 11,
        fontWeight: "900",
    },
    winnerInfoBox: {
        width: "100%",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.06)",
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 12,
    },
    winnerInfoCoin: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    winnerInfoTitle: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "900",
    },
    winnerInfoText: {
        color: theme.colors.textSoft,
        fontSize: 11,
        lineHeight: 15,
        marginTop: 2,
    },
    treasureCollection: {
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    treasureCollectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    treasureCollectionTitle: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1.2,
    },
    treasureCollectionCount: {
        color: "#1A1208",
        backgroundColor: theme.colors.gold2,
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        textAlign: "center",
        lineHeight: 26,
        fontSize: 12,
        fontWeight: "900",
        overflow: "hidden",
    },
    treasureGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 10,
    },
    treasureMiniCoin: {
        width: "31.5%",
        minHeight: 116,
        borderRadius: 18,
        borderWidth: 1.1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.035)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 9,
        paddingHorizontal: 6,
    },
    treasureMiniCoinExclusive: {
        borderColor: "rgba(255,232,170,0.75)",
        backgroundColor: "rgba(214,179,106,0.09)",
    },
    treasureMiniImage: {
        width: 50,
        height: 50,
    },
    treasureMiniTitle: {
        color: theme.colors.text,
        fontSize: 10,
        lineHeight: 13,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 6,
        minHeight: 26,
    },
    treasureMiniBadge: {
        color: theme.colors.textSoft,
        fontSize: 8.5,
        fontWeight: "900",
        textAlign: "center",
        marginTop: 4,
        letterSpacing: 0.8,
    },
    treasureMiniBadgeExclusive: {
        color: theme.colors.gold2,
    },

    deleteWarningText: {
        color: theme.colors.textSoft,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
        marginTop: 5,
    },
    deleteDangerZone: {
        borderColor: "rgba(255,107,129,0.5)",
        backgroundColor: "rgba(255,107,129,0.055)",
    },
    deleteDangerTitle: {
        color: theme.colors.danger,
        fontSize: 17,
        fontWeight: "900",
    },
    deleteUserButton: {
        minHeight: 50,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,107,129,0.08)",
        borderWidth: 1.2,
        borderColor: "rgba(255,107,129,0.7)",
        marginTop: 14,
    },
    deleteUserButtonText: {
        color: theme.colors.danger,
        fontSize: 15,
        fontWeight: "900",
    },

    secondaryImagePreviewWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
        marginBottom: 12,
    },
    secondaryImagePreview: {
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 1.4,
        borderColor: theme.colors.borderStrong,
    },
    secondaryImageEmpty: {
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 1.4,
        borderStyle: "dashed",
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryImageEmptyText: {
        color: theme.colors.textSoft,
        fontSize: 12,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    userToolButtonsRow: {
        flexDirection: "row",
        gap: 10,
    },
    userToolButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(214,179,106,0.14)",
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
    },
    userToolButtonText: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "900",
    },
    userToolButtonGhost: {
        minWidth: 96,
        minHeight: 46,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    userToolButtonGhostText: {
        color: theme.colors.textSoft,
        fontSize: 13,
        fontWeight: "900",
    },
    resetPasswordBox: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 14,
    },
    resetPasswordTitle: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: "900",
    },
    resetPasswordText: {
        color: theme.colors.textSoft,
        fontSize: 12,
        fontWeight: "700",
        marginTop: 4,
    },
    resetPasswordButton: {
        minHeight: 50,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.gold2,
        marginTop: 14,
        shadowColor: theme.colors.gold2,
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    resetPasswordButtonText: {
        color: "#1A1208",
        fontSize: 14,
        fontWeight: "900",
    },
    adminActionCard: {
        marginTop: 14,
        borderRadius: 22,
        borderWidth: 1.1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.055)",
        padding: 14,
    },
    adminActionTitle: {
        color: theme.colors.text,
        fontSize: 17,
        fontWeight: "900",
    },
    adminActionText: {
        color: theme.colors.textSoft,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
        marginTop: 5,
    },
    resetPasswordLuxuryBox: {
        minHeight: 88,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(0,0,0,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14,
    },
    resetPasswordLuxuryCode: {
        color: theme.colors.gold2,
        fontSize: 31,
        lineHeight: 37,
        fontWeight: "900",
        letterSpacing: 3,
    },
    resetPasswordLuxurySub: {
        color: theme.colors.textSoft,
        fontSize: 11,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1.4,
        marginTop: 4,
    },
    userManagerCard: {
        maxHeight: "92%",
    },
    adminModalScroll: {
        maxHeight: "100%",
    },
    adminModalScrollContent: {
        paddingBottom: 8,
    },
    adminModalDescription: {
        color: theme.colors.textSoft,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
        marginTop: 7,
    },
    userManagerSectionCard: {
        marginTop: 14,
        borderRadius: 22,
        borderWidth: 1.1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.055)",
        padding: 14,
    },
    userManagerSectionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    userManagerIconBubble: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.13)",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    userManagerIconText: {
        color: theme.colors.gold2,
        fontSize: 17,
        fontWeight: "900",
    },
    userManagerDangerIconBubble: {
        borderColor: "rgba(255,107,129,0.55)",
        backgroundColor: "rgba(255,107,129,0.1)",
    },
    userManagerDangerIconText: {
        color: theme.colors.danger,
    },
    resetPasswordLuxuryBoxCompact: {
        minHeight: 74,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(0,0,0,0.22)",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 13,
    },
    resetPasswordLuxuryCodeCompact: {
        color: theme.colors.gold2,
        fontSize: 25,
        lineHeight: 31,
        fontWeight: "900",
        letterSpacing: 2.4,
    },

    sectionCard: {
        marginBottom: 14,
    },
    profileButtonsStack: {
        gap: 10,
    },
    sectionTitle: {
        color: theme.colors.gold2,
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
    },
    sectionTitleNoMargin: {
        color: theme.colors.gold2,
        fontSize: 15,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1.2,
    },
    adminToolsHeaderButton: {
        minHeight: 56,
        borderRadius: 20,
        borderWidth: 1.1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.07)",
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
    },
    adminToolsHint: {
        color: theme.colors.textSoft,
        fontSize: 11,
        fontWeight: "700",
        marginTop: 3,
    },
    adminToolsChevron: {
        color: theme.colors.gold2,
        fontSize: 16,
        fontWeight: "900",
    },
    adminToolsStack: {
        gap: 10,
        marginTop: 12,
    },
    summaryStack: {
        gap: 12,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    summaryDate: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "800",
    },
    summarySub: {
        color: theme.colors.textSoft,
        marginTop: 4,
    },
    summaryNet: {
        fontSize: 18,
        fontWeight: "900",
    },
    logoutWrap: {
        marginTop: 2,
    },

    adminModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.78)",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    adminModalCard: {
        maxHeight: "88%",
        borderRadius: 30,
        borderWidth: 1.4,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "#11100E",
        padding: 18,
        shadowColor: theme.colors.shadowGold,
        shadowOpacity: 0.35,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 12,
    },
    adminModalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        marginBottom: 14,
    },
    adminModalEyebrow: {
        color: theme.colors.gold2,
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 1.6,
    },
    adminModalTitle: {
        color: theme.colors.text,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "900",
        marginTop: 4,
    },
    adminCloseButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    adminCloseButtonText: {
        color: theme.colors.text,
        fontSize: 28,
        lineHeight: 30,
        fontWeight: "700",
    },
    adminModalSectionTitle: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 12,
        marginBottom: 10,
    },
    dropdown: {
        minHeight: 52,
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dropdownText: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: "700",
        flex: 1,
        paddingRight: 8,
    },
    dropdownTextMuted: {
        color: theme.colors.textSoft,
    },
    dropdownArrow: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "900",
    },
    dropdownList: {
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "#161311",
        marginTop: 8,
        overflow: "hidden",
    },
    dropdownItem: {
        minHeight: 48,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
    },
    dropdownItemActive: {
        backgroundColor: "rgba(214,179,106,0.12)",
    },
    dropdownItemText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
        paddingRight: 8,
    },
    dropdownItemTextActive: {
        color: theme.colors.gold2,
    },
    handsScroll: {
        maxHeight: 360,
    },
    handsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 10,
        paddingBottom: 8,
    },
    handOption: {
        width: "48.2%",
        minHeight: 96,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.035)",
        padding: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    handOptionSelected: {
        borderColor: theme.colors.gold2,
        backgroundColor: "rgba(214,179,106,0.11)",
    },
    handOptionFocused: {
        borderColor: "rgba(214,179,106,0.55)",
    },
    handOptionDisabled: {
        opacity: 0.48,
    },
    coinOwnedBadgeWrap: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    coinOwnedBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.gold2,
    },
    coinOwnedBadgeText: {
        color: "#1A1208",
        fontSize: 14,
        fontWeight: "900",
    },
    coinNotOwnedBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(0,0,0,0.22)",
    },
    coinNotOwnedBadgeText: {
        color: theme.colors.textSoft,
        fontSize: 15,
        fontWeight: "900",
    },
    coinToggleHint: {
        color: theme.colors.textSoft,
        fontSize: 9.5,
        fontWeight: "900",
        textAlign: "center",
        marginTop: 3,
        textTransform: "uppercase",
        letterSpacing: 0.45,
    },
    handCoin: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    handLabel: {
        color: theme.colors.textSoft,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 7,
    },
    handLabelSelected: {
        color: theme.colors.gold2,
    },
    saveHandButton: {
        minHeight: 50,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.gold2,
        marginTop: 16,
    },
    saveHandButtonDisabled: {
        opacity: 0.7,
    },
    saveHandButtonText: {
        color: "#1A1208",
        fontSize: 15,
        fontWeight: "900",
    },
});