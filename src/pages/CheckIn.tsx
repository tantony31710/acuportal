const [debugError, setDebugError] = useState<string | null>(null);
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function CheckIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [systemPin, setSystemPin] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentSession() {
      try {
        // 1. Safely grab the authenticated user details
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // If no session exists on this device, kick them back to login instead of freezing
          navigate('/auth');
          return;
        }
        
        setCurrentUser(user);

        // 2. Fetch their expected PIN or profile safely from your database
        const { data: profile, error } = await supabase
          .from('students') // Swap this with your actual student profile table name if different
          .select('pin_code') // Swap with your exact column name for the PIN
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile && !error) {
          setSystemPin(profile.pin_code);
        }
      } catch (err) {
        console.error("Session initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentSession();
  }, [navigate]);

  // FIX: This prevents the fields from rendering until the session is 100% verified!
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff' }}>
        <h2>Connecting to Session...</h2>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Inputs will now type perfectly because state updates are unblocked
    setPinInput(e.target.value);
  };

  return (
    <div className="checkin-container" style={{ padding: '40px', color: 'white' }}>
      <h1>Student Attendance Check-In</h1>
      <p>Logged in as: {currentUser?.email}</p> {/* Safe optional chaining prevents crashes */}
      
      <div className="pin-box">
        <label>Enter Attendance PIN:</label>
        <input 
          type="text" 
          value={pinInput} 
          onChange={handleInputChange} 
          placeholder="0000"
          maxLength={4}
          style={{ color: '#000', padding: '10px', fontSize: '18px', marginTop: '10px', display: 'block' }}
        />
      </div>
    </div>
  );
}
