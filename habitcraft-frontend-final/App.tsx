// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext'; 
import { ThemeProvider } from './src/context/ThemeContext'; // ⭐ Import the ThemeProvider

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        {/* ⭐ Add ThemeProvider here to wrap the NavigationContainer */}
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </AlertProvider>
    </AuthProvider>
  );
}