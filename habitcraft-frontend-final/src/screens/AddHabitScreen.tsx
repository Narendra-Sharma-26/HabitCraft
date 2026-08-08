import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Keyboard } from 'react-native';
import api from '../api/axiosConfig';
import { Colors } from '../theme/Colors';
import { AlertContext } from '../context/AlertContext'; 
import { scheduleTaskReminders } from '../services/NotificationService'; 

const HABIT_SUGGESTIONS = [
  "Drink 2 Liters of Water", "Hit 10,000 Steps", "30 Minutes of Exercise", "Sleep for 8 Hours",
  "Morning Stretching", "No Sugar Today", "Eat a Healthy Breakfast", "Wake Up at 6:00 AM",
  "Read 10 Pages of a Book", "Plan the Day Ahead", "Practice Java for 30 Mins", "Deep Work for 2 Hours",
  "Solve 1 Coding Problem", "Review Daily Goals", "Clear Email Inbox", "10 Minutes of Meditation",
  "Write in a Gratitude Journal", "No Screens 1 Hour Before Bed", "Go for a Nature Walk",
  "Daily Breathing Exercises", "Learn a New Language (15 Mins)", "Practice Handwriting for 15 Mins",
  "Work on Side Project", "Listen to an Educational Podcast", "Read Industry Articles",
  "Make the Bed", "Track Daily Expenses", "15-Minute Room Tidy", "Pack Bag for Tomorrow",
  "Cook a Home Meal"
];

export default function AddHabitScreen({ navigation }: any) {
  const { showAlert } = useContext(AlertContext);

  const [title, setTitle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [difficulty, setDifficulty] = useState('Medium');
  const [preferredTime, setPreferredTime] = useState('Morning');
  
  const [selectedDurationChip, setSelectedDurationChip] = useState<number | 'Custom'>(30);
  const [customDuration, setCustomDuration] = useState(''); 
  const [loading, setLoading] = useState(false);

  const difficulties = ["Easy", "Medium", "Hard"];
  const times = ["Morning", "Afternoon", "Evening"];
  const durationOptions: (number | 'Custom')[] = [30, 60, 'Custom'];

  const filteredSuggestions = HABIT_SUGGESTIONS.filter(h => 
    h.toLowerCase().includes(title.toLowerCase())
  );

  const isDropdownVisible = showSuggestions && filteredSuggestions.length > 0;

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
      
      const createdHabit = response.data.habit || response.data;

      if (createdHabit && createdHabit.scheduledTime) {
         try {
             await scheduleTaskReminders(createdHabit._id, title, createdHabit.scheduledTime);
         } catch (scheduleError) {
             console.error("Habit saved, but failed to schedule reminder:", scheduleError);
         }
      }

      showAlert("Success", "Habit created successfully! \n\nNote: Alarms can be set while editing the habit. Tap on the habit from your list to edit and set an alarm.", "✅");
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
          style={[styles.chip, selectedValue === option ? styles.chipSelected : null]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.chipText, selectedValue === option ? styles.chipTextSelected : null]}>
            {option === 'Custom' ? 'Custom' : (typeof option === 'number' ? `${option} min` : option)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={{ paddingBottom: 40 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
        >
        <View style={styles.header}>
            <View style={{ width: 80 }} />
            <Text style={styles.headerTitle}>New Habit</Text>
            <View style={{ width: 80 }} /> 
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>What do you want to build?</Text>
            <View style={{ zIndex: 10, position: 'relative' }}>
                <TextInput 
                    style={[
                      styles.input, 
                      { paddingRight: 45 }, // Prevents text from overlapping the clear button
                      isDropdownVisible ? styles.inputWithDropdownOpen : null
                    ]} 
                    placeholder="e.g., Read 10 pages, Gym..." 
                    placeholderTextColor={Colors.textMuted}
                    value={title}
                    onChangeText={(text) => {
                      setTitle(text);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onPressIn={() => setShowSuggestions(true)} 
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                />
                
                {/* ⭐ NEW: Clear Button conditionally rendered when there is text */}
                {title.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={() => {
                      setTitle('');
                      setShowSuggestions(false); // Optionally hide dropdown when cleared
                    }}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
                
                {isDropdownVisible ? (
                  <ScrollView 
                    style={styles.suggestionsContainer} 
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredSuggestions.map((suggestion, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={[
                          styles.suggestionItem, 
                          index === filteredSuggestions.length - 1 ? { borderBottomWidth: 0 } : null
                        ]} 
                        onPress={() => { 
                          setTitle(suggestion); 
                          setShowSuggestions(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
            </View>
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>Duration</Text>
            {renderChips(durationOptions, selectedDurationChip, setSelectedDurationChip)}
            
            {selectedDurationChip === 'Custom' ? (
                <TextInput 
                style={[styles.input, { marginTop: 15 }]} 
                placeholder="Enter total minutes (e.g., 120)" 
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric" 
                value={customDuration}
                onChangeText={setCustomDuration}
                />
            ) : null}
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

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 25 },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold' },
  
  cardSection: { backgroundColor: Colors.card, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border, zIndex: 1 },
  label: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  helperText: { color: Colors.textMuted, fontSize: 13, marginBottom: 15, marginTop: -8 },
  
  input: { backgroundColor: Colors.background, color: Colors.text, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  
  inputWithDropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  
  // ⭐ NEW: Clear button styles
  clearButton: {
    position: 'absolute',
    right: 15,
    top: 15, // Aligns perfectly with the 15px padding of the TextInput
    zIndex: 20,
    padding: 2, // Gives a slightly larger touch target area
  },
  clearButtonText: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
  },

  suggestionsContainer: { 
    backgroundColor: Colors.background, 
    borderBottomLeftRadius: 12, 
    borderBottomRightRadius: 12,
    borderWidth: 1, 
    borderTopWidth: 0,
    borderColor: Colors.border, 
    maxHeight: 180, 
  },
  suggestionItem: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  suggestionText: { 
    color: Colors.text, 
    fontSize: 15 
  },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: Colors.background, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: 'bold', fontSize: 14 },
  chipTextSelected: { color: '#FFF' },
  
  primaryButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  cancelButton: { backgroundColor: Colors.card, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: Colors.error },
  cancelButtonText: { color: Colors.error, fontSize: 18, fontWeight: 'bold' }
});