// Convert "HH:mm" to total minutes (e.g., "07:00" -> 420)
const timeToMins = (timeString) => {
  if (timeString === undefined || timeString === null || timeString === '') return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
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

  // ⭐ Safely parse wake and sleep boundaries
  let wakeMins = timeToMins(wakeUpTime) || 0;
  let sleepMins = timeToMins(sleepTime);
  
  // ⭐ THE FIX: If sleep time is 00:00, it represents the end of the day (1440 mins)
  if (sleepMins === 0) sleepMins = 1440; 

  // 1️⃣ Pad busy slots with 10 mins before and after
  let blockedMins = busySlots.map(slot => {
    let startMins = timeToMins(slot.start) || 0;
    let endMins = timeToMins(slot.end);
    
    // ⭐ THE FIX: Also apply midnight edge case to busy blocks
    if (endMins === 0) endMins = 1440; 
    
    return {
      start: startMins - BUFFER,
      end: endMins + BUFFER
    };
  });
  
  // 2️⃣ Pad existing habits with 10 mins before and after
  if (existingHabits.length > 0) {
    existingHabits.forEach(habit => {
      if (habit.scheduledTime) {
        const startMin = timeToMins(habit.scheduledTime);
        if (startMin !== null) {
            blockedMins.push({
            start: startMin - BUFFER,
            end: startMin + (habit.duration || 30) + BUFFER
            });
        }
      }
    });
  }

  // Sort chronologically
  blockedMins.sort((a, b) => a.start - b.start);

  // 3️⃣ Apply buffer to the start and end of the waking day
  let searchStart = wakeMins + BUFFER;
  let searchEnd = sleepMins - BUFFER;

  // 4️⃣ Apply custom time window bounds
  if (timeWindow && timeWindow.start && timeWindow.end) {
     let twStart = timeToMins(timeWindow.start) || 0;
     let twEnd = timeToMins(timeWindow.end);
     
     // ⭐ THE FIX: Apply midnight edge case to custom time windows
     if (twEnd === 0) twEnd = 1440; 
     
     // Keep the user's requested window, but ensure it doesn't bypass the wake/sleep buffer
     searchStart = Math.max(searchStart, twStart);
     searchEnd = Math.min(searchEnd, twEnd);
  }
  // Fallback to general preference
  else if (preferredTime === 'Morning') { 
    searchStart = Math.max(searchStart, wakeMins + BUFFER); 
    searchEnd = Math.min(searchEnd, timeToMins('11:59')); 
  } else if (preferredTime === 'Afternoon') { 
    searchStart = Math.max(searchStart, timeToMins('12:00')); 
    searchEnd = Math.min(searchEnd, timeToMins('16:59')); 
  } else if (preferredTime === 'Evening') { 
    searchStart = Math.max(searchStart, timeToMins('17:00')); 
    searchEnd = Math.min(searchEnd, sleepMins - BUFFER); 
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
  currentMins = wakeMins + BUFFER;
  for (let slot of blockedMins) {
    if (currentMins < slot.start && (currentMins + newDuration) <= slot.start) {
      return minsToTime(currentMins);
    }
    if (slot.end > currentMins) currentMins = slot.end;
  }

  return minsToTime(currentMins); 
};

module.exports = { findAvailableTime };