import { create } from 'zustand';

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
