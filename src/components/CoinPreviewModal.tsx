import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

type Props = {
  visible: boolean;
  title: string;
  image: ImageSourcePropType | null;
  onClose: () => void;
};

export default function CoinPreviewModal({ visible, title, image, onClose }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const coinMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      coinMotion.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(entrance, {
        toValue: 1,
        friction: 8,
        tension: 74,
        useNativeDriver: true,
      }),
      Animated.timing(coinMotion, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, entrance, coinMotion]);

  if (!image) return null;

  const cardScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const cardTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const coinRotateY = coinMotion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-38deg", "24deg", "0deg"],
  });

  const coinScale = coinMotion.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.76, 1.09, 1],
  });

  const crownOpacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.cardHost, { opacity: entrance, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }]}>
          <LinearGradient
            colors={["#050403", "#151008", "#241909", "#080604"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.outerBorder} pointerEvents="none" />
            <View style={styles.innerBorder} pointerEvents="none" />
            <View style={styles.headerPlate}>
              <Text style={styles.eyebrow}>DOUBLE O COLLECTION</Text>
            </View>

            <Animated.View style={[styles.crown, { opacity: crownOpacity }]} pointerEvents="none">
              <Text style={styles.crownText}>◆</Text>
              <Text style={styles.crownText}>◆</Text>
              <Text style={styles.crownText}>◆</Text>
            </Animated.View>

            <View style={styles.stageWrap}>
              <LinearGradient
                colors={["#5B3910", "#F7D986", "#7A4B12", "#FFF2BD", "#9C681B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.outerRing}
              >
                <LinearGradient
                  colors={["#0B0805", "#21170C", "#090705"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.darkRing}
                >
                  <LinearGradient
                    colors={["rgba(255,232,165,0.2)", "rgba(255,232,165,0.02)", "rgba(0,0,0,0.34)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.innerStage}
                  >
                    <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY: coinRotateY }, { scale: coinScale }] }}>
                      <Image source={image} style={styles.coinImage} resizeMode="contain" />
                    </Animated.View>
                  </LinearGradient>
                </LinearGradient>
              </LinearGradient>
            </View>

            <LinearGradient
              colors={["rgba(214,179,106,0.14)", "rgba(255,244,205,0.07)", "rgba(214,179,106,0.14)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.titlePlate}
            >
              <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}>
                {title}
              </Text>
            </LinearGradient>

          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  cardHost: {
    width: "100%",
    maxWidth: 382,
  },
  card: {
    borderRadius: 34,
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1.3,
    borderColor: "rgba(255,232,165,0.9)",
    shadowColor: "#F5C96A",
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  outerBorder: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,245,205,0.18)",
  },
  innerBorder: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(214,179,106,0.16)",
  },
  headerPlate: {
    borderWidth: 1,
    borderColor: "rgba(255,232,165,0.22)",
    backgroundColor: "rgba(255,232,165,0.055)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 13,
  },
  eyebrow: {
    color: theme.colors.gold2,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  crown: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 9,
  },
  crownText: {
    color: "rgba(255,232,165,0.7)",
    fontSize: 9,
  },
  stageWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    width: 242,
    height: 242,
    borderRadius: 121,
    alignItems: "center",
    justifyContent: "center",
  },
  darkRing: {
    width: 226,
    height: 226,
    borderRadius: 113,
    alignItems: "center",
    justifyContent: "center",
  },
  innerStage: {
    width: 203,
    height: 203,
    borderRadius: 102,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,245,205,0.18)",
  },
  coinImage: {
    width: 190,
    height: 190,
  },
  titlePlate: {
    marginTop: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,232,165,0.25)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 230,
  },
  title: {
    color: theme.colors.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
  },
});
