// src/lib/anomaly-detector.ts
// Simple rule-based anomaly detection
export const detectAttendanceAnomaly = (studentId: string, sessionId: string): { isAnomaly: boolean; reason?: string } => {
  // Logic: Check if student has checked in too many times or in suspicious intervals
  // For now: Placeholder logic
  if (!studentId || studentId.length < 5) {
    return { isAnomaly: true, reason: 'INVALID_STUDENT_ID_FORMAT' };
  }
  return { isAnomaly: false };
};
