import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { PieChart } from 'react-native-chart-kit';
import { AlertContext } from '../context/AlertContext';

const screenWidth = Dimensions.get('window').width;

const HABIT_COLORS = ['#6C63FF', '#4CAF50', '#FFD700', '#00D0FF', '#FF9F43', '#9b59b6', '#e84393'];

const timeToMins = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const dateToHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const hhmmToDate = (timeStr: string) => {
  if (!timeStr) return new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
};

export default function ScheduleScreen({ route, navigation }: any) {
  const isSetup = route?.params?.isSetup || false; 
  const { showAlert } = useContext(AlertContext);

  const [wakeUpTime, setWakeUpTime] = useState('06:00');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [busySlots, setBusySlots] = useState<{start: string, end: string}[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showPicker, setShowPicker] = useState<{
    type: 'wake' | 'sleep' | 'busyStart' | 'busyEnd', 
    index?: number 
  } | null>(null);

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const [schedRes, habRes] = await Promise.all([
          api.get('/schedule').catch(() => null), 
          api.get('/habits').catch(() => null)
        ]);

        if (schedRes && schedRes.data) {
          setWakeUpTime(schedRes.data.wakeUpTime || '06:00');
          setSleepTime(schedRes.data.sleepTime || '22:00');
          setBusySlots(schedRes.data.busySlots || []);
        }

        if (habRes && habRes.data) {
          setHabits(habRes.data.habits || []);
        }
      } catch (error) {
        console.error("Error loading schedule data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleData();
  }, []);

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const response = await api.post('/schedule', {
        wakeUpTime,
        sleepTime,
        busySlots,
        timezone: "Asia/Kolkata"
      });

      setWakeUpTime(response.data.schedule.wakeUpTime);
      setSleepTime(response.data.schedule.sleepTime);
      setBusySlots(response.data.schedule.busySlots);

      const habRes = await api.get('/habits');
      setHabits(habRes.data.habits || []);

      if (isSetup) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }], 
        });
      } else {
        showAlert("Success", "Schedule updated and habits realigned!", "✅");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      showAlert("Error", error.response?.data?.message || "Could not save schedule.", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  // ⭐ THE UX FIX: Smart default times so blocks don't perfectly overlap
  const addBusySlot = () => {
    if (busySlots.length > 0) {
      const lastSlot = busySlots[busySlots.length - 1];
      // Default to starting exactly when the last slot ended
      setBusySlots([...busySlots, { start: lastSlot.end, end: '19:00' }]);
    } else {
      setBusySlots([...busySlots, { start: '09:00', end: '17:00' }]);
    }
  };

  const removeBusySlot = (index: number) => {
    const newSlots = [...busySlots];
    newSlots.splice(index, 1);
    setBusySlots(newSlots);
  };

  const updateBusySlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...busySlots];
    newSlots[index][field] = value;
    setBusySlots(newSlots);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (event.type === 'dismissed' || !selectedDate) {
        setShowPicker(null);
        return;
    }

    const timeStr = dateToHHMM(selectedDate);
    
    if (showPicker?.type === 'wake') setWakeUpTime(timeStr);
    else if (showPicker?.type === 'sleep') setSleepTime(timeStr);
    else if (showPicker?.type === 'busyStart' && showPicker.index !== undefined) {
      updateBusySlot(showPicker.index, 'start', timeStr);
    }
    else if (showPicker?.type === 'busyEnd' && showPicker.index !== undefined) {
      updateBusySlot(showPicker.index, 'end', timeStr);
    }

    if (Platform.OS === 'ios') setShowPicker(null);
  };

  const getPickerDate = () => {
    if (!showPicker) return new Date();
    if (showPicker.type === 'wake') return hhmmToDate(wakeUpTime);
    if (showPicker.type === 'sleep') return hhmmToDate(sleepTime);
    if (showPicker.type === 'busyStart') return hhmmToDate(busySlots[showPicker.index!].start);
    if (showPicker.type === 'busyEnd') return hhmmToDate(busySlots[showPicker.index!].end);
    return new Date();
  };

  const generateChartData = () => {
    const wakeMins = timeToMins(wakeUpTime);
    const sleepMins = timeToMins(sleepTime);
    
    let sleepDuration = sleepMins > wakeMins ? 1440 - (sleepMins - wakeMins) : wakeMins - sleepMins;
    
    const chartData = [{
      name: `Sleep`,
      minutes: sleepDuration,
      color: '#2c3e50',
      legendFontColor: Colors.textMuted,
      legendFontSize: 12,
    }];

    // ⭐ THE MATH FIX: Interval Merging Algorithm
    let intervals = busySlots
      .map(slot => [timeToMins(slot.start), timeToMins(slot.end)])
      .filter(interval => interval[1] > interval[0]) // Ignore invalid backwards times
      .sort((a, b) => a[0] - b[0]); // Sort chronologically

    let totalBusyMins = 0;
    if (intervals.length > 0) {
      let merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
        let last = merged[merged.length - 1];
        let curr = intervals[i];
        
        if (curr[0] <= last[1]) {
          // Intervals overlap! Combine them into one solid block.
          last[1] = Math.max(last[1], curr[1]);
        } else {
          // No overlap, add as a new block.
          merged.push(curr);
        }
      }
      
      // Tally up the completely unique, merged minutes
      totalBusyMins = merged.reduce((sum, int) => sum + (int[1] - int[0]), 0);
    }

    if (totalBusyMins > 0) {
      chartData.push({
        name: `Busy`,
        minutes: totalBusyMins,
        color: '#e74c3c',
        legendFontColor: Colors.textMuted,
        legendFontSize: 12,
      });
    }

    habits.forEach((habit, index) => {
      if (habit.scheduledTime) {
        chartData.push({
          name: habit.title,
          minutes: habit.duration || 30,
          color: HABIT_COLORS[index % HABIT_COLORS.length],
          legendFontColor: Colors.textMuted,
          legendFontSize: 12,
        });
      }
    });

    const usedMinutes = chartData.reduce((total, item) => total + item.minutes, 0);
    const freeMinutes = 1440 - usedMinutes;

    if (freeMinutes > 0) {
      chartData.push({
        name: `Free Time`,
        minutes: freeMinutes,
        color: '#FFFFFF', 
        legendFontColor: Colors.textMuted,
        legendFontSize: 12,
      });
    }

    return chartData;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={styles.header}>
        {!isSetup ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}> Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        
        <Text style={styles.headerTitle}>{isSetup ? "Setup Routine" : "Daily Schedule"}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.chartContainer}>
        <PieChart
          data={generateChartData()}
          width={screenWidth - 40}
          height={200}
          chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
          accessor={"minutes"}
          backgroundColor={"transparent"}
          paddingLeft={"10"}
          center={[0, 0]}
          absolute={false}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Wake Up Time</Text>
        <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowPicker({ type: 'wake' })}>
          <Text style={styles.timeText}>☀️ {wakeUpTime}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Sleep Time</Text>
        <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowPicker({ type: 'sleep' })}>
          <Text style={styles.timeText}>🌙 {sleepTime}</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20 }]}>Busy Blocks</Text>
        {busySlots.map((slot, index) => (
          <View key={index} style={styles.busySlotRow}>
            
            <TouchableOpacity style={styles.timePickerHalf} onPress={() => setShowPicker({ type: 'busyStart', index })}>
              <Text style={styles.timeSubtext}>Start</Text>
              <Text style={styles.timeText}>{slot.start}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.timePickerHalf} onPress={() => setShowPicker({ type: 'busyEnd', index })}>
              <Text style={styles.timeSubtext}>End</Text>
              <Text style={styles.timeText}>{slot.end}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => removeBusySlot(index)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addBusySlot}>
          <Text style={styles.addButtonText}>+ Add Busy Block</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSchedule} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{isSetup ? "Save & Enter App" : "Save & Realign Habits"}</Text>}
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={getPickerDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 20 },
  backBtn: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  chartContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: Colors.card, borderRadius: 15, paddingVertical: 15 },
  formSection: { marginTop: 10 },
  label: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
  
  timePickerButton: { backgroundColor: Colors.card, padding: 15, borderRadius: 10, alignItems: 'center' },
  timePickerHalf: { backgroundColor: Colors.card, padding: 12, borderRadius: 10, flex: 1, marginRight: 10, alignItems: 'center' },
  timeText: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  timeSubtext: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },

  busySlotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  deleteBtn: { backgroundColor: 'rgba(255, 107, 107, 0.2)', padding: 15, borderRadius: 10, justifyContent: 'center' },
  deleteBtnText: { color: Colors.error, fontWeight: 'bold', fontSize: 16 },
  addButton: { padding: 15, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  addButtonText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: Colors.success, padding: 18, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});