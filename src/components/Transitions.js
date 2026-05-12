import React from 'react';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

const revealMotion = {
  up: FadeInUp,
  down: FadeInDown,
  fade: FadeIn,
};

export const Reveal = ({ children, delay = 0, direction = 'up', style }) => {
  const Motion = revealMotion[direction] || FadeInUp;

  return (
    <Animated.View
      entering={Motion.duration(360).delay(delay)}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
