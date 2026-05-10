import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

type Props = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    glow?: "gold" | "cyan" | "none";
};

export default function ThemedCard({ children, style, glow = "gold" }: Props) {
    return (
        <LinearGradient
            colors={theme.gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.card,
                glow === "gold" && styles.glowGold,
                glow === "cyan" && styles.glowCyan,
                style,
            ]}
        >
            <View style={styles.topLine} />
            <View style={styles.inner}>{children}</View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: theme.radius.lg,
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.18)",
    },
    topLine: {
        height: 1.5,
        backgroundColor: "rgba(243,228,190,0.65)",
    },
    inner: {
        padding: 18,
    },
    glowGold: {
        shadowColor: theme.colors.shadowGold,
        shadowOpacity: 0.34,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
    },
    glowCyan: {
        shadowColor: theme.colors.shadowCyan,
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
});