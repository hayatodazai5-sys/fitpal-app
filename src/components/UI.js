import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const pressSpring = {
  damping: 16,
  stiffness: 260,
  mass: 0.8,
};

const ScalePressable = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  style,
  pressedScale = 0.97,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event) => {
    if (!disabled) scale.value = withSpring(pressedScale, pressSpring);
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    scale.value = withSpring(1, pressSpring);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

export const PrimaryButton = ({ title, onPress, loading, disabled, style, textStyle }) => (
  <ScalePressable
    style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
  >
    {loading ? (
      <ActivityIndicator color={COLORS.white} size="small" />
    ) : (
      <Text style={[styles.primaryBtnText, textStyle]}>{title}</Text>
    )}
  </ScalePressable>
);

export const SecondaryButton = ({ title, onPress, style }) => (
  <ScalePressable
    style={[styles.secondaryBtn, style]}
    onPress={onPress}
    accessibilityRole="button"
  >
    <Text style={styles.secondaryBtnText}>{title}</Text>
  </ScalePressable>
);

export const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  icon,
  style,
  inputStyle,
  autoCapitalize = 'none',
}) => (
  <View style={[styles.inputWrapper, style]}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={styles.inputContainer}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        style={[styles.input, icon && styles.inputWithIcon, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  </View>
);

export const Card = ({ children, style, animated = true }) => (
  <Animated.View
    entering={animated ? FadeInUp.duration(320) : undefined}
    style={[styles.card, style]}
  >
    {children}
  </Animated.View>
);

export const SectionHeader = ({ title, action, onAction, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const Badge = ({ label, color = COLORS.maroon, textColor = COLORS.white }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
  </View>
);

export const StatCard = ({ icon, value, label, style }) => (
  <View style={[styles.statCard, style]}>
    {typeof icon === 'string' ? <Text style={styles.statIcon}>{icon}</Text> : icon}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const Divider = ({ text, style }) => (
  <View style={[styles.dividerWrapper, style]}>
    <View style={styles.dividerLine} />
    {text && <Text style={styles.dividerText}>{text}</Text>}
    {text && <View style={styles.dividerLine} />}
  </View>
);

export const GoogleButton = ({ onPress, loading, disabled }) => (
  <ScalePressable
    style={[styles.googleBtn, (disabled || loading) && styles.googleBtnDisabled]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
  >
    {loading ? (
      <ActivityIndicator color={COLORS.maroon} size="small" />
    ) : (
      <>
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleText}>Continue with Google</Text>
      </>
    )}
  </ScalePressable>
);

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...SHADOW.md,
  },
  primaryBtnDisabled: {
    backgroundColor: COLORS.textMuted,
    ...SHADOW.sm,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: FONTS.semiBold,
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.maroon,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    color: COLORS.maroon,
    fontSize: 16,
    fontWeight: FONTS.semiBold,
  },

  inputWrapper: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  inputIcon: {
    paddingLeft: SPACING.md,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: 4,
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  sectionAction: {
    fontSize: 13,
    color: COLORS.maroon,
    fontWeight: FONTS.medium,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statCard: {
    backgroundColor: COLORS.maroonSurface,
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.maroon },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  dividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    gap: 10,
    ...SHADOW.sm,
  },
  googleBtnDisabled: {
    opacity: 0.65,
  },
  googleIcon: {
    fontSize: 17,
    fontWeight: FONTS.bold,
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
});
