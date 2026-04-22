import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { AlertContext } from '../context/AlertContext';

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRankData, setMyRankData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useContext(AlertContext);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/analytics/leaderboard');
      
      // ⭐ SAFE FALLBACKS: Prevents crashes if payload is missing or malformed
      setLeaderboard(response.data?.leaderboard || []);
      setMyRankData(response.data?.myStats || null);
    } catch (error: any) {
      console.log("Leaderboard Error:", error);
      showAlert("Leaderboard Error", "Could not load global rankings.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchLeaderboard(); }, []));

  // Visual helper for Top 3 styling
  const getRankStyle = (rank: number) => {
    if (rank === 1) return { borderColor: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.1)', color: '#FFD700' }; // Gold
    if (rank === 2) return { borderColor: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.1)', color: '#C0C0C0' }; // Silver
    if (rank === 3) return { borderColor: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.1)', color: '#CD7F32' }; // Bronze
    return { borderColor: Colors.border, bgColor: Colors.card, color: Colors.textMuted }; // Standard
  };

  const renderUserCard = ({ item }: { item: any }) => {
    if (!item) return null; // Failsafe against empty items

    const isTop3 = item.rank <= 3;
    const rankStyle = getRankStyle(item.rank);
    // ⭐ SAFE STRING CHECK: Prevents charAt error if name is missing
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';

    return (
      <View style={[styles.card, { borderColor: rankStyle.borderColor, backgroundColor: rankStyle.bgColor, borderWidth: isTop3 ? 1.5 : 1 }]}>
        <View style={styles.rankContainer}>
          {item.rank === 1 ? <Text style={styles.rankMedal}>🥇</Text> : 
           item.rank === 2 ? <Text style={styles.rankMedal}>🥈</Text> : 
           item.rank === 3 ? <Text style={styles.rankMedal}>🥉</Text> : 
           <Text style={styles.regularRank}>#{item.rank}</Text>}
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, isTop3 && { color: rankStyle.color }]} numberOfLines={1}>
            {item.name || 'Unknown Achiever'}
          </Text>
          <Text style={styles.userStats}>{item.disciplineScore || 0} XP</Text>
        </View>

        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>{item.bestStreak || 0}</Text>
          <Text style={styles.fireIcon}>🔥</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Ranks</Text>
        <Text style={styles.subtitle}>Compete with the most disciplined achievers.</Text>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item, index) => item?._id || index.toString()}
        renderItem={renderUserCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }} // ⭐ Extended padding so sticky footer doesn't overlap the last user
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No rankings available yet.</Text>
                <Text style={styles.emptySubtext}>Be the first to build a streak!</Text>
            </View>
        }
      />

      {/* ⭐ STICKY FOOTER FOR CURRENT USER'S RANK */}
      {myRankData && (
        <View style={styles.myRankFooter}>
          <View style={styles.myRankHeader}>
            <Text style={styles.myRankLabel}>YOUR STANDING</Text>
            <Text style={styles.myRankValue}>Rank #{myRankData.rank || '-'}</Text>
          </View>
          <View style={styles.myRankDetails}>
            <Text style={styles.myRankStat}>{myRankData.disciplineScore || 0} XP</Text>
            <Text style={styles.myRankStatDivider}>•</Text>
            <Text style={styles.myRankStat}>{myRankData.bestStreak || 0}🔥 Streak</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  header: { marginBottom: 25 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textMuted, marginTop: 5 },
  
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12 },
  rankContainer: { width: 45, alignItems: 'center', justifyContent: 'center' },
  rankMedal: { fontSize: 28 },
  regularRank: { color: Colors.textMuted, fontSize: 18, fontWeight: 'bold' },
  
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  userStats: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  
  streakContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  streakText: { color: Colors.accent, fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  fireIcon: { fontSize: 16 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: Colors.textMuted, fontSize: 14, marginTop: 5 },

  // Sticky Footer Styles
  myRankFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.primary, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 15 },
  myRankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myRankLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  myRankValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  myRankDetails: { flexDirection: 'row', alignItems: 'center' },
  myRankStat: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  myRankStatDivider: { color: 'rgba(255,255,255,0.5)', marginHorizontal: 10, fontSize: 16 }
});