import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { AlertContext } from '../context/AlertContext';
import { ThemeContext } from '../context/ThemeContext';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { LineChart } from 'react-native-gifted-charts';

export default function AnalyticsScreen() {
  const [healthData, setHealthData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); 

  const { showAlert } = useContext(AlertContext);
  const { colors, isDark } = useContext(ThemeContext);
  const styles = getStyles(colors, isDark);

  let [fontsLoaded] = useFonts({
    Pacifico_400Regular,
  });

  const timeframes = [
    { id: 'week', label: '1W' },
    { id: 'month', label: '1M' },
    { id: '6months', label: '6M' },
    { id: 'year', label: '1Y' }
  ];

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const healthReq = api.get(`/habits/health?range=${timeframe}`).catch(err => {
        return { data: { habits: [] } };
      });

      const heatmapReq = api.get(`/analytics/heatmap?range=${timeframe}`).catch(err => {
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

  useFocusEffect(useCallback(() => { fetchAnalyticsData(); }, [timeframe]));

  // ⭐ THE CLEAN FIX: Only passing raw strings. Let the library handle the centering natively.
  const processChartData = (data: any[], tf: string) => {
    if (!data || data.length === 0) return [];

    if (tf === 'week') {
      return data.slice(-7).map(item => ({
        value: item.completed,
        label: item.date.slice(8, 10), // e.g., '14', '15'
      }));
    }

    if (tf === 'month') {
      const aggregated = [];
      // ⭐ 1M AGGREGATION: Compresses 30 days into 15 perfect points (Summing every 2 days)
      for (let i = 0; i < data.length; i += 2) {
        const day1 = data[i];
        const day2 = data[i + 1];
        const sum = day1.completed + (day2 ? day2.completed : 0);
        
        // Show the date label on every 2nd dot so the X-axis doesn't get cluttered
        const dotIndex = Math.floor(i / 2);
        const showLabel = dotIndex % 2 === 0 || dotIndex === 14; 
        
        aggregated.push({
          value: sum,
          label: showLabel ? day1.date.slice(8, 10) : ''
        });
      }
      return aggregated.slice(-15);
    }

    const monthlyData: Record<string, number> = {};
    data.forEach(item => {
      const monthKey = item.date.slice(0, 7); 
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.completed;
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const aggregatedMonths = Object.keys(monthlyData).sort().map(key => {
      const monthIndex = parseInt(key.split('-')[1], 10) - 1;
      return {
        value: monthlyData[key],
        label: monthNames[monthIndex] // Restored standard 3-letter months
      };
    });

    return tf === '6months' ? aggregatedMonths.slice(-6) : aggregatedMonths.slice(-12);
  };

  const lineChartData = processChartData(heatmapData, timeframe);

  const maxVal = Math.max(...lineChartData.map(d => d.value), 1);
  const yAxisSections = maxVal < 5 ? maxVal : 4; 
  const isYear = timeframe === 'year';

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

  if (!fontsLoaded) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

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

      <View style={styles.timeframeContainer}>
        {timeframes.map(tf => (
          <TouchableOpacity 
            key={tf.id} 
            style={[styles.timeframeChip, timeframe === tf.id && styles.timeframeChipActive]}
            onPress={() => setTimeframe(tf.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeframeText, timeframe === tf.id && styles.timeframeTextActive]}>
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Completion Trend</Text>
            <Text style={styles.sectionSubtitle}>Your {timeframe === 'week' || timeframe === 'month' ? 'daily' : 'monthly'} activity.</Text>
            
            {lineChartData.length > 0 ? (
              <View style={{ marginTop: 15, marginLeft: -10 }}>
                <LineChart
                  // ⭐ THE FIX: Explicit dark/light key string forces the canvas to remount
                  key={`chart-${timeframe}-${isDark ? 'dark' : 'light'}`}
                  
                  data={lineChartData}
                  color={colors.primary}
                  thickness={3}
                  dataPointsColor={colors.secondary}
                  dataPointsRadius={timeframe === 'month' ? 3 : 5} 

                  // ⭐ THE FIX: Root textColor overrides the cached Y-Axis color bug
                  textColor={colors.textMuted}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  
                  // ⭐ NATIVE CENTERING: 
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}
                  
                  // ⭐ AUTO WIDTH MATH: adjustToWidth seamlessly forces the chart to perfectly fit the screen bounds 
                  adjustToWidth={!isYear}
                  spacing={isYear ? 45 : undefined} 
                  
                  hideRules
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  initialSpacing={15}
                  endSpacing={15}
                  
                  // ⭐ SCROLL TO END: Always loads focused on the most recent, current data
                  scrollToEnd={true} 
                  scrollAnimation={false} 
                  
                  maxValue={maxVal}
                  noOfSections={yAxisSections}
                  isAnimated={true}
                />
              </View>
            ) : (
              <Text style={styles.emptySubtext}>No chart data available.</Text>
            )}
          </View>

          {(timeframe === 'week' || timeframe === 'month') && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Activity Grid</Text>
              
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
          )}

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
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  header: { marginTop: 40, marginBottom: 20 },
  title: { fontSize: 38, fontFamily: 'Pacifico_400Regular', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 5 },
  
  timeframeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, backgroundColor: colors.card, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  timeframeChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  timeframeChipActive: { backgroundColor: colors.primary },
  timeframeText: { color: colors.textMuted, fontWeight: 'bold', fontSize: 14 },
  timeframeTextActive: { color: '#FFF' },

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
  habitTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 10 },
  scoreText: { fontSize: 18, fontWeight: 'bold' },
  progressBarBackground: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
});