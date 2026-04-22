import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext'; // ⭐ Imported Context
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function DashboardScreen({ navigation }: any) {
  const { logout, userData } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext); // ⭐ Got the global function!
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shootConfetti, setShootConfetti] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      
      // ⭐ ONBOARDING GATEKEEPER: If no schedule, bounce them to Setup!
      if (response.data.hasSchedule === false) {
         navigation.replace('Schedule', { isSetup: true });
         return; // Stop loading the dashboard
      }

      setDashboardData(response.data);
    } catch (error: any) {
      console.log("Dashboard Error:", error);
      showAlert("Connection Error", "Could not load dashboard data.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const toggleHabitCompletion = async (item: any) => {
    try {
      if (item.completedToday) {
        // UNDO
        await api.delete(`/habits/${item._id}/complete`);
      } else {
        // COMPLETE -> Trigger the satisfying animation
        setShootConfetti(true);
        setTimeout(() => setShootConfetti(false), 3000); 
        await api.patch(`/habits/${item._id}/complete`);
      }
      fetchDashboard(); 
    } catch (error: any) {
      showAlert("Action Failed", error.response?.data?.message || "Could not update habit.", "⚠️");
    }
  };

  // ⭐ Dynamic Limit Checking Logic using Global Alert
  const handleAddHabitClick = () => {
    const activeCount = dashboardData?.totalHabits || 0;
    const consistency = dashboardData?.thirtyDayConsistency || 0;

    if (activeCount >= 10) {
        showAlert("Limit Reached", "Masterful focus! You have reached the absolute maximum of 10 active habits.", "🏆");
    } else if (activeCount >= 7 && consistency <= 95) {
        showAlert("Prove Your Discipline", `You need > 95% consistency to unlock habits 8-10.\n\nYour Consistency: ${consistency}%`, "🛡️");
    } else if (activeCount >= 5 && consistency <= 90) {
        showAlert("Prove Your Discipline", `You need > 90% consistency to unlock habits 6-7.\n\nYour Consistency: ${consistency}%`, "🛡️");
    } else if (activeCount >= 3 && consistency <= 80) {
        showAlert("Prove Your Discipline", `You need > 80% consistency to unlock habits 4-5.\n\nYour Consistency: ${consistency}%`, "🛡️");
    } else {
        navigation.navigate('AddHabit');
    }
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'Hard') return Colors.error;
    if (diff === 'Medium') return Colors.accent;
    return Colors.success;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {shootConfetti && <ConfettiCannon count={100} origin={{x: -10, y: 0}} fallSpeed={2500} fadeOut />}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>HabitCraft</Text>
          <Text style={styles.greetingText}>
            Hello, {userData?.name ? userData.name.split(' ')[0] : 'Achiever'}!
          </Text>
          <Text style={styles.subtitle}>
            XP: {dashboardData?.disciplineScore || 0}  |  Best Streak: {dashboardData?.bestStreak || 0}🔥
          </Text>
          <Text style={styles.consistencyText}>
            30-Day Consistency: {dashboardData?.thirtyDayConsistency || 0}%
          </Text>
        </View>
      </View>

      {dashboardData?.aiNudge && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>🤖 AI Coach</Text>
          <Text style={styles.aiText}>{dashboardData.aiNudge}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Today's Routine</Text>

      {dashboardData?.habits?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active habits for today.</Text>
          <Text style={styles.emptySubtext}>Time to build some discipline!</Text>
        </View>
      ) : (
        <FlatList
          data={dashboardData?.habits}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.habitCard} onPress={() => navigation.navigate('EditHabit', { habit: item })} activeOpacity={0.7}>
              <View style={styles.habitInfo}>
                <Text style={styles.habitTitle}>{item.title}</Text>
                <View style={styles.tagsContainer}>
                    <Text style={[styles.tag, { color: getDifficultyColor(item.difficulty), borderColor: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
                    <Text style={[styles.tag, { color: Colors.textMuted, borderColor: Colors.border }]}>⏱️ {item.duration}m</Text>
                </View>
                <Text style={styles.habitDetail}>⏰ {item.scheduledTime || "Time pending"} • 🔥 {item.streak || 0} Day Streak</Text>
              </View>
              <TouchableOpacity style={[styles.completeBtn, item.completedToday ? styles.completed : styles.pending]} onPress={() => toggleHabitCompletion(item)}>
                <Text style={styles.completeBtnText}>{item.completedToday ? "Done ✅" : "Complete"}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddHabitClick}>
        <Text style={styles.fabText}>+ Add Habit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2C', padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 16, color: '#FFD700', fontWeight: 'bold', marginTop: 5 },
  consistencyText: { fontSize: 15, color: Colors.secondary, fontWeight: 'bold', marginTop: 4 },
  logoutBtn: { backgroundColor: '#3A3A4D', padding: 10, borderRadius: 8 },
  logoutText: { color: '#FF6B6B', fontWeight: 'bold' },
  aiCard: { backgroundColor: '#2A2A3D', padding: 15, borderRadius: 12, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#6C63FF' },
  aiTitle: { color: '#6C63FF', fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  aiText: { color: '#E0E0E0', fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: '#A0A0B0', fontSize: 14, marginTop: 5 },
  habitCard: { backgroundColor: '#2A2A3D', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  habitInfo: { flex: 1 },
  habitTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  tagsContainer: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tag: { fontSize: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontWeight: '600' },
  habitDetail: { color: '#A0A0B0', fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  completeBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  pending: { backgroundColor: '#6C63FF' },
  completed: { backgroundColor: '#4CAF50' },
  completeBtnText: { color: '#FFF', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#6C63FF', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, elevation: 5 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  greetingText: { color: Colors.textMuted, fontSize: 16, marginBottom: 15 }
});