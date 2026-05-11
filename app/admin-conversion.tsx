import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenContainer from "../src/components/ScreenContainer";
import ThemedCard from "../src/components/ThemedCard";
import ThemedButton from "../src/components/ThemedButton";
import AppModal from "../src/components/AppModal";
import StepperNumberInput from "../src/components/StepperNumberInput";
import { api } from "../src/lib/api";
import { formatAmount, theme } from "../src/theme/theme";

const whiteChip = require("../assets/chips/white.png");
const redChip = require("../assets/chips/red.png");
const blueChip = require("../assets/chips/blue.png");
const greenChip = require("../assets/chips/green.png");
const blackChip = require("../assets/chips/black.png");
const coinImage = require("../assets/images/doubleo-coin.png");

type ChipKey = "white" | "red" | "blue" | "green" | "black";
type ChipCounts = Record<ChipKey, number>;
type InputMode = "TOTAL_AMOUNT" | "CHIP_BREAKDOWN";
type ConversionType = "TO_CHIPS" | "TO_COINS";

type UserRow = {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
  balance: number;
};

const chipConfig: Array<{ key: ChipKey; label: string; value: number; image: any }> = [
  { key: "white", label: "White", value: 1, image: whiteChip },
  { key: "red", label: "Red", value: 5, image: redChip },
  { key: "blue", label: "Blue", value: 10, image: blueChip },
  { key: "green", label: "Green", value: 25, image: greenChip },
  { key: "black", label: "Black", value: 50, image: blackChip },
];

