import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useFocusEffect } from "expo-router";
import ScreenContainer from "../src/components/ScreenContainer";
import ThemedCard from "../src/components/ThemedCard";
import ThemedButton from "../src/components/ThemedButton";
import LuxuryInput from "../src/components/LuxuryInput";
import AppModal from "../src/components/AppModal";
import { useAuth } from "../src/context/AuthContext";
import { api } from "../src/lib/api";
import { BonusRow, fetchBonuses, getErrorMessage } from "../src/lib/bonusApi";
import { formatAmount, theme } from "../src/theme/theme";

const coinImage = require("../assets/images/doubleo-coin.png");

type FilterMode = "all" | "active" | "inactive";

export default function AdminBonusesScreen() {
  const { user } = useAuth();

  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [formVisible, setFormVisible] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusRow | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BonusRow | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    try {
      const list = await fetchBonuses(true);
      setBonuses(list);
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to load bonuses",
        message: getErrorMessage(error, "Failed to load bonuses."),
      });
      setBonuses([]);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => { });
    }, []),
  );

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  function resetForm() {
    setEditingBonus(null);
    setTitle("");
    setDescription("");
    setAmountText("");
    setImageBase64(null);
    setImagePreviewUri(null);
    setFormVisible(false);
  }

  function openCreate() {
    setEditingBonus(null);
    setTitle("");
    setDescription("");
    setAmountText("");
    setImageBase64(null);
    setImagePreviewUri(null);
    setFormVisible(true);
  }

  function openEdit(item: BonusRow) {
    setEditingBonus(item);
    setTitle(item.title);
    setDescription(item.description);
    setAmountText(String(item.amount));
    setImageBase64(item.imageBase64);
    setImagePreviewUri(item.imageUri);
    setFormVisible(true);
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFeedback({
        visible: true,
        title: "Permission needed",
        message: "Please allow gallery access.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImageBase64(result.assets[0].base64);
      setImagePreviewUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function saveBonus() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const amount = Number(amountText);

    if (!trimmedTitle) {
      setFeedback({
        visible: true,
        title: "Missing title",
        message: "Enter a title for the bonus.",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({
        visible: true,
        title: "Invalid amount",
        message: "Enter a valid reward amount.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        amount,
        imageBase64: imageBase64 || undefined,
      };

      if (editingBonus) {
        await api.patch(`/bonuses/${editingBonus.id}`, payload);
      } else {
        await api.post("/bonuses", payload);
      }

      await loadData();
      setFeedback({
        visible: true,
        title: editingBonus ? "Bonus updated" : "Bonus created",
        message: editingBonus ? "The bonus details were updated." : "A new bonus was added.",
      });
      resetForm();
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: editingBonus ? "Unable to update bonus" : "Unable to create bonus",
        message: getErrorMessage(error, "Failed to save bonus."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBonus() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await api.delete(`/bonuses/${deleteTarget.id}`);
      await loadData();
      setFeedback({
        visible: true,
        title: "Bonus deleted",
        message: `"${deleteTarget.title}" was removed.`,
      });
      setDeleteTarget(null);
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to delete bonus",
        message: getErrorMessage(error, "Failed to delete bonus."),
      });
    } finally {
      setDeleting(false);
    }
  }

  const visibleBonuses = useMemo(() => {
    if (filter === "active") return bonuses.filter((item) => item.isActive);
    if (filter === "inactive") return bonuses.filter((item) => !item.isActive);
    return bonuses;
  }, [bonuses, filter]);

  if (user?.role !== "ADMIN") {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <>
      <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Bonuses</Text>
          <Image source={coinImage} style={styles.coin} />
        </View>

        <ThemedCard glow="gold" style={styles.heroCard}>
          <Text style={styles.heroTitle}>Create, edit and remove bonuses</Text>
          <Text style={styles.heroText}>
            Bonus requests are approved from Profile → Admin Tools → Approvals.
          </Text>

          <View style={styles.heroActions}>
            <ThemedButton title="New Bonus" onPress={openCreate} />
          </View>
        </ThemedCard>

        <View style={styles.filterRow}>
          <Segment active={filter === "all"} label="All" onPress={() => setFilter("all")} />
          <Segment active={filter === "active"} label="Active" onPress={() => setFilter("active")} />
          <Segment active={filter === "inactive"} label="Inactive" onPress={() => setFilter("inactive")} />
        </View>

        <View style={styles.stack}>
          {visibleBonuses.map((item) => (
            <ThemedCard key={item.id} glow="none">
              {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.bonusImage} /> : null}

              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bonusTitle}>{item.title}</Text>
                  <Text style={styles.amount}>{formatAmount(item.amount)} O²</Text>
                </View>

                <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text
                    style={[
                      styles.badgeText,
                      item.isActive ? styles.badgeTextActive : styles.badgeTextInactive,
                    ]}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

              <View style={styles.buttonRow}>
                <ThemedButton
                  title="Edit"
                  variant="dark"
                  onPress={() => openEdit(item)}
                  style={styles.rowButton}
                />
                <ThemedButton
                  title="Delete"
                  variant="dark"
                  onPress={() => setDeleteTarget(item)}
                  style={styles.rowButton}
                />
              </View>
            </ThemedCard>
          ))}

          {visibleBonuses.length === 0 ? (
            <ThemedCard glow="none">
              <Text style={styles.empty}>No bonuses match this filter.</Text>
            </ThemedCard>
          ) : null}
        </View>
      </ScreenContainer>

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={resetForm}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={resetForm} />
          <View style={styles.modalWrap}>
            <ThemedCard glow="gold" style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingBonus ? "Edit Bonus" : "New Bonus"}
                </Text>

                {imagePreviewUri ? (
                  <Image source={{ uri: imagePreviewUri }} style={styles.previewImage} />
                ) : null}

                <View style={styles.modalStack}>
                  <LuxuryInput
                    label="Title"
                    placeholder="For example: Take a shot"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.inputText}
                  />

                  <LuxuryInput
                    label="Description"
                    placeholder="Explain the task"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    style={[styles.descriptionInput, styles.inputText]}
                  />

                  <LuxuryInput
                    label="Reward Amount"
                    placeholder="50"
                    value={amountText}
                    onChangeText={setAmountText}
                    keyboardType="numeric"
                    style={styles.inputText}
                  />

                  <View style={styles.imageButtons}>
                    <ThemedButton
                      title="Choose Image"
                      variant="dark"
                      onPress={pickImage}
                      style={styles.rowButton}
                    />
                    <ThemedButton
                      title="Remove Image"
                      variant="dark"
                      onPress={() => {
                        setImageBase64(null);
                        setImagePreviewUri(null);
                      }}
                      style={styles.rowButton}
                      disabled={!imagePreviewUri}
                    />
                  </View>

                  <View style={styles.imageButtons}>
                    <ThemedButton
                      title={submitting ? "Saving..." : editingBonus ? "Save Changes" : "Create Bonus"}
                      onPress={saveBonus}
                      loading={submitting}
                      style={styles.rowButton}
                    />
                    <ThemedButton
                      title="Cancel"
                      variant="dark"
                      onPress={resetForm}
                      style={styles.rowButton}
                      disabled={submitting}
                    />
                  </View>
                </View>
              </ScrollView>
            </ThemedCard>
          </View>
        </View>
      </Modal>

      <AppModal
        visible={!!deleteTarget}
        title="Delete bonus?"
        message={deleteTarget ? `Delete "${deleteTarget.title}"?` : ""}
        onConfirm={deleteBonus}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        loading={deleting}
        destructive
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
    <Pressable
      onPress={onPress}
      style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 30,
    fontWeight: "900",
  },
  coin: {
    width: 64,
    height: 64,
  },
  heroCard: {
    marginBottom: 14,
  },
  heroTitle: {
    color: theme.colors.gold2,
    fontSize: 22,
    fontWeight: "900",
  },
  heroText: {
    color: theme.colors.textSoft,
    marginTop: 8,
    lineHeight: 22,
  },
  heroActions: {
    marginTop: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
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
  stack: {
    gap: 12,
  },
  bonusImage: {
    width: "100%",
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: 14,
  },
  cardHead: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bonusTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  amount: {
    color: theme.colors.gold2,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 6,
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeActive: {
    backgroundColor: "rgba(88,211,155,0.15)",
  },
  badgeInactive: {
    backgroundColor: "rgba(255,107,129,0.15)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  badgeTextActive: {
    color: theme.colors.success,
  },
  badgeTextInactive: {
    color: theme.colors.danger,
  },
  description: {
    color: theme.colors.textSoft,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  rowButton: {
    flex: 1,
  },
  empty: {
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: 20,
  },
  modalWrap: {
    maxHeight: "88%",
  },
  modalCard: {
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  modalTitle: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  modalStack: {
    gap: 12,
    marginTop: 6,
  },
  inputText: {
    color: theme.colors.text,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: 10,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 10,
  },
});