import React from 'react';
import { Card } from '../ui/card';

export function FullStackTrackDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-4">Edge Function Health</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Submit-Attendance</span>
            <span className="text-emerald-500 font-mono">200ms avg</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[85%]"></div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-4">Deployment Environment</h3>
        <div className="space-y-2">
            <div className="text-slate-300">Environment: <span className="text-teal-400">PRODUCTION</span></div>
            <div className="text-slate-300">Version: <span className="font-mono">v1.2.4-extreme</span></div>
            <button className="w-full mt-4 bg-border text-white py-2 rounded font-bold hover:bg-slate-700">View CI/CD Logs</button>
        </div>
      </Card>
    </div>
  );
}
