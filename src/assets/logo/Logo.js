import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../config/theme';

const LOGO_IMAGE = require('./fitpal-logo.png');

const LOGO_SIZES = {
  sm: { width: 144, height: 96, taglineFontSize: 12, taglineMaxWidth: 180 },
  md: { width: 220, height: 147, taglineFontSize: 13, taglineMaxWidth: 240 },
  lg: { width: 300, height: 200, taglineFontSize: 15, taglineMaxWidth: 300 },
};

export const FitPALLogo = ({ size = 'md', showTagline = true }) => {
  const imageSize = LOGO_SIZES[size] || LOGO_SIZES.md;

  return (
    <View style={styles.container}>
      <Image
        source={LOGO_IMAGE}
        style={[styles.logoImage, imageSize]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="FitPAL logo"
      />
      {showTagline && (
        <Text
          style={[
            styles.tagline,
            {
              fontSize: imageSize.taglineFontSize,
              maxWidth: imageSize.taglineMaxWidth,
            },
          ]}
        >
          Stronger you, Healthier tomorrow
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    borderRadius: 20,
    maxWidth: '100%',
  },
  tagline: {
    color: COLORS.textSecondary,
    fontWeight: FONTS.regular,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
