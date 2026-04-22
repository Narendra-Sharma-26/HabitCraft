import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Colors } from '../theme/Colors';

export default function ProfileScreen({ navigation }: any) {
    const { logout, userData } = useContext(AuthContext); 
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
                    </View>
                </View>

                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Account</Text>

                {/* Edit Schedule Button */}
                <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Schedule')}>
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}>
                        <Text style={styles.menuIcon}>⚙️</Text>
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, { color: Colors.text }]}>Daily Schedule</Text>
                        <Text style={styles.menuSub}>Update your wake, sleep & busy times</Text>
                    </View>
                </TouchableOpacity>

                {/* Custom Logout Trigger */}
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

            {/* ⭐ CUSTOM LOGOUT MODAL ⭐ */}
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
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => {
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
    userEmail: { color: Colors.textMuted, fontSize: 14 },
    divider: { height: 1, backgroundColor: Colors.border, marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textMuted, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    menuButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 15, borderRadius: 14, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
    menuIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuIcon: { fontSize: 20 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
    menuSub: { color: Colors.textMuted, fontSize: 13 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.card, width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    modalIcon: { fontSize: 40, marginBottom: 15 },
    modalTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    modalMessage: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalActions: { flexDirection: 'row', width: '100%', gap: 15 },
    modalCancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    modalCancelText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
    modalConfirmBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: Colors.error, alignItems: 'center' },
    modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});