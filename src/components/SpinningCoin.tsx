import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  source: ImageSourcePropType;
  size: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  spinCount?: number;
  disabled?: boolean;
  onPress?: () => void;
};

export default function SpinningCoin({
  source,
  size,
  style,
  imageStyle,
  resizeMode = "contain",
  spinCount = 4,
  disabled = false,
  onPress,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);

  function runSpin() {
    if (disabled || isSpinning) return;

    onPress?.();
    setIsSpinning(true);
    spin.setValue(0);

    Animated.timing(spin, {
      toValue: 1,
      duration: 1350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      spin.setValue(0);
      setIsSpinning(false);
    });
  }

  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${360 * Math.max(1, spinCount)}deg`],
  });

  const scale = spin.interpolate({
    inputRange: [0, 0.18, 0.5, 0.82, 1],
    outputRange: [1, 1.08, 0.96, 1.04, 1],
  });

  const edgeOpacity = spin.interpolate({
    inputRange: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.88, 1],
    outputRange: [0.18, 0.72, 0.2, 0.72, 0.18, 0.72, 0.2, 0.72, 0.18],
  });

  const edgeWidth = Math.max(4, size * 0.1);

  return (
    <Pressable
      onPress={runSpin}
      hitSlop={10}
      disabled={disabled}
      style={[styles.pressable, style, { width: size, height: size }]}
    >
      <Animated.View
        style={[
          styles.stage,
          {
            width: size,
            height: size,
            transform: [{ perspective: 900 }, { rotateY }, { scale }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.edge,
            {
              width: edgeWidth,
              height: size * 0.88,
              borderRadius: edgeWidth / 2,
              left: (size - edgeWidth) / 2,
              top: size * 0.06,
              opacity: edgeOpacity,
            },
          ]}
        />

        <View pointerEvents="none" style={[styles.imageWrap, { width: size, height: size }]}>
          <Image
            source={source}
            style={[styles.image, { width: size, height: size }, imageStyle]}
            resizeMode={resizeMode}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  edge: {
    position: "absolute",
    backgroundColor: "rgba(214,179,106,0.9)",
    shadowColor: "#F2D083",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  imageWrap: {
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    zIndex: 2,
  },
});
