import React, { useState, useCallback, useContext, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext'; 
import { ThemeContext } from '../context/ThemeContext';
import api from '../api/axiosConfig';
import LottieView from 'lottie-react-native';
import { requestNotificationPermission, syncHabitNotifications } from '../services/NotificationService'; 
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';

// ⭐ PERFORMANCE FIX: Memoizing the list item prevents unnecessary re-renders of the whole list
const HabitListItem = memo(({ item, navigation, onToggle }: any) => {
  const [isCompleted, setIsCompleted] = useState(item.completedToday);
  const { colors } = useContext(ThemeContext);
  const styles = getStyles(colors);

  const handlePress = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState); 
    onToggle(item, nextState, setIsCompleted); 
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'Hard') return colors.error;
    if (diff === 'Medium') return colors.accent;
    return colors.success;
  };

  return (
    <TouchableOpacity style={styles.habitCard} onPress={() => navigation.navigate('EditHabit', { habit: item })} activeOpacity={0.7}>
      <View style={styles.habitInfo}>
        <Text style={styles.habitTitle}>{item.icon || '🎯'} {item.title}</Text>
        <View style={styles.tagsContainer}>
            <Text style={[styles.tag, { color: getDifficultyColor(item.difficulty), borderColor: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
            <Text style={[styles.tag, { color: colors.textMuted, borderColor: colors.border }]}>⏱️ {item.duration}m</Text>
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
});

export default function DashboardScreen({ navigation }: any) {
  const { logout, userData } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext); 
  const { colors } = useContext(ThemeContext);
  const styles = getStyles(colors);

  let [fontsLoaded] = useFonts({
    Pacifico_400Regular,
  });

  const hasSynced = useRef(false);
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCelebration, setShowCelebration] = useState(false);

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

      if (response.data.habits && !hasSynced.current) {
         // ⭐ PERFORMANCE FIX: Defers heavy background task until UI is fully rendered
         InteractionManager.runAfterInteractions(async () => {
             await syncHabitNotifications(response.data.habits);
             hasSynced.current = true; 
         });
      }
      
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

  // ⭐ PERFORMANCE FIX: useCallback prevents child components from unmounting
  const handleToggleComplete = useCallback(async (item: any, isCompleting: boolean, revertLocalState: Function) => {
    if (isCompleting) {
      setShowCelebration(true);
    }

    try {
      if (isCompleting) {
        await api.patch(`/habits/${item._id}/complete`);
      } else {
        await api.delete(`/habits/${item._id}/complete`);
      }
      fetchDashboard(); 
    } catch (error: any) {
      revertLocalState(!isCompleting);
      showAlert("Action Failed", error.response?.data?.message || "Could not update habit.", "⚠️");
    }
  }, []);

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

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {showCelebration && (
        <View style={styles.lottieContainer} pointerEvents="none">
          <LottieView
            source={require('../../assets/celebration.json')} 
            autoPlay={true}
            loop={false}
            onAnimationFinish={() => setShowCelebration(false)} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}

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
          /* ⭐ PERFORMANCE FIX: Removed FlatList inside ScrollView. Used .map() for small arrays */
          <View>
            {dashboardData?.habits?.map((item: any) => (
              <HabitListItem 
                key={item._id} 
                item={item} 
                navigation={navigation} 
                onToggle={handleToggleComplete} 
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddHabitClick}>
        <Text style={styles.fabText}>+ Add Habit</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 50 },
  
  lottieContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 999 },

  headerContainer: { marginBottom: 20 },
  centerTitles: { alignItems: 'center', marginBottom: 15 },
  leftStats: { alignItems: 'flex-start' },
  title: { fontSize: 36, fontFamily: 'Pacifico_400Regular', color: colors.text, marginBottom: -4 },
  greetingText: { color: colors.textMuted, fontSize: 16, marginTop: 4 },
  subtitle: { fontSize: 16, color: colors.accent, fontWeight: 'bold' },
  consistencyText: { fontSize: 15, color: colors.secondary, fontWeight: 'bold', marginTop: 4 },
  
  aiCard: { backgroundColor: colors.card, padding: 15, borderRadius: 12, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: colors.primary, borderWidth: 1, borderColor: colors.border },
  aiTitle: { color: colors.primary, fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  aiText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  
  insightsContainer: { marginBottom: 25 },
  insightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  insightIcon: { fontSize: 22, marginRight: 15 },
  insightTextContainer: { flex: 1, paddingRight: 10 },
  insightMessage: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  highlightedHabitName: { color: colors.primary, fontWeight: 'bold' }, 
  insightTime: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  dismissBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  dismissBtnText: { color: colors.textMuted, fontSize: 18, fontWeight: 'bold' },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 5 },
  
  habitCard: { backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  habitInfo: { flex: 1 },
  habitTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  tagsContainer: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tag: { fontSize: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontWeight: '600' },
  habitDetail: { color: colors.textMuted, fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  
  completeBtn: { 
    paddingVertical: 10, 
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pending: { backgroundColor: colors.primary },
  completed: { backgroundColor: colors.success },
  completeBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, elevation: 5 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});