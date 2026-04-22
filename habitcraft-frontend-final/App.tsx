// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext'; // ⭐ Import the provider

export default function App() {
  return (
    <AuthProvider>
      {/* ⭐ Wrap Navigation with AlertProvider */}
      <AlertProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AlertProvider>
    </AuthProvider>
  );
}