import { useState } from "react";
import { router } from "expo-router";
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import ScreenContainer from "../src/components/ScreenContainer";
import SpinningCoin from "../src/components/SpinningCoin";
import ThemedButton from "../src/components/ThemedButton";
import ThemedCard from "../src/components/ThemedCard";
import LuxuryInput from "../src/components/LuxuryInput";
import { theme } from "../src/theme/theme";

const coinImage = require("../assets/images/doubleo-coin.png");
const caseImage = require("../assets/images/chips-case.png");

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function onLogin() {
    try {
      setSubmitting(true);
      setErrorText("");
      await login(username.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setErrorText("Wrong username or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <ImageBackground
        source={caseImage}
        resizeMode="contain"
        imageStyle={styles.caseImage}
        style={styles.bgArt}
      >
        <View style={styles.center}>
          <SpinningCoin source={coinImage} size={140} style={styles.coin} />
          <Text style={styles.eyebrow}>Private Members Club</Text>
          <Text style={styles.title}>Double O</Text>
          <Text style={styles.subtitle}>A premium poker wallet for the inner circle.</Text>

          <ThemedCard style={styles.formCard}>
            <LuxuryInput
              label="Username"
              placeholder="Enter username"
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                if (errorText) setErrorText("");
              }}
              autoCapitalize="none"
            />
            <View style={{ height: 12 }} />
            <LuxuryInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorText) setErrorText("");
              }}
              secureTextEntry
            />

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.actions}>
              <ThemedButton
                title={submitting ? "Signing in..." : "Enter the Club"}
                onPress={onLogin}
                loading={submitting}
              />
              <ThemedButton
                title="Create Account"
                onPress={() => router.push("/register")}
                variant="dark"
              />
            </View>
          </ThemedCard>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bgArt: {
    flex: 1,
    justifyContent: "center",
  },
  caseImage: {
    position: "absolute",
    bottom: -10,
    width: "120%",
    opacity: 0.08,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  coin: {
    width: 140,
    height: 140,
    alignSelf: "center",
    marginBottom: 18,
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
    marginTop: 8,
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: {
    marginTop: 18,
    gap: 12,
  },
});
