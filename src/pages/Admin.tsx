import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

export const Admin: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase.from('attendance_sessions').select('*');
      setSessions(data || []);
    }
    loadSessions();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <Card>
        <h2 className="text-lg font-semibold mb-2">Active Sessions</h2>
        {sessions.map(s => (
          <div key={s.id} className="flex justify-between p-2 border-b">
            <span>{s.group_name}</span>
            <span>{s.pin_code}</span>
          </div>
        ))}
        <Button className="mt-4">Start New Session</Button>
      </Card>
    </div>
  );
};
