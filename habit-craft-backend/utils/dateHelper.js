// Returns IST date string "YYYY-MM-DD"
const getTodayIST = () => {
  const now = new Date();

  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms
  const istTime = new Date(now.getTime() + istOffset);

  return istTime.toISOString().split("T")[0];
};

// Get IST date N days ago
const getPastISTDate = (daysAgo) => {
  const now = new Date();

  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  istTime.setDate(istTime.getDate() - daysAgo);

  return istTime.toISOString().split("T")[0];
};

module.exports = { getTodayIST, getPastISTDate };