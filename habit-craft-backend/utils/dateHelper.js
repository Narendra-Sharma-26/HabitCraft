
// Returns IST date string "YYYY-MM-DD" safely using math, bypassing server ICU limitations
const getTodayIST = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().split("T")[0];
};

// Get IST date N days ago
const getPastISTDate = (daysAgo) => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  // Use UTC methods to prevent daylight saving time jumps from affecting the string
  istTime.setUTCDate(istTime.getUTCDate() - daysAgo);
  return istTime.toISOString().split("T")[0];
};

module.exports = { getTodayIST, getPastISTDate };







// ========================================================================================

// // Returns IST date string "YYYY-MM-DD" safely without manual offsets
// const getTodayIST = () => {
//   return new Intl.DateTimeFormat('en-CA', { 
//     timeZone: 'Asia/Kolkata', 
//     year: 'numeric', 
//     month: '2-digit', 
//     day: '2-digit' 
//   }).format(new Date());
// };

// // Get IST date N days ago safely
// const getPastISTDate = (daysAgo) => {
//   const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
//   return new Intl.DateTimeFormat('en-CA', { 
//     timeZone: 'Asia/Kolkata', 
//     year: 'numeric', 
//     month: '2-digit', 
//     day: '2-digit' 
//   }).format(pastDate);
// };

// module.exports = { getTodayIST, getPastISTDate };


// ==================================================

// // Returns IST date string "YYYY-MM-DD"
// const getTodayIST = () => {
//   const now = new Date();

//   const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms
//   const istTime = new Date(now.getTime() + istOffset);

//   return istTime.toISOString().split("T")[0];
// };

// // Get IST date N days ago
// const getPastISTDate = (daysAgo) => {
//   const now = new Date();

//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const istTime = new Date(now.getTime() + istOffset);

//   istTime.setDate(istTime.getDate() - daysAgo);

//   return istTime.toISOString().split("T")[0];
// };

// module.exports = { getTodayIST, getPastISTDate };