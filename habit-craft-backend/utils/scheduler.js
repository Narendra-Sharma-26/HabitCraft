// Simple scheduling helper

const isTimeWithinRange = (time, start, end) => {
  return time >= start && time <= end;
};

const findAvailableTime = (schedule, preferredTime) => {
  const { wakeUpTime, sleepTime, busySlots } = schedule;

  // 1️⃣ If preferred time exists, validate it
  if (preferredTime) {
    const isBusy = busySlots.some(slot =>
      isTimeWithinRange(preferredTime, slot.start, slot.end)
    );

    if (!isBusy && isTimeWithinRange(preferredTime, wakeUpTime, sleepTime)) {
      return preferredTime;
    }
  }

  // 2️⃣ Find first free slot after wake up
  let currentTime = wakeUpTime;

  for (let slot of busySlots) {
    if (currentTime < slot.start) {
      return currentTime;
    }
    currentTime = slot.end;
  }

  // 3️⃣ If nothing found, return wakeUpTime
  return wakeUpTime;
};

module.exports = { findAvailableTime };
