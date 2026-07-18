import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { AlertContext } from '../context/AlertContext'; // ⭐ Imported Custom Alerts
import { scheduleTaskReminders } from '../services/NotificationService'; // ⭐ Imported Notification Service

export default function AddHabitScreen({ navigation }: any) {
  const { showAlert } = useContext(AlertContext);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [preferredTime, setPreferredTime] = useState('Morning');
  
  const [selectedDurationChip, setSelectedDurationChip] = useState<number | 'Custom'>(30);
  const [customDuration, setCustomDuration] = useState(''); 
  const [loading, setLoading] = useState(false);

  const difficulties = ["Easy", "Medium", "Hard"];
  const times = ["Morning", "Afternoon", "Evening", "Anytime"];
  const durationOptions: (number | 'Custom')[] = [15, 30, 45, 60, 'Custom'];

  const handleCreateHabit = async () => {
    if (!title.trim()) return showAlert("Hold up!", "Please enter a name for your habit.", "✋");

    let finalDuration = selectedDurationChip === 'Custom' ? parseInt(customDuration) : selectedDurationChip;
    if (!finalDuration || isNaN(finalDuration) || finalDuration <= 0) {
      return showAlert("Invalid Duration", "Please enter a valid number of minutes.", "⚠️");
    }

    setLoading(true);
    try {
      const response = await api.post('/habits', {
        title, difficulty, preferredTime, duration: finalDuration 
      });
      
      // ⭐ Extract the AI-generated scheduled time from the response and schedule the notification
      const createdHabit = response.data.habit || response.data;
      if (createdHabit && createdHabit.scheduledTime) {
         await scheduleTaskReminders(title, createdHabit.scheduledTime);
      }

      showAlert("Success", "Habit created and scheduled!", "✅");
      navigation.goBack(); 
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Failed to create habit.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (options: any[], selectedValue: any, onSelect: (val: any) => void) => (
    <View style={styles.chipContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.chip, selectedValue === option && styles.chipSelected]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.chipText, selectedValue === option && styles.chipTextSelected]}>
            {option === 'Custom' ? 'Custom' : (typeof option === 'number' ? `${option} min` : option)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
                <Text style={styles.backBtn}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Habit</Text>
            <View style={{ width: 80 }} /> 
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>What do you want to build?</Text>
            <TextInput 
                style={styles.input} 
                placeholder="e.g., Read 10 pages, Gym..." 
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
            />
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>Duration</Text>
            {renderChips(durationOptions, selectedDurationChip, setSelectedDurationChip)}
            
            {selectedDurationChip === 'Custom' && (
                <TextInput 
                style={[styles.input, { marginTop: 15 }]} 
                placeholder="Enter total minutes (e.g., 120)" 
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric" 
                value={customDuration}
                onChangeText={setCustomDuration}
                />
            )}
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>Difficulty ⚡</Text>
            {renderChips(difficulties, difficulty, setDifficulty)}
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>Preferred Time ⏰</Text>
            <Text style={styles.helperText}>The AI will try to schedule your habit during this block.</Text>
            {renderChips(times, preferredTime, setPreferredTime)}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateHabit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Habit</Text>}
        </TouchableOpacity>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 25 },
  backBtnWrapper: { padding: 5 },
  backBtn: { color: Colors.textMuted, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold' },
  
  cardSection: { backgroundColor: Colors.card, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  label: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  helperText: { color: Colors.textMuted, fontSize: 13, marginBottom: 15, marginTop: -8 },
  
  input: { backgroundColor: Colors.background, color: Colors.text, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: Colors.background, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: 'bold', fontSize: 14 },
  chipTextSelected: { color: '#FFF' },
  
  primaryButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});