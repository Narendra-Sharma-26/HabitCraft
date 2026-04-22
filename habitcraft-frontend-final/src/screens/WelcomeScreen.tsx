import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Colors } from '../theme/Colors';

export default function WelcomeScreen({ navigation }: any) {
  // 1️⃣ Use React Native's core animated values (No external libraries needed!)
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 2️⃣ Run the fade and scale animations together
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true, // Uses phone's GPU for 60FPS smoothness
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      // 3️⃣ Wait half a second after the animation, then jump to Auth
      setTimeout(() => {
        navigation.replace('Auth');
      }, 1000);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        
        {/* Make sure you have an icon.png in your assets folder! */}
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo} 
        />
        
        <Text style={styles.appName}>HabitCraft</Text>
        {/* <Text style={styles.tagline}>Crafting Discipline, One Habit at a Time.</Text> */} 
        
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 140, // Made it slightly larger so the text in the logo is readable
    height: 140,
    marginBottom: 20,
    borderRadius: 30, // Gives it nice smooth app-icon corners
    overflow: 'hidden', // Ensures the corners cut perfectly
    backgroundColor: '#FFFFFF', // Helps it blend if the image has transparent edges
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
});