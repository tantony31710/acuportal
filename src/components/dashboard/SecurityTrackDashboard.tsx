import React from 'react';
import { Card } from '../ui/card';

export function SecurityTrackDashboard() {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Audit Logs (Cybersecurity)</h3>
        <p className="text-slate-400">Monitoring sensitive table changes (submissions, users).</p>
        <div className="mt-4 text-xs font-mono text-slate-500">
          [10:00] Admin updated user_roles<br />
          [09:30] Student inserted submission
        </div>
      </Card>
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Threat Detection</h3>
        <p className="text-slate-400">Real-time monitoring for unauthorized API access.</p>
      </Card>
    </div>
  );
}
