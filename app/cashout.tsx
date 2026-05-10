import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
const caseImage = require("../assets/images/chips-case.png");

type InputMode = "TOTAL_AMOUNT" | "CHIP_BREAKDOWN";
type ChipKey = "white" | "red" | "blue" | "green" | "black";
type ChipCounts = Record<ChipKey, number>;

const chipConfig: Array<{ key: ChipKey; label: string; value: number; image: any }> = [
  { key: "white", label: "White", value: 1, image: whiteChip },
  { key: "red", label: "Red", value: 5, image: redChip },
  { key: "blue", label: "Blue", value: 10, image: blueChip },
  { key: "green", label: "Green", value: 25, image: greenChip },
  { key: "black", label: "Black", value: 50, image: blackChip },
];

export default function CashoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromSession?: string }>();

  const [mode, setMode] = useState<InputMode>("CHIP_BREAKDOWN");
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [chips, setChips] = useState<ChipCounts>(emptyChips());
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: "" });

  const totalFromChips = useMemo(() => getChipTotal(chips), [chips]);

  async function loadData() {
    const response = await api.get("/sessions/active");
    setSessionOpen(!!response.data.activeSession);
  }

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
    }, []),
  );

  async function submitCashout() {
    try {
      if (!sessionOpen) {
        setFeedback({ visible: true, title: "No active session", message: "Cash out is allowed only during an active session." });
        return;
      }

      setSubmitting(true);

      if (mode === "TOTAL_AMOUNT") {
        if (Number(amount) < 0) {
          setFeedback({ visible: true, title: "Invalid amount", message: "Enter a valid amount." });
          return;
        }

        await api.post("/conversion-requests", {
          type: "TO_COINS",
          amount_mode: "TOTAL_AMOUNT",
          amount_total: Number(amount),
        });
      } else {
        await api.post("/conversion-requests", {
          type: "TO_COINS",
          amount_mode: "CHIP_BREAKDOWN",
          white_count: chips.white,
          red_count: chips.red,
          blue_count: chips.blue,
          green_count: chips.green,
          black_count: chips.black,
        });
      }

      router.replace("/(tabs)/session");
    } catch (error: any) {
      setFeedback({ visible: true, title: "Unable to send request", message: error?.response?.data?.message || "Failed to send cash out" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!sessionOpen) {
    return (
      <>
        <ScreenContainer>
          <ThemedCard glow="gold">
            <Text style={styles.noticeTitle}>No active session</Text>
            <View style={{ marginTop: 16 }}>
              <ThemedButton title="Back to Session" onPress={() => router.replace("/(tabs)/session")} />
            </View>
          </ThemedCard>
        </ScreenContainer>
        <AppModal
          visible={feedback.visible}
          title={feedback.title}
          message={feedback.message}
          onConfirm={() => setFeedback({ visible: false, title: "", message: "" })}
        />
      </>
    );
  }

  return (
    <>
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={styles.title}>Cash Out</Text>
          <Image source={caseImage} style={styles.caseImage} />
        </View>

        {params.fromSession === "1" ? (
          <ThemedCard glow="gold" style={{ marginBottom: 16 }}>
            <Text style={styles.noticeTitle}>Cash out request</Text>
          </ThemedCard>
        ) : null}

        <ThemedCard glow="gold">
          <View style={styles.segmentRow}>
            <Segment active={mode === "CHIP_BREAKDOWN"} label="Chips" onPress={() => setMode("CHIP_BREAKDOWN")} />
            <Segment active={mode === "TOTAL_AMOUNT"} label="Amount" onPress={() => setMode("TOTAL_AMOUNT")} />
          </View>

          {mode === "TOTAL_AMOUNT" ? (
            <View style={{ marginTop: 18, alignItems: "center" }}>
              <StepperNumberInput value={amount} onChange={setAmount} width={140} />
            </View>
          ) : (
            <View style={{ marginTop: 18, gap: 12 }}>
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
                <Text style={styles.totalValue}>{formatAmount(totalFromChips)} O²</Text>
              </View>
            </View>
          )}

          <View style={styles.actionStack}>
            <ThemedButton title={submitting ? "Sending..." : "Send Cash Out"} onPress={submitCashout} loading={submitting} />
            <ThemedButton title="Back" variant="dark" onPress={() => router.replace("/(tabs)/session")} />
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

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function emptyChips(): ChipCounts {
  return { white: 0, red: 0, blue: 0, green: 0, black: 0 };
}

function getChipTotal(chips: ChipCounts) {
  return chips.white * 1 + chips.red * 5 + chips.blue * 10 + chips.green * 25 + chips.black * 50;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 32,
    fontWeight: "900",
  },
  caseImage: {
    width: 86,
    height: 86,
    resizeMode: "contain",
  },
  noticeTitle: {
    color: theme.colors.gold2,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
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
    marginTop: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.08)",
    padding: 14,
  },
  totalLabel: {
    color: theme.colors.gold2,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  totalValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  actionStack: {
    marginTop: 18,
    gap: 12,
  },
});
