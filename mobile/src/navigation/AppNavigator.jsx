import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Building2, Users, MapPin, User, UsersRound, Circle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SiteVisitScreen from '../screens/SiteVisitScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SitesScreen from '../screens/SitesScreen';
import TeamScreen from '../screens/TeamScreen';
import VisitsScreen from '../screens/VisitsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ROLE_BOTTOM_NAV = {
  'Regional Manager': [
    { path: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: 'Sites', icon: Building2, label: 'Projects' },
    { path: 'Team', icon: Users, label: 'My Team' },
    { path: 'Profile', icon: User, label: 'Profile' },
  ],
  'Branch Manager': [
    { path: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: 'Sites', icon: Building2, label: 'Projects' },
    { path: 'Team', icon: Users, label: 'My Team' },
    { path: 'Profile', icon: User, label: 'Profile' },
  ],
  'BDM': [
    { path: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: 'Sites', icon: Building2, label: 'Projects' },
    { path: 'Team', icon: Users, label: 'My Team' },
    { path: 'Customers', icon: UsersRound, label: 'Customers' },
    { path: 'Profile', icon: User, label: 'Profile' },
  ],
  'Director': [
    { path: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: 'Sites', icon: Building2, label: 'Projects' },
    { path: 'Team', icon: Users, label: 'My Team' },
    { path: 'Customers', icon: UsersRound, label: 'Customers' },
    { path: 'Profile', icon: User, label: 'Profile' },
  ],
  'Sales Manager': [
    { path: 'Dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: 'Sites', icon: Building2, label: 'Projects' },
    { path: 'Customers', icon: UsersRound, label: 'Customers' },
    { path: 'Visits', icon: MapPin, label: 'Visits' },
    { path: 'Profile', icon: User, label: 'Profile' },
  ],
};

function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 }}>
      <Building2 size={64} color={colors.slate300} />
      <Text style={{ marginTop: 16, fontSize: 18, color: colors.slate500 }}>Under Construction</Text>
    </View>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation, navItems }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, height: 72 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const item = navItems.find(i => i.path === route.name);
        if (!item) return null; // Don't render tabs not meant for bottom bar

        const isFocused = state.index === index;
        const IconComponent = item.icon;

        const onPress = () => {
          // Block navigation for unbuilt tabs (if any)
          if (false) {
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            activeOpacity={1}
            style={styles.tabItem}
          >
            <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
              <IconComponent 
                size={isFocused ? 22 : 20} 
                color={isFocused ? colors.primary : colors.slate500} 
                strokeWidth={isFocused ? 2.5 : 1.5} 
              />
            </View>
            <Text 
              style={[styles.tabLabel, isFocused && styles.tabLabelActive]} 
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const navItems = ROLE_BOTTOM_NAV[user?.role] || ROLE_BOTTOM_NAV['Sales Manager'];

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} navItems={navItems} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Sites" component={SitesScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Visits" component={VisitsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Register" component={SiteVisitScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initializing]);

  if (initializing) {
    return <View style={styles.splash} />;
  }

  return (
    <NavigationContainer documentTitle={{ formatter: () => 'Metrohomes - EMS' }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
        }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.white,
  },
  tabBarContainer: {
    width: '100%',
    flexDirection: 'row',
    height: 72,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    elevation: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: colors.blue50,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate500,
  },
  tabLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
