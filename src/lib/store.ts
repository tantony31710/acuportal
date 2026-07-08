import { create } from 'zustand';

interface AppStore {
  // Restore basic app state interface
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

interface AttendanceStore {
  attendanceLogs: any[];
  setAttendanceLogs: (logs: any[]) => void;
  addLog: (log: any) => void;
}

export const useAttendanceStore = create<AttendanceStore>((set) => ({
  attendanceLogs: [],
  setAttendanceLogs: (logs) => set({ attendanceLogs: logs }),
  addLog: (log) => set((state) => ({ attendanceLogs: [...state.attendanceLogs, log] })),
}));
