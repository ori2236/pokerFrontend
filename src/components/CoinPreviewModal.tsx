import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  image: ImageSourcePropType | null;
  onClose: () => void;
};

const previewFrameImage = require("../../assets/images/coinPreview.png");

const FRAME_WIDTH = 337;
const FRAME_HEIGHT = 596;
const FRAME_RATIO = FRAME_WIDTH / FRAME_HEIGHT;

const CIRCLE = {
  x: 79,
  y: 167,
  width: 180,
  height: 180,
};

const TITLE_BOX = {
  x: 41,
  y: 420,
  width: 255,
  height: 84,
};

const COIN_SCALE_IN_HOLE = 1;

const COIN_OFFSET_X = 0;
const COIN_OFFSET_Y = 8;

export default function CoinPreviewModal({
  visible,
  title,
  image,
  onClose,
}: Props) {
  const { width, height } = useWindowDimensions();

  const entrance = useRef(new Animated.Value(0)).current;
  const coinMotion = useRef(new Animated.Value(0)).current;
  const shineMotion = useRef(new Animated.Value(0)).current;

  const cardWidth = Math.min(width - 34, (height - 120) * FRAME_RATIO, 320);
  const cardHeight = cardWidth / FRAME_RATIO;

  const scaleX = cardWidth / FRAME_WIDTH;
  const scaleY = cardHeight / FRAME_HEIGHT;

  const circleLeft = CIRCLE.x * scaleX;
  const circleTop = CIRCLE.y * scaleY;
  const circleWidth = CIRCLE.width * scaleX;
  const circleHeight = CIRCLE.height * scaleY;

  const coinSize = Math.min(circleWidth, circleHeight) * COIN_SCALE_IN_HOLE;
  const coinOffsetX = COIN_OFFSET_X * scaleX;
  const coinOffsetY = COIN_OFFSET_Y * scaleY;

  const titleLeft = TITLE_BOX.x * scaleX;
  const titleTop = TITLE_BOX.y * scaleY;
  const titleWidth = TITLE_BOX.width * scaleX;
  const titleHeight = TITLE_BOX.height * scaleY;

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      coinMotion.setValue(0);
      shineMotion.setValue(0);
      return;
    }

    const entranceAnimation = Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    });

    const coinAnimation = Animated.timing(coinMotion, {
      toValue: 1,
      duration: 1050,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const shineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shineMotion, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1700),
        Animated.timing(shineMotion, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel([entranceAnimation, coinAnimation]).start();
    shineAnimation.start();

    return () => {
      shineAnimation.stop();
    };
  }, [visible, entrance, coinMotion, shineMotion]);

  if (!image) return null;

  const cardScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const cardTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const coinScale = coinMotion.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0.72, 1.08, 1],
  });

  const coinRotateY = coinMotion.interpolate({
    inputRange: [0, 1],
    outputRange: ["-38deg", "0deg"],
  });

  const shineTranslateX = shineMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-cardWidth * 0.95, cardWidth * 0.95],
  });

  const titleFontSize = Math.max(21, cardWidth * 0.09);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.cardWrapper,
            {
              width: cardWidth,
              height: cardHeight,
              opacity: entrance,
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
        >
          <View
            style={[
              styles.frameCanvas,
              {
                width: cardWidth,
                height: cardHeight,
              },
            ]}
          >
            <View
              style={[
                styles.coinWindow,
                {
                  left: circleLeft,
                  top: circleTop,
                  width: circleWidth,
                  height: circleHeight,
                  borderRadius: Math.min(circleWidth, circleHeight) / 2,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.coinAnimatedWrap,
                  {
                    width: coinSize,
                    height: coinSize,
                    borderRadius: coinSize / 2,
                    transform: [
                      { perspective: 900 },
                      { rotateY: coinRotateY },
                      { scale: coinScale },
                      { translateX: coinOffsetX },
                      { translateY: coinOffsetY },
                    ],
                  },
                ]}
              >
                <Image
                  source={image}
                  resizeMode="contain"
                  style={[
                    styles.coinImage,
                    {
                      width: coinSize,
                      height: coinSize,
                    },
                  ]}
                />
              </Animated.View>
            </View>

            <View pointerEvents="none" style={styles.frameImageWrapper}>
              <Image
                source={previewFrameImage}
                resizeMode="stretch"
                style={[
                  styles.frameImage,
                  {
                    width: cardWidth,
                    height: cardHeight,
                  },
                ]}
              />
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.titleBox,
                {
                  left: titleLeft,
                  top: titleTop,
                  width: titleWidth,
                  height: titleHeight,
                },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleFontSize,
                    lineHeight: titleFontSize * 1.1,
                  },
                ]}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.52}
              >
                {title}
              </Text>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.shine,
                {
                  height: cardHeight * 0.56,
                  transform: [
                    { translateX: shineTranslateX },
                    { rotate: "18deg" },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 20,
  },

  cardWrapper: {
    shadowColor: "#F5C96A",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
  },

  frameCanvas: {
    position: "relative",
    overflow: "visible",
  },

  coinWindow: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#000000",
    zIndex: 1,
  },

  coinAnimatedWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5C96A",
    shadowOpacity: 0.72,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },

  coinImage: {
    shadowColor: "#000",
    shadowOpacity: 0.72,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  frameImageWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 2,
  },

  frameImage: {
    width: "100%",
    height: "100%",
  },

  titleBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    zIndex: 3,
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "auto",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 3 },
    letterSpacing: 0.2,
  },

  shine: {
    position: "absolute",
    top: "16%",
    width: 40,
    backgroundColor: "rgba(255,255,255,0.10)",
    opacity: 0.38,
    zIndex: 4,
  },
});