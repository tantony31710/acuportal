const [debugError, setDebugError] = useState<string | null>(null);
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteNav } from '@/components/SiteNav';
import { supabase } from '@/lib/supabase';

export default function CheckIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [expectedPin, setExpectedPin] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string>("Locating live lecture session...");
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function initializeCheckInChannel() {
      try {
        setLoading(true);

        // 1. Verify mobile device auth state
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }
        setUserEmail(user.email || '');

        // 2. Scan Supabase for the globally active session broadcasted by the teacher
        const { data: activeSession, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        // 3. Double-check expiration window if an active session row exists
        if (activeSession && new Date(activeSession.ends_at).getTime() > Date.now()) {
          setIsSessionActive(true);
          setExpectedPin(activeSession.pin_code);
          setActiveSessionData(activeSession);
          setSessionMessage(`Live session found for Group ${activeSession.group_name}! Enter the 4-digit PIN.`);
        } else {
          // If no session exists or it has expired past its ends_at timestamp
          setIsSessionActive(false);
          setExpectedPin(null);
          setActiveSessionData(null);
          setSessionMessage("No active session. Ask your instructor to start one.");
        }
      } catch (err: any) {
        console.error("Sync channel failed:", err.message);
        setSessionMessage("Connection error: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    initializeCheckInChannel();
  }, [navigate]);

  const handlePinSubmit = async () => {
    if (!activeSessionData || !expectedPin) return;

    if (pinInput !== expectedPin) {
      alert("Invalid verification code. Please check the screen or ask your instructor.");
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 4. Securely record the attendance submission link in the database
      const { error } = await supabase
        .from('attendance_submissions')
        .insert([
          {
            session_id: activeSessionData.id,
            student_id: user.id,
            email: user.email,
            status: 'present', // Proxy engine will evaluate rules and can flag down rows here
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      alert("Attendance recorded successfully! You are checked in.");
      setPinInput('');
    } catch (err: any) {
      alert("Failed to submit attendance: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        <h3>Connecting to Live Campus Session...</h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <h1 className="font-display text-2xl font-semibold text-center mb-1">Student Check-In</h1>
          <p className="text-xs text-muted-foreground text-center mb-6">Signed in as: {userEmail}</p>

          <div className={`p-4 rounded-lg mb-6 border text-sm text-center ${isSessionActive ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
            <p className="font-medium">{sessionMessage}</p>
          </div>

          {isSessionActive && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2">
                  Enter 4-Digit Attendance PIN
                </label>
                <input 
                  type="text"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="0000"
                  disabled={submitting}
                  className="mx-auto block w-40 tracking-[0.5em] text-center font-mono text-3xl font-bold rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button 
                onClick={handlePinSubmit}
                disabled={submitting || pinInput.length < 4}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Verifying Context..." : "Verify & Check-In"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
