import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: true, // Default to dark mode
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
}));
