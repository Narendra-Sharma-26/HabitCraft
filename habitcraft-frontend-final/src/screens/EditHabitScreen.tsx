import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { AlertContext } from '../context/AlertContext';

// Helper to convert Date object to HH:MM string
const dateToHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Helper to convert HH:MM string to Date object
const hhmmToDate = (timeStr: string) => {
  if (!timeStr) return new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
};

export default function EditHabitScreen({ route, navigation }: any) {
  const { habit } = route.params;
  const { showAlert } = useContext(AlertContext);

  const [title, setTitle] = useState(habit.title);
  const [duration, setDuration] = useState(habit.duration ? habit.duration.toString() : '30');
  const [difficulty, setDifficulty] = useState(habit.difficulty || 'Medium');
  
  // Time Picker State
  const [scheduledTime, setScheduledTime] = useState(habit.scheduledTime || '');
  const [showPicker, setShowPicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const difficulties = ["Easy", "Medium", "Hard"];

  const handleUpdateHabit = async () => {
    if (!title.trim()) return Alert.alert("Hold up!", "Habit title cannot be empty.");

    setLoading(true);
    try {
      await api.put(`/habits/${habit._id}`, {
        title,
        difficulty,
        duration: parseInt(duration),
        scheduledTime 
      });
      navigation.goBack(); 
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update habit.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHabit = () => {
    // ⭐ Single-line custom delete confirmation!
    showAlert(
      "Delete Habit", 
      "Are you sure you want to permanently delete this habit?", 
      "🗑️", 
      async () => {
        setDeleting(true);
        try {
          await api.delete(`/habits/${habit._id}`);
          navigation.goBack();
        } catch (error) {
          showAlert("Error", "Failed to delete habit.", "⚠️");
          setDeleting(false);
        }
      }, 
      true // ⭐ Pass true to show "Cancel" and "Confirm" buttons
    );
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) {
        setShowPicker(false);
        return;
    }
    setScheduledTime(dateToHHMM(selectedDate));
    if (Platform.OS === 'ios') setShowPicker(false);
  };

  const renderChips = (options: string[], selectedValue: string, onSelect: (val: string) => void) => (
    <View style={styles.chipContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.chip, selectedValue === option && styles.chipSelected]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.chipText, selectedValue === option && styles.chipTextSelected]}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}> Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Habit</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.label}>Habit Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Difficulty</Text>
      {renderChips(difficulties, difficulty, setDifficulty)}

      <Text style={[styles.label, { marginTop: 25 }]}>Scheduled Time</Text>
      <Text style={styles.helperText}>Override the AI's suggested time here.</Text>
      <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.timeText}>{scheduledTime ? `⏰ ${scheduledTime}` : "Not Set"}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={scheduledTime ? hhmmToDate(scheduledTime) : new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      <Text style={styles.label}>Duration (minutes)</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" />

      <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateHabit} disabled={loading || deleting}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteHabit} disabled={loading || deleting}>
        {deleting ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.deleteButtonText}>Delete Habit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 30 },
  backBtn: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  label: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 20 },
  helperText: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  input: { backgroundColor: Colors.card, color: Colors.text, padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: Colors.card, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: 'bold', fontSize: 15 },
  chipTextSelected: { color: '#FFF' },

  timePickerButton: { backgroundColor: Colors.card, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  timeText: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },

  primaryButton: { backgroundColor: Colors.success, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 40 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  deleteButton: { backgroundColor: 'transparent', borderColor: Colors.error, borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  deleteButtonText: { color: Colors.error, fontSize: 18, fontWeight: 'bold' }
});