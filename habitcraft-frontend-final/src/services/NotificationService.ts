import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ⭐ Forces notifications to show even if the app is currently open on the screen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any), // <-- This safely bypasses the strict Expo version type-check
});

// 1. Request Permission from the OS
export const requestNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

// 2. Schedule the 10-Min and 1-Min Reminders
export const scheduleTaskReminders = async (taskTitle: string, timeString: string) => {
  // Assume timeString is in "HH:MM" 24-hour format (e.g., "14:30")
  const [hourStr, minuteStr] = timeString.split(':');
  let taskHour = parseInt(hourStr, 10);
  let taskMinute = parseInt(minuteStr, 10);

  // Helper function to calculate exact reminder times
  const calculateReminderTime = (h: number, m: number, minutesToSubtract: number) => {
    let newMinute = m - minutesToSubtract;
    let newHour = h;
    if (newMinute < 0) {
      newMinute += 60;
      newHour -= 1;
    }
    if (newHour < 0) {
      newHour += 24;
    }
    return { hour: newHour, minute: newMinute };
  };

  const tenMinBefore = calculateReminderTime(taskHour, taskMinute, 10);
  const oneMinBefore = calculateReminderTime(taskHour, taskMinute, 1);

  // Cancel any existing notifications for this specific task to prevent duplicates
  // (Optional: You can implement identifier tracking if you allow task editing)

  // ⏰ Schedule 10 Minutes Before (Pre-Commitment)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Get Ready! ⏳",
      body: `Your task "${taskTitle}" starts in 10 minutes. Time to transition.`,
      sound: true,
    },
    trigger: {
      hour: tenMinBefore.hour,
      minute: tenMinBefore.minute,
      repeats: true, 
    } as any, // <-- Safely bypasses the strict Expo trigger type-check
  });

  // ⏰ Schedule 1 Minute Before (Execution)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${taskTitle} 🚀`,
      body: "Let's get to work. Start building that discipline right now.",
      sound: true,
    },
    trigger: {
      hour: oneMinBefore.hour,
      minute: oneMinBefore.minute,
      repeats: true,
    } as any, // <-- Safely bypasses the strict Expo trigger type-check
  });

  console.log(`Scheduled reminders for ${taskTitle} at ${tenMinBefore.hour}:${tenMinBefore.minute} and ${oneMinBefore.hour}:${oneMinBefore.minute}`);
};

// 3. Clear All Notifications (Used when logging out)
export const cancelAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};