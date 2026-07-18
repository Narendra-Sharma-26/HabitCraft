import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllScheduledNotifications } from '../services/NotificationService'; // ⭐ Added import

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null); // 👈 State for user info

  // Check if a token and user data are already saved when the app opens
  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userString = await AsyncStorage.getItem('userData'); // Fetch user details

      if (token) {
        setUserToken(token);
      }
      if (userString) {
        setUserData(JSON.parse(userString)); // Convert back to a usable object
      }
    } catch (e) {
      console.log('Error checking token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  // Function to call when we successfully log in
  // 👇 Now it accepts both the token AND the user data object
  const login = async (token: string, user: any) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user)); // Save to phone memory
      
      setUserToken(token); 
      setUserData(user); // Instantly updates the app state!
    } catch (e) {
      console.log('Error saving login data:', e);
    }
  };

  // Function to call when we want to log out
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData'); // Wipe user details on logout
      
      // ⭐ Clear all local device alarms so they don't ring after logout
      await cancelAllScheduledNotifications(); 
      
      setUserToken(null);
      setUserData(null);
    } catch (e) {
      console.log('Error clearing logout data:', e);
    }
  };

  return (
    // 👇 Added userData to the provider so screens can access it
    <AuthContext.Provider value={{ userToken, userData, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};