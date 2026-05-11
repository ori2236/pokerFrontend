import React from "react";
import {
    RefreshControl,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { theme } from "../theme/theme";

type Props = {
    children: React.ReactNode;
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function ScreenContainer({
    children,
    scroll = true,
    refreshing = false,
    onRefresh,
    contentContainerStyle,
}: Props) {
    const content = (
        <>
            <Text style={styles.cornerTop}>♠</Text>
            <Text style={styles.cornerBottom}>♦</Text>
            {children}
        </>
    );

    return (
        <LinearGradient
            colors={theme.gradients.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea}>
                {scroll ? (
                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        refreshControl={
                            onRefresh ? (
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={theme.colors.gold2}
                                />
                            ) : undefined
                        }
                    >
                        {content}
                    </ScrollView>
                ) : (
                    <View style={[styles.fixedContent, contentContainerStyle]}>{content}</View>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 20,
    },
    fixedContent: {
        flex: 1,
        padding: 20,
    },
    cornerTop: {
        position: "absolute",
        top: 8,
        right: 14,
        fontSize: 70,
        color: "rgba(214,179,106,0.08)",
        zIndex: 0,
    },
    cornerBottom: {
        position: "absolute",
        bottom: 8,
        left: 10,
        fontSize: 92,
        color: "rgba(243,228,190,0.06)",
        zIndex: 0,
    },
});
