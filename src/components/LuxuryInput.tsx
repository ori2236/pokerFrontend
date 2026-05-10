import React from "react";
import {
    KeyboardTypeOptions,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from "react-native";
import { theme } from "../theme/theme";

type Props = TextInputProps & {
    label?: string;
    keyboardType?: KeyboardTypeOptions;
};

export default function LuxuryInput({ label, ...props }: Props) {
    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 8,
    },
    label: {
        color: theme.colors.gold2,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    input: {
        minHeight: 56,
        borderRadius: theme.radius.pill,
        backgroundColor: "rgba(214,179,106,0.06)",
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        color: theme.colors.text,
        paddingHorizontal: 18,
        fontSize: 16,
    },
});