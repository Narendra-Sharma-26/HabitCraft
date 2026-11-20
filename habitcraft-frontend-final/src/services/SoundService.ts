import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_STORAGE_KEY = '@habitcraft_celebration_sound_enabled';

// Sound files pool
// Put your mp3/wav files in assets/sounds/
const SOUND_FILES = [
  require('../../assets/sounds/sound1.mp3'),
  require('../../assets/sounds/sound2.mp3'),
  require('../../assets/sounds/sound3.mp3'),
];

let currentSound: Audio.Sound | null = null;

export const isCelebrationSoundEnabled = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(SOUND_STORAGE_KEY);
    // Enabled by default if not set
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const setCelebrationSoundEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.log('Error saving sound preference:', error);
  }
};

export const playRandomCelebrationSound = async () => {
  try {
    // Check if user enabled the sound in Profile
    const enabled = await isCelebrationSoundEnabled();
    if (!enabled) return;

    // Unload any previously playing sound
    if (currentSound) {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }

    if (!SOUND_FILES || SOUND_FILES.length === 0) return;

    // Pick a random sound from the list
    const randomIndex = Math.floor(Math.random() * SOUND_FILES.length);
    const selectedSound = SOUND_FILES[randomIndex];

    // Ensure audio mode is set correctly for playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      selectedSound,
      { shouldPlay: true, volume: 1.0 }
    );

    currentSound = sound;

    // Clean up memory after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) {
          currentSound = null;
        }
      }
    });
  } catch (error) {
    console.log('Error playing celebration sound:', error);
  }
};
