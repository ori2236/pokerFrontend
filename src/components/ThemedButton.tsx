import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

type Props = {
    title: string;
    onPress: () => void;
    variant?: "gold" | "dark" | "ghost";
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
};

export default function ThemedButton({
    title,
    onPress,
    variant = "gold",
    disabled = false,
    loading = false,
    style,
}: Props) {
    const isDisabled = disabled || loading;

    const content = (
        <>
            {loading ? (
                <ActivityIndicator
                    color={variant === "gold" ? "#0B0F16" : theme.colors.text}
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        variant === "gold" ? styles.textDark : styles.textLight,
                        variant === "ghost" && styles.textGhost,
                    ]}
                >
                    {title}
                </Text>
            )}
        </>
    );

    if (variant === "ghost") {
        return (
            <Pressable
                onPress={onPress}
                disabled={isDisabled}
                style={({ pressed }) => [
                    styles.base,
                    styles.ghost,
                    pressed && styles.pressed,
                    isDisabled && styles.disabled,
                    style,
                ]}
            >
                {content}
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                pressed && styles.pressed,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            <LinearGradient
                colors={variant === "gold" ? theme.gradients.gold : theme.gradients.darkButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.base,
                    variant === "dark" && styles.darkBorder,
                ]}
            >
                {content}
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        minHeight: 54,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: "rgba(214,179,106,0.18)",
        shadowColor: theme.colors.shadowGold,
        shadowOpacity: 0.32,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    darkBorder: {
        borderColor: theme.colors.borderStrong,
    },
    ghost: {
        backgroundColor: "transparent",
        borderColor: theme.colors.borderStrong,
    },
    text: {
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    textDark: {
        color: "#0B0F16",
    },
    textLight: {
        color: theme.colors.text,
    },
    textGhost: {
        color: theme.colors.gold2,
    },
    pressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    disabled: {
        opacity: 0.55,
    },
});