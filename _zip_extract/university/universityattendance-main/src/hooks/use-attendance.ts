import { useEffect, useState } from "react";

/** Subscribe to attendance store updates and re-render every second for countdowns. */
export function useAttendanceTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const bump = () => set((n) => n + 1);
    window.addEventListener("ap:update", bump);
    window.addEventListener("storage", bump);
    const i = window.setInterval(bump, 1000);
    return () => {
      window.removeEventListener("ap:update", bump);
      window.removeEventListener("storage", bump);
      window.clearInterval(i);
    };
  }, []);
}