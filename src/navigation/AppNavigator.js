import React from 'react';
import { ActivityIndicator, View, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../config/theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SetupFlowScreen from '../screens/setup/SetupFlowScreen';
import HomeScreen from '../screens/main/HomeScreen';
import WorkoutsScreen from '../screens/main/WorkoutsScreen';
import WorkoutDayScreen from '../screens/main/WorkoutDayScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const stackScreenOptions = {
  headerShown: false,
  animation: 'fade_from_bottom',
  animationDuration: 260,
  gestureEnabled: true,
  contentStyle: { backgroundColor: COLORS.cream },
};

const pushScreenOptions = {
  animation: 'slide_from_right',
  animationDuration: 260,
};

const LoadingScreen = () => (
  <View style={styles.centered}>
    <ActivityIndicator color={COLORS.maroon} size="large" />
  </View>
);

const screenIcon = {
  Home: ['home', 'home-outline'],
  Workouts: ['barbell', 'barbell-outline'],
  Progress: ['stats-chart', 'stats-chart-outline'],
  Settings: ['settings', 'settings-outline'],
};

const TabIcon = ({ routeName, color, size, focused }) => {
  const progress = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 15,
      stiffness: 220,
    });
  }, [focused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.78 + progress.value * 0.22,
    transform: [{ scale: 1 + progress.value * 0.1 }],
  }));

  const [active, inactive] = screenIcon[routeName] || screenIcon.Home;
  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={focused ? active : inactive} size={size} color={color} />
    </Animated.View>
  );
};

const TabButton = ({ accessibilityState, children, onPress, onLongPress, style, ...props }) => {
  const focused = !!accessibilityState?.selected;
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.02 : 1, {
      damping: 16,
      stiffness: 240,
    });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, {
      damping: 16,
      stiffness: 260,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(focused ? 1.02 : 1, {
      damping: 16,
      stiffness: 240,
    });
  };

  return (
    <AnimatedPressable
      {...props}
      accessibilityState={accessibilityState}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, styles.tabButton, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} options={pushScreenOptions} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={pushScreenOptions} />
    </Stack.Navigator>
  );
}

function SetupStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SetupFlow" component={SetupFlowScreen} options={pushScreenOptions} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarButton: (props) => <TabButton {...props} />,
        animation: 'fade',
        tabBarIcon: ({ color, size, focused }) => {
          return <TabIcon routeName={route.name} color={color} size={size} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="WorkoutDay" component={WorkoutDayScreen} options={pushScreenOptions} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading, isSetupComplete } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthStack />;
  if (!isSetupComplete) return <SetupStack />;
  return <MainStack />;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
    padding: 24,
  },
  tabBar: {
    backgroundColor: COLORS.tabBg,
    borderTopColor: COLORS.cardBorder,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: FONTS.medium,
  },
  tabButton: {
    flex: 1,
  },
});
