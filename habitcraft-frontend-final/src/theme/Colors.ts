// theme/Colors.ts

export const Palette = {
  dark: {
    background: '#070913',  // Very deep blue-tinted black
    card: '#121526',        // Rich navy-toned cards for depth
    primary: '#6C63FF',     // Your brand purple
    secondary: '#00E5FF',   // Brighter neon cyan
    accent: '#FFC837',      // Warmer, punchy gold
    text: '#FFFFFF',        // Pure white for high contrast
    textMuted: '#8F9BB3',   // Cool-toned slate grey
    border: '#1F243D',      // Distinct border to separate cards
    error: '#FF4C4C',       // Vibrant alert red
    success: '#00E676',     // Bright neon green
  },
  light: {
    background: '#F8FAFC',  // Crisp off-white to eliminate eye strain
    card: '#FFFFFF',        // Pure white card surfaces
    primary: '#6C63FF',     // Primary brand purple
    secondary: '#0284C7',   // Slate sky blue
    accent: '#D97706',      // Energetic streak amber
    text: '#0F172A',        // Deep charcoal for crisp typography
    textMuted: '#64748B',   // Readable slate muted text
    border: '#E2E8F0',      // Soft border dividers
    error: '#EF4444',       // Soft warning red
    success: '#16A34A',     // Deep success green
  }
};

export const Colors = Palette.dark;