import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Keyboard } from 'react-native';
import api from '../api/axiosConfig';
import { AlertContext } from '../context/AlertContext'; 
import { ThemeContext } from '../context/ThemeContext';
import { scheduleTaskReminders } from '../services/NotificationService'; 
import EmojiPicker from 'rn-emoji-keyboard'; // ⭐ Imported the library

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
  const { colors } = useContext(ThemeContext);
  const styles = getStyles(colors);

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false); // ⭐ State for the modal

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
        title, icon, difficulty, preferredTime, duration: finalDuration 
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10, position: 'relative' }}>
                
                {/* ⭐ FIX: Changed to a TouchableOpacity that opens the modal */}
                <TouchableOpacity 
                  style={styles.iconInput}
                  onPress={() => setIsEmojiPickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
                
                <View style={{ flex: 1 }}>
                    <TextInput 
                        style={[
                          styles.input, 
                          { paddingRight: 45 }, 
                          isDropdownVisible ? styles.inputWithDropdownOpen : null
                        ]} 
                        placeholder="e.g., Read 10 pages, Gym..." 
                        placeholderTextColor={colors.textMuted}
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
                    
                    {title.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton} 
                        onPress={() => {
                          setTitle('');
                          setShowSuggestions(false); 
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
        </View>

        <View style={styles.cardSection}>
            <Text style={styles.label}>Duration</Text>
            {renderChips(durationOptions, selectedDurationChip, setSelectedDurationChip)}
            
            {selectedDurationChip === 'Custom' ? (
                <TextInput 
                style={[styles.input, { marginTop: 15 }]} 
                placeholder="Enter total minutes (e.g., 120)" 
                placeholderTextColor={colors.textMuted}
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

        {/* ⭐ NEW: The actual Emoji Picker modal */}
        <EmojiPicker
          open={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          onEmojiSelected={(emojiObject) => {
            setIcon(emojiObject.emoji);
            setIsEmojiPickerOpen(false);
          }}
          enableSearchBar={true}
          theme={{
            backdrop: 'rgba(0,0,0,0.6)',
            knob: colors.primary,
            container: colors.card,
            header: colors.text,
            skinTonesContainer: colors.card,
            search: {
              background: colors.background,
              text: colors.text,
              placeholder: colors.textMuted,
            },
          }}
        />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 25 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  
  cardSection: { backgroundColor: colors.card, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: colors.border, zIndex: 1 },
  label: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  helperText: { color: colors.textMuted, fontSize: 13, marginBottom: 15, marginTop: -8 },
  
  input: { backgroundColor: colors.background, color: colors.text, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  
  // ⭐ FIX: Updated to align perfectly as a button
  iconInput: { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginRight: 10, height: 56, width: 56 },

  inputWithDropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  
  clearButton: {
    position: 'absolute',
    right: 15,
    top: 15, 
    zIndex: 20,
    padding: 2, 
  },
  clearButtonText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
  },

  suggestionsContainer: { 
    backgroundColor: colors.background, 
    borderBottomLeftRadius: 12, 
    borderBottomRightRadius: 12,
    borderWidth: 1, 
    borderTopWidth: 0,
    borderColor: colors.border, 
    maxHeight: 180, 
  },
  suggestionItem: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  suggestionText: { 
    color: colors.text, 
    fontSize: 15 
  },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: colors.background, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: 'bold', fontSize: 14 },
  chipTextSelected: { color: '#FFF' },
  
  primaryButton: { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  cancelButton: { backgroundColor: colors.card, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: colors.error },
  cancelButtonText: { color: colors.error, fontSize: 18, fontWeight: 'bold' }
});