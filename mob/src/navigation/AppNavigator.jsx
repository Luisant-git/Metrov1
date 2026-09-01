import React from 'react';
<<<<<<< HEAD
import { StatusBar, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Building2, Users, MapPin, User, UsersRound, Circle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SiteVisitScreen from '../screens/SiteVisitScreen';
import DashboardScreen from '../screens/DashboardScreen';
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

function CustomTabBar({ state, descriptors, navigation, navItems }) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        // Only render tabs that exist in the navItems array for this role
        const routeName = route.name;
        // Don't render hidden screens like Register in the bottom bar
        if (routeName === 'Register') return null;

        const isFocused = state.index === index;
        const item = navItems.find(i => i.path === routeName) || navItems.find(i => i.path === route.name) || { icon: Circle, label: routeName };
        const IconComponent = item.icon;

        const onPress = () => {
          // As requested previously, block navigation for non-Dashboard tabs
          if (item.path !== 'Dashboard') {
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
      {navItems.map((item) => (
        <Tab.Screen 
          key={item.path} 
          name={item.path} 
          component={item.path === 'Dashboard' ? DashboardScreen : PlaceholderScreen} 
        />
      ))}
      <Tab.Screen name="Register" component={SiteVisitScreen} />
    </Tab.Navigator>
  );
}
=======
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SiteVisitScreen from '../screens/SiteVisitScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return <View style={styles.splash} />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
        }}>
        {isAuthenticated ? (
<<<<<<< HEAD
          <Stack.Screen name="MainTabs" component={MainTabs} />
=======
          <Stack.Screen name="SiteVisit" component={SiteVisitScreen} />
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
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
<<<<<<< HEAD
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
=======
>>>>>>> 49ebe3b1971152cb44403a9aa630fcfbda9cd121
});
