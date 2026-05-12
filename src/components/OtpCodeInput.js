import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants/theme';

const CODE_LENGTH = 6;

export const normalizeOtpCode = (value) =>
  String(value || '').replace(/\D/g, '').slice(0, CODE_LENGTH);

export default function OtpCodeInput({
  value,
  onChangeText,
  disabled,
  autoFocus,
  style,
}) {
  const inputRef = useRef(null);
  const normalizedValue = normalizeOtpCode(value);
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => normalizedValue[index] || '');
  const activeIndex = Math.min(normalizedValue.length, CODE_LENGTH - 1);

  const focusInput = () => {
    if (!disabled) inputRef.current?.focus();
  };

  return (
    <Pressable style={[styles.wrapper, style]} onPress={focusInput}>
      <TextInput
        ref={inputRef}
        value={normalizedValue}
        onChangeText={(nextValue) => onChangeText(normalizeOtpCode(nextValue))}
        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
      <View style={styles.boxRow} pointerEvents="none">
        {digits.map((digit, index) => (
          <View
            key={`otp-${index}`}
            style={[
              styles.codeBox,
              index === activeIndex && normalizedValue.length < CODE_LENGTH && styles.codeBoxActive,
              digit && styles.codeBoxFilled,
            ]}
          >
            <Text style={styles.codeText}>{digit}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  codeBoxActive: {
    borderColor: COLORS.maroon,
    backgroundColor: COLORS.maroonSurface,
  },
  codeBoxFilled: {
    borderColor: COLORS.maroon,
  },
  codeText: {
    color: COLORS.maroon,
    fontSize: 22,
    fontWeight: FONTS.extraBold,
    marginTop: Platform.OS === 'android' ? -2 : 0,
  },
});
