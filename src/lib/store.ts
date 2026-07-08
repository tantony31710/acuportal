import { create } from 'zustand';

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  userRole: 'teacher' | 'student' | 'admin' | null;
  setUserRole: (role: 'teacher' | 'student' | 'admin' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  userRole: null,
  setUserRole: (role) => set({ userRole: role }),
}));
