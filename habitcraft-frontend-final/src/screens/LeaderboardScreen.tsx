import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { AlertContext } from '../context/AlertContext';
import { ThemeContext } from '../context/ThemeContext';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<'global' | 'squads'>('global');
  
  // Global States
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRankData, setMyRankData] = useState<any>(null);
  
  // Squad States
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupLeaderboard, setGroupLeaderboard] = useState<any[]>([]);
  
  // Forms & Invite Modal
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ⭐ NEW: Custom Confirmation Modals State
  const [isDeleteSquadModalOpen, setIsDeleteSquadModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);

  const { showAlert } = useContext(AlertContext);
  const { colors } = useContext(ThemeContext);
  const styles = getStyles(colors);

  let [fontsLoaded] = useFonts({
    Pacifico_400Regular,
  });

  const fetchGlobalLeaderboard = async () => {
    try {
      const response = await api.get('/analytics/leaderboard');
      setLeaderboard(response.data?.leaderboard || []);
      setMyRankData(response.data?.myStats || null);
    } catch (error) {
      console.log("Global Leaderboard Error:", error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await api.get('/groups');
      setMyGroups(response.data);
    } catch (error) {
      console.log("Groups Fetch Error:", error);
    }
  };

  const fetchGroupLeaderboard = async (groupId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/groups/${groupId}/leaderboard`);
      setGroupLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      showAlert("Error", "Could not load squad leaderboard.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { 
    setLoading(true);
    Promise.all([fetchGlobalLeaderboard(), fetchMyGroups()]).finally(() => setLoading(false));
  }, []));

  // --- SQUAD ACTIONS ---
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post('/groups', { name: newGroupName });
      setNewGroupName('');
      setIsCreateModalOpen(false);
      fetchMyGroups();
      showAlert("Success", "Squad created! Now invite some friends.", "🏆");
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Could not create squad.", "⚠️");
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await api.get(`/groups/search?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.log("Search Error", error);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    try {
      await api.post(`/groups/${selectedGroup._id}/members`, { targetUserId });
      setIsInviteModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchGroupLeaderboard(selectedGroup._id); 
      showAlert("Added", "User successfully added to your squad!", "✅");
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Could not add user.", "⚠️");
    }
  };

  // ⭐ FIX 3: Custom Modal Handlers for Deletion
  const confirmDeleteSquad = async () => {
    try {
      await api.delete(`/groups/${selectedGroup._id}`);
      setSelectedGroup(null);
      fetchMyGroups();
      setIsDeleteSquadModalOpen(false);
      showAlert("Deleted", "Squad has been deleted.", "🗑️");
    } catch (error: any) {
      setIsDeleteSquadModalOpen(false);
      showAlert("Error", error.response?.data?.message || "Only the admin can delete this squad.", "⚠️");
    }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.delete(`/groups/${selectedGroup._id}/members/${memberToRemove.id}`);
      fetchGroupLeaderboard(selectedGroup._id);
      fetchMyGroups();
      setIsRemoveMemberModalOpen(false);
      setMemberToRemove(null);
      showAlert("Removed", `${memberToRemove.name} has been removed.`, "✅");
    } catch (error: any) {
      setIsRemoveMemberModalOpen(false);
      setMemberToRemove(null);
      showAlert("Error", error.response?.data?.message || "Not authorized to remove this member.", "⚠️");
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { borderColor: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.1)', color: '#FFD700' }; 
    if (rank === 2) return { borderColor: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.1)', color: '#C0C0C0' }; 
    if (rank === 3) return { borderColor: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.1)', color: '#CD7F32' }; 
    return { borderColor: colors.border, bgColor: colors.card, color: colors.textMuted }; 
  };

  const renderUserCard = ({ item }: { item: any }) => {
    if (!item) return null; 

    const isTop3 = item.rank <= 3;
    const rankStyle = getRankStyle(item.rank);
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';
    const isMe = item._id === myRankData?._id;

    return (
      // ⭐ FIX 2: Wrapped the card in a row to allow the remove button to sit cleanly outside
      <View style={styles.cardWrapper}>
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
              {item.name || 'Unknown Achiever'} {isMe && '(You)'}
            </Text>
            <Text style={styles.userStats}>{item.disciplineScore || 0} XP</Text>
          </View>

          <View style={styles.streakContainer}>
            <Text style={styles.streakText}>{item.bestStreak || 0}</Text>
            <Text style={styles.fireIcon}>🔥</Text>
          </View>
        </View>

        {/* The Remove Button is now securely outside the card layout */}
        {activeTab === 'squads' && !isMe && (
          <TouchableOpacity 
            style={styles.removeMemberBtnOutside} 
            onPress={() => {
              setMemberToRemove({ id: item._id, name: item.name });
              setIsRemoveMemberModalOpen(true);
            }}
          >
            <Text style={styles.removeMemberIcon}>✖</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if ((loading && !leaderboard.length) || !fontsLoaded) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}> Leaderboard</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'global' && styles.activeTab]} 
            onPress={() => { setActiveTab('global'); setSelectedGroup(null); }}
          >
            <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'squads' && styles.activeTab]} 
            onPress={() => setActiveTab('squads')}
          >
            <Text style={[styles.tabText, activeTab === 'squads' && styles.activeTabText]}>My Squads</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- GLOBAL VIEW --- */}
      {activeTab === 'global' && (
        <>
          <FlatList
            data={leaderboard}
            keyExtractor={(item, index) => item?._id || index.toString()}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 130 }} 
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No rankings available yet.</Text>
                    <Text style={styles.emptySubtext}>Be the first to build a streak!</Text>
                </View>
            }
          />

          {myRankData && (
            <View style={styles.myRankFooter}>
              <View style={styles.myRankHeader}>
                <Text style={styles.myRankLabel}>YOUR GLOBAL STANDING</Text>
                <Text style={styles.myRankValue}>Rank #{myRankData.rank || '-'}</Text>
              </View>
              <View style={styles.myRankDetails}>
                <Text style={styles.myRankStat}>{myRankData.disciplineScore || 0} XP</Text>
                <Text style={styles.myRankStatDivider}>•</Text>
                <Text style={styles.myRankStat}>{myRankData.bestStreak || 0}🔥 Streak</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* --- SQUADS VIEW --- */}
      {activeTab === 'squads' && (
        <View style={{ flex: 1 }}>
          {!selectedGroup ? (
            <>
              <FlatList
                data={myGroups}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>You aren't in any squads yet.</Text>
                    <Text style={styles.emptySubtext}>Create one to challenge your friends!</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.squadCard} 
                    onPress={() => {
                      setSelectedGroup(item);
                      fetchGroupLeaderboard(item._id);
                    }}
                  >
                    <View style={styles.squadIconBox}><Text style={styles.squadIcon}>🛡️</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.squadName}>{item.name}</Text>
                      <Text style={styles.squadMembers}>{item.members.length} Members</Text>
                    </View>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>View ➔</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.fab} onPress={() => setIsCreateModalOpen(true)}>
                <Text style={styles.fabText}>+ Create Squad</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.squadBoardHeader}>
                <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>⬅ Back</Text>
                </TouchableOpacity>
                
                <Text style={styles.squadBoardTitle} numberOfLines={1}>{selectedGroup.name}</Text>
                
                <View style={styles.squadActionButtons}>
                  <TouchableOpacity onPress={() => setIsDeleteSquadModalOpen(true)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsInviteModalOpen(true)} style={styles.inviteBtn}>
                    <Text style={styles.inviteBtnText}>+ Invite</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={groupLeaderboard}
                  keyExtractor={(item, index) => item?._id || index.toString()}
                  renderItem={renderUserCard}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 50 }} 
                />
              )}
            </>
          )}
        </View>
      )}

      {/* --- CREATE SQUAD MODAL --- */}
      <Modal transparent visible={isCreateModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Squad</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Squad Name (e.g. Iron Devs)" 
              placeholderTextColor={colors.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={30}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCreateModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleCreateGroup}>
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- INVITE MEMBER MODAL --- */}
      <Modal transparent visible={isInviteModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite to Squad</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Search by name or email..." 
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchUsers}
            />
            
            <ScrollView style={{ width: '100%', maxHeight: 200, marginBottom: 15 }}>
              {searchResults.map(user => (
                <View key={user._id} style={styles.searchResultItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{user.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{user.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.addBtn} onPress={() => handleAddMember(user._id)}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {searchQuery.length > 1 && searchResults.length === 0 && (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>No users found.</Text>
              )}
            </ScrollView>

            {/* ⭐ FIX 1: Clicking cancel now completely wipes the search state */}
            <TouchableOpacity 
              style={styles.modalCloseRedBtn} 
              onPress={() => {
                setIsInviteModalOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={styles.modalCloseRedText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- ⭐ NEW: DELETE SQUAD MODAL --- */}
      <Modal transparent visible={isDeleteSquadModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Squad?</Text>
            <Text style={styles.modalWarningText}>Are you sure you want to permanently delete this squad? This action cannot be undone.</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsDeleteSquadModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: colors.error }]} onPress={confirmDeleteSquad}>
                <Text style={styles.modalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- ⭐ NEW: REMOVE MEMBER MODAL --- */}
      <Modal transparent visible={isRemoveMemberModalOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Member?</Text>
            <Text style={styles.modalWarningText}>Are you sure you want to remove {memberToRemove?.name} from the squad?</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsRemoveMemberModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: colors.error }]} onPress={confirmRemoveMember}>
                <Text style={styles.modalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 50 },
  header: { marginBottom: 25 },
  title: { fontSize: 38, fontFamily: 'Pacifico_400Regular', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 5 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginTop: 15, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: 'bold', fontSize: 15 },
  activeTabText: { color: '#FFF' },
  
  // ⭐ FIX 2: Restructured Card Styles
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16 }, // Margin bottom moved to wrapper
  removeMemberBtnOutside: { padding: 15, marginLeft: 8, backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,0,0,0.1)' },
  removeMemberIcon: { color: colors.error, fontSize: 16, fontWeight: 'bold' },

  rankContainer: { width: 45, alignItems: 'center', justifyContent: 'center' },
  rankMedal: { fontSize: 28 },
  regularRank: { color: colors.textMuted, fontSize: 18, fontWeight: 'bold' },
  
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  userInfo: { flex: 1 },
  userName: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  userStats: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  
  streakContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  streakText: { color: colors.accent, fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  fireIcon: { fontSize: 16 },

  squadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  squadIconBox: { width: 40, height: 40, backgroundColor: 'rgba(108, 99, 255, 0.15)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  squadIcon: { fontSize: 20 },
  squadName: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  squadMembers: { color: colors.textMuted, fontSize: 13 },
  
  squadBoardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, backgroundColor: colors.card, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  backBtn: { padding: 5 },
  backBtnText: { color: colors.textMuted, fontWeight: 'bold' },
  squadBoardTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', paddingHorizontal: 10 },
  
  squadActionButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { backgroundColor: 'rgba(255,0,0,0.1)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  deleteBtnText: { fontSize: 14 },
  inviteBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  inviteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 5, textAlign: 'center' },

  fab: { position: 'absolute', bottom: 30, right: 0, backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, elevation: 5 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  myRankFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.primary, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 15 },
  myRankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myRankLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  myRankValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  myRankDetails: { flexDirection: 'row', alignItems: 'center' },
  myRankStat: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  myRankStatDivider: { color: 'rgba(255,255,255,0.5)', marginHorizontal: 10, fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  
  // Custom text for the new confirmation modals
  modalWarningText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  
  input: { width: '100%', backgroundColor: colors.background, color: colors.text, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 15 },
  modalCancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'rgba(128,128,128,0.2)', alignItems: 'center' },
  modalCancelText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  modalPrimaryBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  searchResultItem: { flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  addBtn: { backgroundColor: colors.success, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  modalCloseRedBtn: { width: '100%', padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,0,0,0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,0,0,0.3)' },
  modalCloseRedText: { color: colors.error, fontSize: 16, fontWeight: 'bold' }
});