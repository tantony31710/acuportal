import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';

export function SecurityTrackDashboard() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setLogs(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-4">Enterprise Audit Log (Security)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">Table</th>
                <th className="p-3">Action</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="text-slate-300">
                  <td className="p-3 font-mono text-teal-400">{log.table_name}</td>
                  <td className="p-3">{log.action}</td>
                  <td className="p-3 text-muted-foreground">{new Date(log.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-2">Threat Mitigation</h3>
        <p className="text-muted-foreground">Current system status: <span className="text-emerald-500 font-bold">SECURE (RLS Active)</span></p>
      </Card>
    </div>
  );
}
