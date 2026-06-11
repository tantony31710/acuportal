import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '../../../integrations/supabase/client';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const Route = createFileRoute('/_authenticated/student/check-in')({
  component: StudentCheckIn,
});

function StudentCheckIn() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // 1. Get the unique device fingerprint when the page loads
  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setDeviceId(result.visitorId);
    };
    initFingerprint();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setMessage({ type: 'error', text: 'Please enter a valid 4-digit PIN.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Get current logged-in user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'User session not found. Please re-login.' });
        setLoading(false);
        return;
      }

      // Hardcoded or dynamically selected session ID for testing
      // In production, this ID comes from a QR code scan or URL query parameter
      const targetSessionId = "YOUR_ACTIVE_SESSION_UUID_HERE"; 

      // 2. Call the server-side PLpgSQL function we added to Supabase
      const { data, error } = await supabase.rpc('submit_attendance', {
        p_session_id: targetSessionId,
        p_student_id: user.id,
        p_input_pin: pin,
        p_device_fingerprint: deviceId
      });

      if (error) throw error;

      // The RPC returns an array-like structure or single row mapping to our function return
      const result = data?.[0] || data;

      if (result?.success) {
        if (result?.flagged) {
          setMessage({ 
            type: 'success', 
            text: 'Attendance submitted, but flagged for multiple device usage.' 
          });
        } else {
          setMessage({ type: 'success', text: 'Attendance verified successfully!' });
        }
      } else {
        setMessage({ type: 'error', text: result?.message || 'Verification failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Class Check-In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 4-digit session code shown by your instructor.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="pin-code" className="sr-only">4-Digit PIN</label>
            <input
              id="pin-code"
              name="pin"
              type="text"
              maxLength={4}
              pattern="\d*"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="relative block w-full text-center tracking-[1em] text-2xl font-mono rounded-lg border border-gray-300 px-3 py-4 text-gray-900 placeholder-gray-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="0000"
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`p-4 rounded-md text-sm font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
            >
              {loading ? 'Verifying Context...' : 'Verify Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}