import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext'; 
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import LottieView from 'lottie-react-native';
import { requestNotificationPermission } from '../services/NotificationService'; 

// ⭐ NEW: Isolated component so the button updates instantly without re-rendering the whole screen
const HabitListItem = ({ item, navigation, onToggle }: any) => {
  // Local state provides 0ms lag on visual updates
  const [isCompleted, setIsCompleted] = useState(item.completedToday);

  const handlePress = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState); // Instantly changes button color to green/purple
    onToggle(item, nextState, setIsCompleted); // Pass down to handle backend sync
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'Hard') return Colors.error;
    if (diff === 'Medium') return Colors.accent;
    return Colors.success;
  };

  return (
    <TouchableOpacity style={styles.habitCard} onPress={() => navigation.navigate('EditHabit', { habit: item })} activeOpacity={0.7}>
      <View style={styles.habitInfo}>
        <Text style={styles.habitTitle}>{item.title}</Text>
        <View style={styles.tagsContainer}>
            <Text style={[styles.tag, { color: getDifficultyColor(item.difficulty), borderColor: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
            <Text style={[styles.tag, { color: Colors.textMuted, borderColor: Colors.border }]}>⏱️ {item.duration}m</Text>
        </View>
        <Text style={styles.habitDetail}>⏰ {item.scheduledTime || "Time pending"} • 🔥 {item.streak || 0} Day Streak</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.completeBtn, isCompleted ? styles.completed : styles.pending]} 
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.completeBtnText}>{isCompleted ? "Done" : "Complete"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};


export default function DashboardScreen({ navigation }: any) {
  const { logout, userData } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext); 
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ⭐ NEW: Native ref for Lottie (Zero JS thread lag)
  const confettiRef = useRef<LottieView>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log("User denied notification permissions.");
      }
    };
    setupNotifications();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      if (response.data.hasSchedule === false) {
         navigation.replace('Schedule', { isSetup: true });
         return; 
      }
      setDashboardData(response.data);
    } catch (error: any) {
      console.log("Dashboard Error:", error);
      showAlert("Connection Error", "Could not load dashboard data.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data && response.data.notifications) {
        const unreadNotifs = response.data.notifications.filter((n: any) => !n.isRead);
        const uniqueNudges: any[] = [];
        const seenKeys = new Set();
        
        for (const notif of unreadNotifs) {
          const key = notif.message || `${notif.habitId}-${notif.type}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const duplicates = unreadNotifs.filter((n: any) => (n.message || `${n.habitId}-${n.type}`) === key);
            const duplicateIds = duplicates.map((n: any) => n._id);
            uniqueNudges.push({ ...notif, duplicateIds });
          }
        }
        setNotifications(uniqueNudges.slice(0, 3));
      }
    } catch (error) {
      console.log("Failed to fetch smart notifications", error);
    }
  };

  const dismissNotification = async (notif: any) => {
    try {
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      if (notif.duplicateIds && notif.duplicateIds.length > 0) {
        await Promise.all(notif.duplicateIds.map((id: string) => api.patch(`/notifications/${id}/read`)));
      } else {
        await api.patch(`/notifications/${notif._id}/read`);
      }
    } catch (error) {
      console.log("Failed to dismiss notification", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchNotifications(); 
    }, [])
  );

  // Updated to handle the API calls in the background while UI stays perfectly responsive
  const handleToggleComplete = async (item: any, isCompleting: boolean, revertLocalState: Function) => {
    if (isCompleting) {
      // 🚀 Instantly trigger native Lottie animation without re-rendering the whole screen!
      confettiRef.current?.play(0, 100); // Plays frames 0 to 100
    }

    try {
      if (isCompleting) {
        await api.patch(`/habits/${item._id}/complete`);
      } else {
        await api.delete(`/habits/${item._id}/complete`);
      }
      // Silently fetch to update XP and Consistency stats in the background
      fetchDashboard(); 
    } catch (error: any) {
      // If the API fails, flip the button back to its previous state
      revertLocalState(!isCompleting);
      showAlert("Action Failed", error.response?.data?.message || "Could not update habit.", "⚠️");
    }
  };

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

  const getNotificationIcon = (type: string) => {
    if (type.includes('recovery')) return '⚠️';
    if (type.includes('consistency')) return '🔥';
    if (type === 'pre_commitment') return '⏳';
    return '🔔';
  };

  const renderNotificationMessage = (notif: any) => {
    let text = notif.message;
    if (!text) {
      const habitObj = dashboardData?.habits?.find((h: any) => h._id === notif.habitId);
      const hName = habitObj ? habitObj.title : "your habit";
      switch(notif.type) {
          case 'missed_recovery_push': text = `You missed "${hName}" yesterday. Let's get back on track today 💪`; break;
          case 'missed_recovery_soft': text = `Don't let a missed day on "${hName}" become a missed week.`; break;
          case 'consistency_reinforcement': text = `Great consistency on "${hName}"! Don't break the chain 🔥`; break;
          case 'pre_commitment': text = `Upcoming: "${hName}"! Time to get mentally ready.`; break;
          case 'discipline_reminder': text = `Time to execute "${hName}". Stay disciplined.`; break;
          default: text = `Stay focused on "${hName}".`;
      }
    }

    if (text && text.includes('"')) {
      const parts = text.split('"');
      return (
        <Text style={styles.insightMessage}>
          {parts.map((part: string, index: number) => {
            if (index % 2 !== 0) {
              return <Text key={index} style={styles.highlightedHabitName}>{part}</Text>;
            }
            return part;
          })}
        </Text>
      );
    }
    return <Text style={styles.insightMessage}>{text}</Text>;
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
      
      {/* ⭐ NEW: Native Lottie Overlay. Sits invisibly until triggered */}
      <View style={styles.lottieContainer} pointerEvents="none">
        <LottieView
          ref={confettiRef}
          source={require('../../assets/celebration.json')} // Update this path to where you saved your JSON
          loop={false}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>

      <View style={styles.headerContainer}>
        <View style={styles.centerTitles}>
          <Text style={styles.title}>HabitCraft</Text>
          <Text style={styles.greetingText}>
            Hello, {userData?.name ? userData.name.split(' ')[0] : 'Achiever'}!
          </Text>
        </View>

        <View style={styles.leftStats}>
          <Text style={styles.subtitle}>
            XP: {dashboardData?.disciplineScore || 0}  |  Best Streak: {dashboardData?.bestStreak || 0}🔥
          </Text>
          <Text style={styles.consistencyText}>
            30-Day Consistency: {dashboardData?.thirtyDayConsistency || 0}%
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {dashboardData?.aiNudge && (
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>🤖 AI Coach</Text>
            <Text style={styles.aiText}>{dashboardData.aiNudge}</Text>
          </View>
        )}

        {notifications.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Smart Insights</Text>
            {notifications.map((notif: any) => (
              <View key={notif._id} style={styles.insightCard}>
                <Text style={styles.insightIcon}>{getNotificationIcon(notif.type)}</Text>
                <View style={styles.insightTextContainer}>
                  {renderNotificationMessage(notif)}
                  <Text style={styles.insightTime}>
                    {new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => dismissNotification(notif)}>
                  <Text style={styles.dismissBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
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
            scrollEnabled={false} 
            renderItem={({ item }) => (
              <HabitListItem item={item} navigation={navigation} onToggle={handleToggleComplete} />
            )}
          />
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddHabitClick}>
        <Text style={styles.fabText}>+ Add Habit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2C', padding: 20, paddingTop: 50 },
  
  lottieContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 999 },

  headerContainer: { marginBottom: 20 },
  centerTitles: { alignItems: 'center', marginBottom: 15 },
  leftStats: { alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  greetingText: { color: Colors.textMuted, fontSize: 16, marginTop: 4 },
  subtitle: { fontSize: 16, color: '#FFD700', fontWeight: 'bold' },
  consistencyText: { fontSize: 15, color: Colors.secondary, fontWeight: 'bold', marginTop: 4 },
  
  aiCard: { backgroundColor: '#2A2A3D', padding: 15, borderRadius: 12, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#6C63FF' },
  aiTitle: { color: '#6C63FF', fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  aiText: { color: '#E0E0E0', fontSize: 15, lineHeight: 22 },
  
  insightsContainer: { marginBottom: 25 },
  insightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252538', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#3A3A4D' },
  insightIcon: { fontSize: 22, marginRight: 15 },
  insightTextContainer: { flex: 1, paddingRight: 10 },
  insightMessage: { color: '#E0E0E0', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  highlightedHabitName: { color: Colors.primary, fontWeight: 'bold' }, 
  insightTime: { color: '#8A8A9D', fontSize: 11, marginTop: 4 },
  dismissBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  dismissBtnText: { color: Colors.textMuted, fontSize: 18, fontWeight: 'bold' },
  
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
  
  completeBtn: { 
    paddingVertical: 10, 
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pending: { backgroundColor: '#6C63FF' },
  completed: { backgroundColor: '#4CAF50' },
  completeBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#6C63FF', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, elevation: 5 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});