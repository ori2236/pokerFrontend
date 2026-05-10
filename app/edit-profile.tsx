import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../src/components/ScreenContainer";
import ThemedCard from "../src/components/ThemedCard";
import ThemedButton from "../src/components/ThemedButton";
import LuxuryInput from "../src/components/LuxuryInput";
import AppModal from "../src/components/AppModal";
import { api } from "../src/lib/api";
import { useAuth } from "../src/context/AuthContext";
import { theme } from "../src/theme/theme";

type UserRow = {
  id: number;
  username: string;
  profile_image_base64: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [username, setUsername] = useState("");
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  async function loadProfile() {
    const usersRes = await api.get("/users");
    const me = usersRes.data.find((item: UserRow) => item.id === user?.id) || null;
    setProfile(me);
    setUsername(me?.username || "");
    setProfileImageBase64(null);
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile().catch(() => {});
    }, []),
  );

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
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setProfileImageBase64(result.assets[0].base64);
    }
  }

  async function saveProfile() {
    try {
      setSavingProfile(true);
      await api.patch("/users/me/profile", {
        username: username.trim(),
        profileImageBase64: profileImageBase64 || undefined,
      });

      await refreshMe();
      router.replace("/(tabs)/profile");
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to save",
        message: error?.response?.data?.message || "Failed to update profile",
      });
    } finally {
      setSavingProfile(false);
      setConfirmModalVisible(false);
    }
  }

  async function savePassword() {
    try {
      setSavingPassword(true);
      await api.post("/users/me/password", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      router.replace("/(tabs)/profile");
    } catch (error: any) {
      setFeedback({
        visible: true,
        title: "Unable to change password",
        message: error?.response?.data?.message || "Failed to change password",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  const profileUri = profileImageBase64
    ? `data:image/jpeg;base64,${profileImageBase64}`
    : profile?.profile_image_base64
      ? `data:image/jpeg;base64,${profile.profile_image_base64}`
      : null;

  const hasProfileChanges = useMemo(() => {
    return username.trim() !== (profile?.username || "") || !!profileImageBase64;
  }, [profile?.username, profileImageBase64, username]);

  return (
    <>
      <ScreenContainer>
        <ThemedCard glow="gold" style={styles.cardSpacing}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Edit Profile</Text>
          </View>

          <View style={styles.avatarWrap}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>O²</Text>
              </View>
            )}
          </View>

          <View style={{ marginTop: 18 }}>
            <LuxuryInput
              label="Username"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.buttonStack}>
            <ThemedButton title="Choose Photo" variant="dark" onPress={pickImage} />
            <ThemedButton
              title={savingProfile ? "Saving..." : "Save"}
              onPress={() => setConfirmModalVisible(true)}
              loading={savingProfile}
              disabled={!hasProfileChanges}
            />
          </View>
        </ThemedCard>

        <ThemedCard glow="none">
          <View style={styles.headerRow}>
            <Text style={styles.titleSmall}>Password</Text>
          </View>

          <LuxuryInput
            label="Current Password"
            placeholder="Current password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <View style={{ height: 12 }} />
          <LuxuryInput
            label="New Password"
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <View style={{ height: 12 }} />
          <LuxuryInput
            label="Confirm New Password"
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
          />

          <View style={styles.buttonStack}>
            <ThemedButton
              title={savingPassword ? "Saving..." : "Update Password"}
              onPress={savePassword}
              loading={savingPassword}
            />
            <ThemedButton title="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        </ThemedCard>
      </ScreenContainer>

      <AppModal
        visible={confirmModalVisible}
        title="Save changes?"
        onConfirm={saveProfile}
        onCancel={() => setConfirmModalVisible(false)}
        confirmLabel="Save"
        loading={savingProfile}
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

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: 18,
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    color: theme.colors.gold2,
    fontSize: 28,
    fontWeight: "900",
  },
  titleSmall: {
    color: theme.colors.gold2,
    fontSize: 20,
    fontWeight: "900",
  },
  avatarWrap: {
    alignSelf: "center",
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
    borderWidth: 1.4,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.12)",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(214,179,106,0.12)",
  },
  avatarFallbackText: {
    color: theme.colors.gold2,
    fontSize: 34,
    fontWeight: "900",
  },
  buttonStack: {
    gap: 12,
    marginTop: 16,
  },
});
