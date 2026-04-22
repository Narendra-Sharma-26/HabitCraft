import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddHabitScreen from '../screens/AddHabitScreen';
import EditHabitScreen from '../screens/EditHabitScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 👇 Bottom Tab Menu
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2A2A3D',
          borderTopColor: '#3A3A4D',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#A0A0B0',
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarIconStyle: { display: 'none' }, tabBarLabelPosition: 'beside-icon' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarIconStyle: { display: 'none' }, tabBarLabelPosition: 'beside-icon' }} />
      <Tab.Screen name="Ranks" component={LeaderboardScreen} options={{ tabBarIconStyle: { display: 'none' }, tabBarLabelPosition: 'beside-icon' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIconStyle: { display: 'none' }, tabBarLabelPosition: 'beside-icon' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#1E1E2C' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken === null ? (
        // ❌ NOT LOGGED IN
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </>
      ) : (
        // ✅ LOGGED IN
        <>
          {/* 👇 MainTabs is now FIRST, so the app boots directly to the Dashboard! */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} /> 
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
          
          <Stack.Screen name="AddHabit" component={AddHabitScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditHabit" component={EditHabitScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}