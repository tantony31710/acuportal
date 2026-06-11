export function formatCountdown(endsAt: number): string {
  const ms = Math.max(0, endsAt - Date.now());
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}