export default function AdminConversionScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [type, setType] = useState<ConversionType>("TO_CHIPS");
  const [mode, setMode] = useState<InputMode>("TOTAL_AMOUNT");
  const [amount, setAmount] = useState(0);
  const [chips, setChips] = useState<ChipCounts>(emptyChips());
  const [submitting, setSubmitting] = useState(false);
  const [userError, setUserError] = useState("");
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
  });

  async function loadData() {
    const [usersRes, leaderboardRes] = await Promise.all([
      api.get("/users"),
      api.get("/balances/leaderboard"),
    ]);

    const balanceMap = new Map(
      leaderboardRes.data.map((item: { id: number; balance: number }) => [item.id, Number(item.balance || 0)]),
    );

    const mergedUsers = usersRes.data.map((item: { id: number; username: string; role: "ADMIN" | "USER" }) => ({
      ...item,
      balance: balanceMap.get(item.id) || 0,
    }));

    setUsers(mergedUsers);

    if (!selectedUserId && mergedUsers.length > 0) {
      setSelectedUserId(mergedUsers[0].id);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
    }, []),
  );

  const selectedUser = useMemo(() => {
    return users.find((entry) => entry.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const totalFromChips = useMemo(() => {
    return (
      chips.white * 1 +
      chips.red * 5 +
      chips.blue * 10 +
      chips.green * 25 +
      chips.black * 50
    );
  }, [chips]);

  function resetForm() {
    setAmount(0);
    setChips(emptyChips());
  }

  function updateChip(key: ChipKey, value: number) {
    setChips((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    try {
      if (!selectedUserId) {
        setUserError("Choose a member");
        return;
      }

      setSubmitting(true);

      if (mode === "TOTAL_AMOUNT") {
        if (type === "TO_CHIPS" && Number(amount) <= 0) {
          setFeedback({ visible: true, title: "Invalid amount", message: "Withdraw must be greater than 0." });
          return;
        }

        if (Number(amount) < 0) {
          setFeedback({ visible: true, title: "Invalid amount", message: "Enter a valid amount." });
          return;
        }

        await api.post("/conversion-requests", {
          target_user_id: selectedUserId,
          type,
          amount_mode: "TOTAL_AMOUNT",
          amount_total: Number(amount),
        });
      } else {
        if (type === "TO_CHIPS" && totalFromChips <= 0) {
          setFeedback({ visible: true, title: "Invalid chips", message: "Enter at least one chip." });
          return;
        }

        await api.post("/conversion-requests", {
          target_user_id: selectedUserId,
          type,
          amount_mode: "CHIP_BREAKDOWN",
          white_count: chips.white,
          red_count: chips.red,
          blue_count: chips.blue,
          green_count: chips.green,
          black_count: chips.black,
        });
      }

      resetForm();
      await loadData();
      setFeedback({ visible: true, title: "Done", message: "Manual conversion completed." });
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to complete conversion",
        message: error?.response?.data?.message || "Failed to complete conversion",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={styles.title}>Manual Conversion</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>

        <ThemedCard glow="gold" style={styles.cardSpacing}>
          <Pressable style={styles.dropdown} onPress={() => setUserPickerOpen((prev) => !prev)}>
            <Text style={[styles.dropdownText, !selectedUser && styles.dropdownTextMuted]}>
              {selectedUser ? `${selectedUser.username} · ${formatAmount(selectedUser.balance)} O²` : "Choose a member"}
            </Text>
            <Text style={styles.dropdownArrow}>{userPickerOpen ? "▲" : "▼"}</Text>
          </Pressable>

          {userError ? <Text style={styles.inlineError}>{userError}</Text> : null}

          {userPickerOpen ? (
            <View style={styles.dropdownList}>
              {users.map((item) => {
                const active = item.id === selectedUserId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSelectedUserId(item.id);
                      setUserPickerOpen(false);
                      setUserError("");
                    }}
                    style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  >
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{`${item.username} · ${formatAmount(item.balance)} O²`}</Text>
                    <Text style={styles.dropdownRole}>{item.role}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.segmentRow}>
            <Segment active={type === "TO_COINS"} label="Deposit" onPress={() => setType("TO_COINS")} />
            <Segment active={type === "TO_CHIPS"} label="Withdraw" onPress={() => setType("TO_CHIPS")} />
          </View>

          <View style={styles.segmentRow}>
            <Segment active={mode === "TOTAL_AMOUNT"} label="Amount" onPress={() => setMode("TOTAL_AMOUNT")} />
            <Segment active={mode === "CHIP_BREAKDOWN"} label="Chips" onPress={() => setMode("CHIP_BREAKDOWN")} />
          </View>

          {mode === "TOTAL_AMOUNT" ? (
            <View style={styles.amountBlock}>
              <Text style={styles.inputLabel}>Double O</Text>
              <StepperNumberInput value={amount} onChange={setAmount} width={140} />
            </View>
          ) : (
            <View style={styles.chipsWrap}>
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
                    onChange={(next) => updateChip(chip.key, next)}
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
                <Text style={styles.totalValue}>{formatAmount(totalFromChips)} O²</Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <ThemedButton title={submitting ? "Saving..." : "Confirm"} onPress={submit} loading={submitting} />
            <ThemedButton title="Back" variant="dark" onPress={() => router.back()} disabled={submitting} />
          </View>
        </ThemedCard>
      </ScreenContainer>

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

function Segment({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function emptyChips(): ChipCounts {
  return { white: 0, red: 0, blue: 0, green: 0, black: 0 };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 30,
    fontWeight: "900",
  },
  coin: {
    width: 68,
    height: 68,
  },
  cardSpacing: {
    marginBottom: 18,
  },
  dropdown: {
    minHeight: 56,
    borderRadius: theme.radius.pill,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.06)",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  dropdownTextMuted: {
    color: theme.colors.muted,
    fontWeight: "600",
  },
  dropdownArrow: {
    color: theme.colors.gold2,
    fontWeight: "900",
  },
  inlineError: {
    color: theme.colors.danger,
    marginTop: 8,
    fontWeight: "700",
  },
  dropdownList: {
    marginTop: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(15,12,8,0.96)",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: {
    backgroundColor: "rgba(214,179,106,0.10)",
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  dropdownItemTextActive: {
    color: theme.colors.gold2,
  },
  dropdownRole: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    minHeight: 46,
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
    gap: 12,
  },
  inputLabel: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipsWrap: {
    marginTop: 18,
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
  actionRow: {
    gap: 12,
    marginTop: 18,
  },
});
