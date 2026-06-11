import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getActiveSession, getFingerprint, submitAttendance } from "@/lib/attendance";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [{ title: "Student Check-in — Anti-Proxy Attendance" }],
  }),
  component: CheckIn,
});

function CheckIn() {
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState(getActiveSession());

  useEffect(() => {
    setFingerprint(getFingerprint());
    setActiveSession(getActiveSession());
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!activeSession) {
      setMessage({ type: "error", text: "No active session is available right now." });
      return;
    }

    if (!studentId.trim() || pin.trim().length !== 4) {
      setMessage({ type: "error", text: "Enter your Student ID and the 4-digit PIN." });
      return;
    }

    setIsSubmitting(true);
    const outcome = submitAttendance({
      studentId: studentId.trim(),
      pin: pin.trim(),
      fingerprint,
    });

    if (!outcome.ok) {
      setMessage({ type: "error", text: outcome.reason ?? "Attendance rejected." });
    } else {
      setMessage({
        type: "success",
        text:
          outcome.status === "flagged"
            ? "Attendance recorded but flagged for review."
            : "Attendance recorded successfully.",
      });
      setStudentId("");
      setPin("");
      setActiveSession(getActiveSession());
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
            Student check-in
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Scan QR Code & Enter Your ID</h1>
          <p className="mt-3 text-sm text-slate-500">
            <strong>Step 1:</strong> Scan the QR code shown by your instructor (auto-fills PIN)<br/>
            <strong>Step 2:</strong> Enter your registered Student ID to complete check-in
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {activeSession ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-medium">Active session</p>
              <p className="mt-2">
                PIN: <span className="font-mono text-lg">{activeSession.pin}</span>
              </p>
              <p className="mt-1">Group: <strong>{activeSession.group}</strong></p>
              <p className="mt-1 text-xs text-slate-500">
                Session closes at {new Date(activeSession.endsAt).toLocaleTimeString()}.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              No active session is available. Please ask your instructor to start one.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="student-id" className="block text-sm font-medium text-slate-700">
                Student ID
              </label>
              <input
                id="student-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="123456"
                disabled={!activeSession || isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
                Session PIN
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-3xl font-mono tracking-[0.6em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="0000"
                disabled={!activeSession || isSubmitting}
              />
            </div>

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={!activeSession || isSubmitting}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting…" : "Submit attendance"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Device signature: <span className="font-mono">{fingerprint || "Generating..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
