import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext'; // ⭐ Imported Custom Alert Context
import { Colors } from '../theme/Colors';
import api from '../api/axiosConfig';
import { Ionicons } from '@expo/vector-icons'; 

export default function ProfileScreen({ navigation }: any) {
    const { logout, userData } = useContext(AuthContext); 
    const { showAlert } = useContext(AlertContext); // ⭐ Initialized custom alert
    
    // Modal States
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    
    // Stats State
    const [userStats, setUserStats] = useState({ xp: 0, rank: null });

    // Password Form States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Password Visibility States
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/analytics/leaderboard');
                if (res.data && res.data.myStats) {
                    setUserStats({ 
                        xp: res.data.myStats.disciplineScore || 0, 
                        rank: res.data.myRank 
                    });
                }
            } catch (error) {
                console.log("Failed to fetch user stats", error);
            }
        };
        fetchStats();
    }, []);

    const validateNewPassword = (text: string) => {
        setNewPassword(text);
        if (!text) {
            setNewPasswordError('');
            return;
        }
        if (text.length < 8) {
            setNewPasswordError('Password must be at least 8 characters long.');
        } else if (!/(?=.*[a-z])/.test(text)) {
            setNewPasswordError('Must contain at least one lowercase letter.');
        } else if (!/(?=.*[A-Z])/.test(text)) {
            setNewPasswordError('Must contain at least one uppercase letter.');
        } else if (!/(?=.*[0-9])/.test(text)) {
            setNewPasswordError('Must contain at least one number.');
        } else if (!/(?=.*[!@#$%^&*])/.test(text)) {
            setNewPasswordError('Must contain at least one special character (!@#$%^&*).');
        } else {
            setNewPasswordError('');
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert("Hold Up", "Please fill in all password fields.", "✋"); // ⭐ Updated
            return;
        }
        if (newPasswordError) {
            showAlert("Invalid Input", "Please fix the password errors before saving.", "⚠️"); // ⭐ Updated
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert("Error", "Your new passwords do not match.", "⚠️"); // ⭐ Updated
            return;
        }

        setPasswordLoading(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            
            showAlert("Success!", "Your password has been securely updated.", "✅"); // ⭐ Updated
            setPasswordModalVisible(false);
            
            // Clear fields for security
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setNewPasswordError('');
        } catch (error: any) {
            showAlert("Error", error.response?.data?.message || "Failed to update password.", "⚠️"); // ⭐ Updated
        } finally {
            setPasswordLoading(false);
        }
    };

    // Real-time mismatch validation
    const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const isSaveDisabled = passwordLoading || isMismatch || newPasswordError.length > 0 || !newPassword;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.header}>Profile</Text>

                <View style={styles.userCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
                        <Text style={styles.userEmail}>{userData?.email || 'email@example.com'}</Text>
                        
                        <View style={styles.statsRow}>
                            <View style={styles.statBadge}>
                                <Text style={styles.statBadgeText}>⚡ {userStats.xp} XP</Text>
                            </View>
                            {userStats.rank && (
                                <View style={[styles.statBadge, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                                    <Text style={[styles.statBadgeText, { color: '#FFD700' }]}>🏆 Rank #{userStats.rank}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Account</Text>
                <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Schedule')}>
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}>
                        <Text style={styles.menuIcon}>⚙️</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: Colors.text }]}>Daily Schedule</Text>
                        <Text style={styles.menuSub}>Update your wake, sleep & busy times</Text>
                    </View>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Security</Text>
                <TouchableOpacity style={styles.menuButton} onPress={() => setPasswordModalVisible(true)}>
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 159, 67, 0.1)' }]}>
                        <Text style={styles.menuIcon}>🔒</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: Colors.text }]}>Change Password</Text>
                        <Text style={styles.menuSub}>Update your account security</Text>
                    </View>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Danger Zone</Text>
                <TouchableOpacity style={styles.menuButton} onPress={() => setLogoutModalVisible(true)}>
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                        <Text style={styles.menuIcon}>🚪</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: Colors.error }]}>Log Out</Text>
                        <Text style={styles.menuSub}>Securely sign out of your account</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            <Modal transparent visible={passwordModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        
                        <View style={styles.inputContainer}>
                            
                            <View style={styles.passwordWrapper}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="Current Password" 
                                    placeholderTextColor={Colors.textMuted}
                                    secureTextEntry={!showCurrent}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                />
                                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
                                    <Ionicons name={showCurrent ? "eye-outline" : "eye-off-outline"} size={22} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.passwordWrapper, newPasswordError ? { borderColor: Colors.error } : null, { marginBottom: newPasswordError ? 5 : 12 }]}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="New Password" 
                                    placeholderTextColor={Colors.textMuted}
                                    secureTextEntry={!showNew}
                                    value={newPassword}
                                    onChangeText={validateNewPassword}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                                    <Ionicons name={showNew ? "eye-outline" : "eye-off-outline"} size={22} color={newPasswordError ? Colors.error : Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}

                            <View style={[styles.passwordWrapper, isMismatch && { borderColor: Colors.error }]}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="Confirm New Password" 
                                    placeholderTextColor={Colors.textMuted}
                                    secureTextEntry={!showConfirm}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                                    <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={22} color={isMismatch ? Colors.error : Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                            {isMismatch && <Text style={styles.errorText}>Passwords do not match.</Text>}
                        </View>
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                                setPasswordModalVisible(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setNewPasswordError('');
                            }}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalPrimaryBtn, isSaveDisabled && { opacity: 0.5 }]} 
                                onPress={handleChangePassword} 
                                disabled={isSaveDisabled}
                            >
                                {passwordLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={logoutModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalIcon}>👋</Text>
                        <Text style={styles.modalTitle}>Leaving so soon?</Text>
                        <Text style={styles.modalMessage}>Are you sure you want to log out of HabitCraft? Your streaks will be waiting for you.</Text>
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalDangerBtn} onPress={() => {
                                setLogoutModalVisible(false);
                                if (logout) logout();
                            }}>
                                <Text style={styles.modalConfirmText}>Log Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 25, paddingTop: 60, paddingBottom: 40 },
    header: { fontSize: 32, fontWeight: 'bold', color: Colors.text, marginBottom: 30 },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 20, borderRadius: 16, marginBottom: 30, borderWidth: 1, borderColor: Colors.border },
    avatarCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
    userInfo: { flex: 1 },
    userName: { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    userEmail: { color: Colors.textMuted, fontSize: 14, marginBottom: 10 },
    
    statsRow: { flexDirection: 'row', gap: 10 },
    statBadge: { backgroundColor: 'rgba(108, 99, 255, 0.15)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    statBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },

    divider: { height: 1, backgroundColor: Colors.border, marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textMuted, marginBottom: 15, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
    menuButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 15, borderRadius: 14, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
    menuIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuIcon: { fontSize: 20 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
    menuSub: { color: Colors.textMuted, fontSize: 13 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.card, width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    modalIcon: { fontSize: 40, marginBottom: 15 },
    modalTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    modalMessage: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    
    inputContainer: { width: '100%', marginBottom: 20 },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
    passwordInput: { flex: 1, color: Colors.text, padding: 15, fontSize: 16 },
    eyeIcon: { paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: Colors.error, fontSize: 13, marginTop: 2, marginBottom: 12, marginLeft: 5 },

    modalActions: { flexDirection: 'row', width: '100%', gap: 15 },
    modalCancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    modalCancelText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
    modalDangerBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: Colors.error, alignItems: 'center' },
    modalPrimaryBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
    modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});