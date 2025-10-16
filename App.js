import 'react-native-gesture-handler';
import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomeScreen from './screens/homeScreen';
import ExploreScreen from './screens/exploreScreen';
import ProfileScreen from './screens/profileScreen';
import BusinessScreen from './screens/BusinessScreen';
import EventsScreen from './screens/EventsScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e0e0ff',
        tabBarInactiveTintColor: '#8e8e95',
        tabBarStyle: {
          backgroundColor: '#121214',
          borderTopColor: '#1f1f22',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function BusinessTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Business') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e0e0ff',
        tabBarInactiveTintColor: '#8e8e95',
        tabBarStyle: {
          backgroundColor: '#121214',
          borderTopColor: '#1f1f22',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Business"
        component={BusinessScreen}
        options={{ title: 'My Venue' }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { currentUser, userProfile, profileLoadingStatus } = useAuth();

  const getNavigationComponent = () => {
    console.log('Navigation check - currentUser:', !!currentUser, 'userProfile:', userProfile?.userType);
    
    if (!currentUser) {
      console.log('No current user - showing AuthStack');
      return <AuthStack />;
    }
    
    if (!userProfile) {
      console.log('User exists but no profile - showing loading');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0b0c', padding: 20 }}>
          <Ionicons name="person-circle-outline" size={80} color="#e0e0ff" style={{ marginBottom: 20 }} />
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
            Setting up your profile...
          </Text>
          {profileLoadingStatus && (
            <Text style={{ color: '#8e8e95', fontSize: 14, textAlign: 'center', marginBottom: 10 }}>
              {profileLoadingStatus}
            </Text>
          )}
          <Text style={{ color: '#8e8e95', fontSize: 12, textAlign: 'center' }}>
            This may take a moment on slow connections
          </Text>
        </View>
      );
    }
    
    if (userProfile?.userType === 'business') {
      console.log('Showing BusinessTabs for business user');
      return <BusinessTabs />;
    } else {
      console.log('Showing CustomerTabs for customer user');
      return <CustomerTabs />;
    }
  };

  return (
    <NavigationContainer>
      {getNavigationComponent()}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
