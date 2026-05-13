import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Supabase Import
import { supabase } from './supabase';

// Screen Imports
import HomeScreen from './src/HomeScreen'; 
import Calendar from './src/Calendar';
import Tasks from './src/Tasks';
import TrayTracker from './src/TrayTracker';
import Login from './src/Login'; // Make sure you created this file!

const Tab = createBottomTabNavigator();

const palette = {
  bg: '#F4F1EA',
  surface: '#FDFCF9',
  primary: '#2F4F3C',
  inactive: '#8A8479',
  border: '#E2DDD4',
};

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for an existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for Auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar style="dark" />
        
        {/* LOGIC GATE: Show Login if no session, otherwise show Tabs */}
        {!session ? (
          <Login />
        ) : (
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: palette.primary,
                tabBarInactiveTintColor: palette.inactive,
                tabBarLabelStyle: styles.tabLabel,
                tabBarStyle: styles.tabBar,
              }}
            >
              <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="stats-chart-outline" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Trays"
                component={TrayTracker}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="leaf-outline" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Calendar"
                component={Calendar}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="calendar-outline" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Tasks"
                component={Tasks}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="checkbox-outline" size={size} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: palette.bg 
  },
  tabBar: {
    backgroundColor: palette.surface,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
  },
  tabLabel: { 
    fontSize: 11, 
    fontWeight: '600', 
    letterSpacing: 0.2,
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
  },
});