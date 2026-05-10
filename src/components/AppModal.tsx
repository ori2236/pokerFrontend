import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ThemedCard from "./ThemedCard";
import ThemedButton from "./ThemedButton";
import { theme } from "../theme/theme";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  destructive?: boolean;
  dismissable?: boolean;
};

export default function AppModal({
  visible,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
  dismissable = true,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onCancel : undefined}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onCancel : undefined} />
        <View style={styles.centerWrap}>
          <ThemedCard glow="gold" style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <View style={styles.actions}>
              {onCancel ? (
                <ThemedButton title={cancelLabel} variant="dark" onPress={onCancel} style={styles.button} />
              ) : null}
              <ThemedButton
                title={confirmLabel}
                onPress={onConfirm}
                loading={loading}
                style={styles.button}
                variant={destructive ? "dark" : "gold"}
              />
            </View>
          </ThemedCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: 22,
  },
  centerWrap: {
    justifyContent: "center",
  },
  card: {
    maxWidth: 460,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: theme.colors.textSoft,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
  },
});
