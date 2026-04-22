// Convert "HH:mm" to total minutes (e.g., "07:00" -> 420)
const timeToMins = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// Convert total minutes back to "HH:mm" (e.g., 420 -> "07:00")
const minsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const findAvailableTime = (schedule, preferredTime, existingHabits = [], newDuration = 30, timeWindow = null) => {
  const { wakeUpTime, sleepTime, busySlots } = schedule;
  
  // ⭐ The universal breathing room
  const BUFFER = 10; 

  // 1️⃣ Pad busy slots with 10 mins before and after
  let blockedMins = busySlots.map(slot => ({
    start: timeToMins(slot.start) - BUFFER,
    end: timeToMins(slot.end) + BUFFER
  }));
  
  // 2️⃣ Pad existing habits with 10 mins before and after
  if (existingHabits.length > 0) {
    existingHabits.forEach(habit => {
      if (habit.scheduledTime) {
        const startMin = timeToMins(habit.scheduledTime);
        blockedMins.push({
          start: startMin - BUFFER,
          end: startMin + (habit.duration || 30) + BUFFER
        });
      }
    });
  }

  // Sort chronologically
  blockedMins.sort((a, b) => a.start - b.start);

  // 3️⃣ Apply buffer to the start and end of the waking day
  let searchStart = timeToMins(wakeUpTime) + BUFFER;
  let searchEnd = timeToMins(sleepTime) - BUFFER;

  // 4️⃣ Apply custom time window bounds
  if (timeWindow && timeWindow.start && timeWindow.end) {
     const twStart = timeToMins(timeWindow.start);
     const twEnd = timeToMins(timeWindow.end);
     
     // Keep the user's requested window, but ensure it doesn't bypass the wake/sleep buffer
     searchStart = Math.max(searchStart, twStart);
     searchEnd = Math.min(searchEnd, twEnd);
  }
  // Fallback to general preference
  else if (preferredTime === 'Morning') { 
    searchStart = Math.max(searchStart, timeToMins(wakeUpTime) + BUFFER); 
    searchEnd = Math.min(searchEnd, timeToMins('11:59')); 
  } else if (preferredTime === 'Afternoon') { 
    searchStart = Math.max(searchStart, timeToMins('12:00')); 
    searchEnd = Math.min(searchEnd, timeToMins('16:59')); 
  } else if (preferredTime === 'Evening') { 
    searchStart = Math.max(searchStart, timeToMins('17:00')); 
    searchEnd = Math.min(searchEnd, timeToMins(sleepTime) - BUFFER); 
  }

  let currentMins = searchStart;

  // Scan for gaps
  for (let slot of blockedMins) {
    if (currentMins < slot.start && (currentMins + newDuration) <= slot.start) {
      return minsToTime(currentMins);
    }
    if (currentMins >= slot.start && currentMins < slot.end) {
      currentMins = slot.end;
    } else if (slot.end > currentMins) {
      currentMins = slot.end;
    }
  }

  if ((currentMins + newDuration) <= searchEnd) {
    return minsToTime(currentMins);
  }

  // Final Fallback: Find ANY free slot today (still respecting the 10 min buffers!)
  currentMins = timeToMins(wakeUpTime) + BUFFER;
  for (let slot of blockedMins) {
    if (currentMins < slot.start && (currentMins + newDuration) <= slot.start) {
      return minsToTime(currentMins);
    }
    if (slot.end > currentMins) currentMins = slot.end;
  }

  return minsToTime(currentMins); 
};

module.exports = { findAvailableTime };