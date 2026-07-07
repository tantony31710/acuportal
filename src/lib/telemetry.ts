// src/lib/telemetry.ts
export const logEvent = (eventName: string, data: Record<string, any>) => {
  console.log(`[Telemetry][${eventName}]`, JSON.stringify(data));
  // Future: Send to Supabase or external analytics
};
