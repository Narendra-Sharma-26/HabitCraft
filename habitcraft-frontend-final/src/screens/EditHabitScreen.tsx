import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { AlertContext } from '../context/AlertContext';
// ⭐ Import the new native alarm function
import { scheduleTaskReminders, setNativeRepeatingAlarm } from '../services/NotificationService'; 

const dateToHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const hhmmToDate = (timeStr: string) => {
  if (timeStr === undefined || timeStr === null || timeStr === '') return new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
};

const timeToMins = (timeString: string) => {
  if (timeString === undefined || timeString === null || timeString === '') return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

export default function EditHabitScreen({ route, navigation }: any) {
  const { habit } = route.params;
  const { showAlert } = useContext(AlertContext);

  const [title, setTitle] = useState(habit.title);
  const [duration, setDuration] = useState(habit.duration ? habit.duration.toString() : '30');
  const [difficulty, setDifficulty] = useState(habit.difficulty || 'Medium');
  
  const [scheduledTime, setScheduledTime] = useState(habit.scheduledTime || '');
  const [showPicker, setShowPicker] = useState(false);
  
  // ⭐ Add state for the physical alarm
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const difficulties = ["Easy", "Medium", "Hard"];

  const handleUpdateHabit = async () => {
    if (!title.trim()) return showAlert("Hold up!", "Habit title cannot be empty.", "✋");

    setLoading(true);
    try {
      if (scheduledTime) {
        const newStart = timeToMins(scheduledTime);
        
        if (newStart !== null) {
            const [dashResponse, schedResponse] = await Promise.all([
                api.get('/dashboard').catch(() => ({ data: { habits: [] } })),
                api.get('/schedule').catch(() => ({ data: null }))
            ]);
            
            const existingHabits = dashResponse.data?.habits || [];
            const schedule = schedResponse.data;

            const newEnd = newStart + parseInt(duration);
            const BUFFER = 10; 
            
            const blockedMins: any[] = [];

            if (schedule) {
                if (schedule.wakeUpTime) {
                    const wakeMins = timeToMins(schedule.wakeUpTime);
                    if (wakeMins !== null) {
                        blockedMins.push({ start: 0, end: wakeMins + BUFFER, title: `Wake Up Time (${schedule.wakeUpTime})`, type: 'boundary' });
                    }
                }
                
                if (schedule.sleepTime) {
                    let sleepMins = timeToMins(schedule.sleepTime);
                    if (sleepMins !== null) {
                        if (sleepMins === 0) {
                            sleepMins = 1440; 
                        }
                        blockedMins.push({ start: sleepMins - BUFFER, end: 1440, title: `Sleep Time (${schedule.sleepTime})`, type: 'boundary' });
                    }
                }
                
                if (schedule.busySlots && schedule.busySlots.length > 0) {
                    schedule.busySlots.forEach((slot: any) => {
                        const startMins = timeToMins(slot.start);
                        const endMins = timeToMins(slot.end);
                        if (startMins !== null && endMins !== null) {
                            blockedMins.push({
                                start: startMins - BUFFER,
                                end: endMins + BUFFER,
                                title: `Busy Block`,
                                type: 'busy slot'
                            });
                        }
                    });
                }
            }

            existingHabits.forEach((h: any) => {
              if (h._id === habit._id || !h.scheduledTime) return; 
              const hStart = timeToMins(h.scheduledTime);
              if (hStart !== null) {
                  blockedMins.push({ 
                      start: hStart - BUFFER, 
                      end: hStart + (h.duration || 30) + BUFFER, 
                      title: h.title, 
                      type: 'habit' 
                  });
              }
            });

            const conflictingSlot = blockedMins.find((slot) => {
              return (newStart < slot.end) && (newEnd > slot.start);
            });

            if (conflictingSlot) {
              setLoading(false);
              return showAlert(
                "Slot Unavailable", 
                `This conflicts with your ${conflictingSlot.type} "${conflictingSlot.title}".\n\nRemember, you must have at least a 10-minute buffer between tasks, wake times, and sleep times!`, 
                "⚠️"
              );
            }
        }
      }

      await api.put(`/habits/${habit._id}`, {
        title,
        difficulty,
        duration: parseInt(duration),
        scheduledTime 
      });

      let alarmMessage = "";

      if (scheduledTime) {
        await scheduleTaskReminders(habit._id, title, scheduledTime);
        
        // ⭐ Trigger the physical alarm if the switch is ON
        if (alarmEnabled) {
            await setNativeRepeatingAlarm(scheduledTime, title);
            alarmMessage = "\n\n⏰ Physical Alarm activated! (Note: If you need to turn off or remove this alarm later, please manage it directly in your phone's Clock app).";
        }
      }

      // ⭐ Display the updated modal message
      showAlert("Success", `Habit updated successfully.${alarmMessage}`, "✅");
      navigation.goBack(); 
    } catch (error: any) {
      showAlert("Error", error.response?.data?.message || "Failed to update habit.", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHabit = () => {
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
      true 
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

      {/* ⭐ New Physical Alarm Toggle */}
      <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.label}>Physical Alarm 🔔</Text>
              <Text style={styles.helperText}>Rings loudly in your native clock app</Text>
          </View>
          <Switch 
              value={alarmEnabled} 
              onValueChange={setAlarmEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
          />
      </View>

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
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 20 },

  primaryButton: { backgroundColor: Colors.success, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 40 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  deleteButton: { backgroundColor: 'transparent', borderColor: Colors.error, borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  deleteButtonText: { color: Colors.error, fontSize: 18, fontWeight: 'bold' }
});