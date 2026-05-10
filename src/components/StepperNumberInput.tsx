import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "../theme/theme";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  width?: number;
  placeholder?: string;
  controlSize?: number;
  controlTextSize?: number;
  borderlessControls?: boolean;
  gap?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  controlStyle?: StyleProp<ViewStyle>;
  controlTextStyle?: StyleProp<TextStyle>;
};

export default function StepperNumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
  width = 114,
  placeholder = "0",
  controlSize = 42,
  controlTextSize = 22,
  borderlessControls = false,
  gap = 8,
  containerStyle,
  inputStyle,
  controlStyle,
  controlTextStyle,
}: Props) {
  const [text, setText] = useState(String(value));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(String(value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function apply(next: number) {
    const safe = Math.max(min, next);
    onChange(safe);
    setText(String(safe));
  }

  function runChange(delta: number) {
    apply(Number(value || 0) + delta * step);
  }

  function startHold(delta: number) {
    stopHold();
    runChange(delta);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => runChange(delta), 90);
    }, 280);
  }

  function stopHold() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleChange(nextText: string) {
    const cleaned = nextText.replace(/[^0-9]/g, "");
    setText(cleaned);
    if (cleaned === "") {
      onChange(min);
      return;
    }
    onChange(Math.max(min, Number(cleaned)));
  }

  function handleBlur() {
    if (text === "") {
      setText(String(min));
      onChange(min);
    }
  }

  return (
    <View style={[styles.row, { gap }, containerStyle]}>
      <Pressable
        hitSlop={10}
        onPressIn={() => startHold(-1)}
        onPressOut={stopHold}
        onTouchCancel={stopHold}
        onPress={() => {}}
        style={({ pressed }) => [
          styles.control,
          borderlessControls && styles.controlBorderless,
          { width: controlSize, height: controlSize, borderRadius: controlSize / 2 },
          pressed && styles.pressed,
          controlStyle,
        ]}
      >
        <Text style={[styles.controlText, { fontSize: controlTextSize }, borderlessControls && styles.controlTextBorderless, controlTextStyle]}>
          −
        </Text>
      </Pressable>

      <TextInput
        value={text}
        onChangeText={handleChange}
        onFocus={() => {
          if (Number(text || 0) === 0) setText("");
        }}
        onBlur={handleBlur}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, { width }, inputStyle]}
      />

      <Pressable
        hitSlop={10}
        onPressIn={() => startHold(1)}
        onPressOut={stopHold}
        onTouchCancel={stopHold}
        onPress={() => {}}
        style={({ pressed }) => [
          styles.control,
          borderlessControls && styles.controlBorderless,
          { width: controlSize, height: controlSize, borderRadius: controlSize / 2 },
          pressed && styles.pressed,
          controlStyle,
        ]}
      >
        <Text style={[styles.controlText, { fontSize: controlTextSize }, borderlessControls && styles.controlTextBorderless, controlTextStyle]}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  control: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.08)",
  },
  controlBorderless: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  controlText: {
    color: theme.colors.gold2,
    fontWeight: "900",
    lineHeight: 24,
  },
  controlTextBorderless: {
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  input: {
    minHeight: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1.2,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(214,179,106,0.06)",
    color: theme.colors.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 12,
  },
});
