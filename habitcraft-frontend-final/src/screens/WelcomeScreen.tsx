import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient'; 
import { ThemeContext } from '../context/ThemeContext';

export default function WelcomeScreen({ navigation }: any) {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = getStyles(colors);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true, 
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      setTimeout(() => {
        navigation.replace('Auth');
      }, 1000);
    });
  }, []);

  return (
    <LinearGradient
      colors={isDark ? ['#0B0C10', '#161822'] : ['#F8FAFC', '#E2E8F0']} 
      start={{x: 0, y: 0}} 
      end={{x: 0, y: 1}}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.appName}>HabitCraft</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 140, 
    height: 140,
    marginBottom: 20,
    borderRadius: 30, 
    overflow: 'hidden', 
    backgroundColor: '#FFFFFF', 
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text, 
    letterSpacing: 1.2,
    marginTop: 20,
  },
});