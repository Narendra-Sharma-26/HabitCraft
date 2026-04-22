// src/context/AlertContext.tsx
import React, { createContext, useState, ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/Colors';

type AlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  onConfirm?: () => void;
  showCancel?: boolean;
};

export const AlertContext = createContext<any>(null);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '', icon: '🛑', showCancel: false
  });

  // ⭐ The single function you will call from anywhere in your app!
  const showAlert = (title: string, message: string, icon: string = '🛑', onConfirm?: () => void, showCancel: boolean = false) => {
    setAlertConfig({ visible: true, title, message, icon, onConfirm, showCancel });
  };

  const closeAlert = () => setAlertConfig({ ...alertConfig, visible: false });

  const handleConfirm = () => {
    closeAlert();
    if (alertConfig.onConfirm) alertConfig.onConfirm();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {/* The Global Modal UI */}
      <Modal transparent visible={alertConfig.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>{alertConfig.icon}</Text>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalMessage}>{alertConfig.message}</Text>

            {alertConfig.showCancel ? (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeAlert}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalBtn} onPress={closeAlert}>
                <Text style={styles.modalBtnText}>Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.card, width: '90%', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  modalIcon: { fontSize: 45, marginBottom: 15 },
  modalTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalMessage: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalBtn: { width: '100%', backgroundColor: Colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 15, width: '100%' },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelBtnText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: Colors.error, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});