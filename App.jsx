import { View, StyleSheet } from 'react-native'
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import React from 'react'
import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './src/hooks/ThemeContext'
import HomeContainer from './src/screens/Home';
import NavBar from './src/components/navbar/NavBar';
import store from './src/redux/store';
import { Provider } from 'react-redux';
import { createTables, getAccounts } from './src/utils/database';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Monthly from './src/screens/Monthly';
import Yearly from './src/screens/Yearly';
import Charts from './src/screens/Charts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Setting from './src/screens/Setting';
import Search from './src/screens/Search';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SetupGuide from './src/screens/SetupGuide';
import { createStackNavigator } from '@react-navigation/stack';
import About from './src/screens/About';
import Export from './src/screens/Export';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainStack = () => {
  const { theme } = useTheme();
  const [isMenuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      <NavBar setMenuOpen={setMenuOpen} isMenuOpen={isMenuOpen} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Monthly') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Yearly') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'Charts') {
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.focusedTabIconColor,
          tabBarInactiveTintColor: theme.textColor,
          tabBarStyle: {
            backgroundColor: theme.backgroundColor,
            borderTopColor: theme.borderColor,
            paddingBottom: 12,
            height: 60,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeContainer} />
        <Tab.Screen name="Monthly" component={Monthly} />
        <Tab.Screen name="Yearly" component={Yearly} />
        <Tab.Screen name="Charts" component={Charts} />
        <Tab.Screen name="Search" component={Search} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const App = () => {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [defaultAccount, setDefaultAccount] = useState('Cash'); // Default to Cash initially

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkFirstLaunch();
        if (!isFirstLaunch) {
          const accounts = await getAccounts();
          const defaultAcc = accounts.find(acc => acc.isDefault === 1);
          setDefaultAccount(defaultAcc?.name || 'Cash');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [isFirstLaunch]);

  const checkFirstLaunch = async () => {
    try {
      const setupComplete = await AsyncStorage.getItem('setupComplete');
      if (setupComplete !== 'true') {
        createTables();
      }
      setIsFirstLaunch(setupComplete !== 'true');
    } catch (error) {
      setIsFirstLaunch(true);
    }
  };

  if (isFirstLaunch === null) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <ThemeProvider>
            <NavigationContainer style={{ flex: 1 }}>
              <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isFirstLaunch ? 'Setup' : 'MainStack'}>
                <Stack.Screen
                  name="Setup"
                  component={SetupGuide}
                  initialParams={{ defaultAccount }}
                />
                <Stack.Screen
                  name="MainStack"
                  component={MainStack}
                  initialParams={{ defaultAccount }}
                />
                <Stack.Screen name="Setting" component={Setting} />
                <Stack.Screen name="About" component={About} />
                <Stack.Screen name="Export" component={Export} />
              </Stack.Navigator>
            </NavigationContainer>
          </ThemeProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;