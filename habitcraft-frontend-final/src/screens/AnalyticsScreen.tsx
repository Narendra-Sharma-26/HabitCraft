import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { AlertContext } from '../context/AlertContext';
import { ThemeContext } from '../context/ThemeContext';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';

export default function AnalyticsScreen() {
  const [healthData, setHealthData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useContext(AlertContext);
  
  const { colors, isDark } = useContext(ThemeContext);
  const styles = getStyles(colors, isDark);

  let [fontsLoaded] = useFonts({
    Pacifico_400Regular,
  });

  const fetchAnalyticsData = async () => {
    try {
      const healthReq = api.get('/habits/health').catch(err => {
        console.log("Health Error:", err.message);
        return { data: { habits: [] } };
      });

      const heatmapReq = api.get('/analytics/heatmap').catch(err => {
        console.log("Heatmap Error:", err.message);
        return { data: { heatmap: [] } };
      });

      const [healthRes, heatmapRes] = await Promise.all([healthReq, heatmapReq]);

      setHealthData(healthRes?.data?.habits || []);
      setHeatmapData(heatmapRes?.data?.heatmap || []);
    } catch (error: any) {
      showAlert("Analytics Error", "Could not load analytics data.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAnalyticsData(); }, []));

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success; 
    if (score >= 50) return colors.accent; 
    return colors.error; 
  };

  const getHeatmapColor = (completed: number) => {
    if (completed === 0) return colors.background; 
    if (completed <= 1) return 'rgba(76, 175, 80, 0.4)'; 
    if (completed <= 3) return 'rgba(76, 175, 80, 0.7)'; 
    return 'rgba(76, 175, 80, 1)'; 
  };

  if (loading || !fontsLoaded) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Track your long-term consistency.</Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>30-Day Activity</Text>
        <Text style={styles.sectionSubtitle}>Your daily habit completion grid.</Text>
        
        <View style={styles.heatmapWrapper}>
          {heatmapData && heatmapData.length > 0 ? (
            heatmapData.map((day, index) => (
              <View 
                key={index} 
                style={[styles.heatmapSquare, { backgroundColor: getHeatmapColor(day?.completed || 0) }]} 
              />
            ))
          ) : (
            <Text style={styles.emptySubtext}>No activity data yet.</Text>
          )}
        </View>

        <View style={styles.legend}>
            <Text style={styles.legendText}>Less</Text>
            <View style={[styles.legendSquare, { backgroundColor: colors.background }]} />
            <View style={[styles.legendSquare, { backgroundColor: 'rgba(76, 175, 80, 0.4)' }]} />
            <View style={[styles.legendSquare, { backgroundColor: 'rgba(76, 175, 80, 0.7)' }]} />
            <View style={[styles.legendSquare, { backgroundColor: 'rgba(76, 175, 80, 1)' }]} />
            <Text style={styles.legendText}>More</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Habit Health</Text>
      
      {!healthData || healthData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No habits to analyze.</Text>
        </View>
      ) : (
        healthData.map((habit, index) => {
          if (!habit) return null; 
          const score = Math.round(habit.healthScore || 0);
          
          return (
            <View key={habit._id || index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.habitTitle}>{habit.icon || '🎯'} {habit.title || 'Unknown Habit'}</Text>
                <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>{score}%</Text>
              </View>

              <View style={styles.progressBarBackground}>
                <View 
                  style={[styles.progressBarFill, { width: `${score}%`, backgroundColor: getScoreColor(score) }]} 
                />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  header: { marginTop: 40, marginBottom: 30 },
  title: { fontSize: 38, fontFamily: 'Pacifico_400Regular', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 5 },
  
  sectionContainer: { backgroundColor: colors.card, padding: 20, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 15 },
  
  heatmapWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start', paddingHorizontal: 5 },
  heatmapSquare: { width: 16, height: 16, borderRadius: 3, borderWidth: isDark ? 0 : 1, borderColor: colors.border },
  
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 15, gap: 5 },
  legendText: { color: colors.textMuted, fontSize: 12, marginHorizontal: 4 },
  legendSquare: { width: 10, height: 10, borderRadius: 2, borderWidth: isDark ? 0 : 1, borderColor: colors.border },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 5 },

  card: { backgroundColor: colors.card, padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  habitTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  scoreText: { fontSize: 18, fontWeight: 'bold' },
  progressBarBackground: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
});