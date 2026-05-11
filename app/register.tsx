import { useMemo, useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
    Alert,
    Image,
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/context/AuthContext";
import ScreenContainer from "../src/components/ScreenContainer";
import ThemedCard from "../src/components/ThemedCard";
import LuxuryInput from "../src/components/LuxuryInput";
import ThemedButton from "../src/components/ThemedButton";
import { theme } from "../src/theme/theme";

const coinImage = require("../assets/images/doubleo-coin.png");
const caseImage = require("../assets/images/chips-case.png");

export default function RegisterScreen() {
    const { register } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const mismatchText = useMemo(() => {
        if (!confirmPassword) return "";
        if (password === confirmPassword) return "";
        return "Passwords do not match";
    }, [password, confirmPassword]);

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert("Permission needed", "Please allow gallery access.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
            aspect: [1, 1],
        });

        if (!result.canceled && result.assets[0]?.base64) {
            setProfileImageBase64(result.assets[0].base64);
        }
    }

    async function onRegister() {
        if (!profileImageBase64) {
            Alert.alert("Missing photo", "Please choose a profile image.");
            return;
        }

        if (password !== confirmPassword) {
            return;
        }

        try {
            setSubmitting(true);
            await register({
                username: username.trim(),
                password,
                profileImageBase64,
            });
            router.replace("/(tabs)");
        } catch (error: any) {
            Alert.alert(
                "Register failed",
                error?.response?.data?.message || "Something went wrong"
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <ScreenContainer scroll>
            <ImageBackground
                source={caseImage}
                resizeMode="contain"
                imageStyle={styles.caseImage}
                style={styles.bgArt}
            >
                <Image source={coinImage} style={styles.coin} />
                <Text style={styles.eyebrow}>Private Members Club</Text>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                    Join the table with 1,000 Double O on entry.
                </Text>

                <ThemedCard style={styles.formCard}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatarRing}>
                            {profileImageBase64 ? (
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${profileImageBase64}` }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>O²</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <ThemedButton title="Choose Profile Image" onPress={pickImage} variant="dark" />

                    <View style={{ height: 16 }} />

                    <LuxuryInput
                        label="Username"
                        placeholder="Pick a username"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />

                    <View style={{ height: 12 }} />
                    <SecureLuxuryField
                        label="Password"
                        placeholder="Create a password"
                        value={password}
                        onChangeText={setPassword}
                        visible={showPassword}
                        onToggleVisibility={() => setShowPassword((prev) => !prev)}
                    />

                    <View style={{ height: 12 }} />
                    <SecureLuxuryField
                        label="Confirm Password"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        visible={showConfirmPassword}
                        onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                    />

                    {mismatchText ? <Text style={styles.inlineError}>{mismatchText}</Text> : null}

                    <View style={styles.actions}>
                        <ThemedButton
                            title={submitting ? "Creating..." : "Join the Club"}
                            onPress={onRegister}
                            loading={submitting}
                            disabled={!!mismatchText}
                        />
                        <ThemedButton
                            title="Back to Login"
                            onPress={() => router.replace("/login")}
                            variant="dark"
                        />
                    </View>
                </ThemedCard>
            </ImageBackground>
        </ScreenContainer>
    );
}

function SecureLuxuryField({
    label,
    placeholder,
    value,
    onChangeText,
    visible,
    onToggleVisibility,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    visible: boolean;
    onToggleVisibility: () => void;
}) {
    return (
        <View>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.secureFieldWrap}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.muted}
                    style={styles.secureFieldInput}
                />
                <Pressable onPress={onToggleVisibility} hitSlop={10} style={styles.eyeButton}>
                    <Ionicons
                        name={visible ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.colors.gold2}
                    />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bgArt: {
        flex: 1,
    },
    caseImage: {
        position: "absolute",
        bottom: -70,
        width: "125%",
        opacity: 0.07,
    },
    coin: {
        width: 110,
        height: 110,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 12,
    },
    eyebrow: {
        color: theme.colors.gold2,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 2,
        textTransform: "uppercase",
        textAlign: "center",
        marginBottom: 6,
    },
    title: {
        color: theme.colors.gold2,
        fontSize: 40,
        fontWeight: "900",
        textAlign: "center",
    },
    subtitle: {
        color: theme.colors.textSoft,
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
        marginTop: 10,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    formCard: {
        marginTop: 10,
    },
    avatarWrap: {
        alignItems: "center",
        marginBottom: 16,
    },
    avatarRing: {
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 2,
        borderColor: theme.colors.gold,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: theme.colors.shadowGold,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    avatar: {
        width: 102,
        height: 102,
        borderRadius: 51,
    },
    avatarPlaceholder: {
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: theme.colors.card2,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarPlaceholderText: {
        color: theme.colors.gold2,
        fontSize: 28,
        fontWeight: "900",
    },
    fieldLabel: {
        color: theme.colors.gold2,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 8,
    },
    secureFieldWrap: {
        minHeight: 54,
        borderRadius: theme.radius.pill,
        borderWidth: 1.2,
        borderColor: theme.colors.borderStrong,
        backgroundColor: "rgba(214,179,106,0.06)",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 18,
        paddingRight: 12,
    },
    secureFieldInput: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "700",
        paddingVertical: 14,
    },
    eyeButton: {
        width: 34,
        alignItems: "center",
        justifyContent: "center",
    },
    inlineError: {
        color: theme.colors.danger,
        marginTop: 10,
        fontWeight: "700",
        textAlign: "center",
    },
    actions: {
        marginTop: 18,
        gap: 12,
    },
});
