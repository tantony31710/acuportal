import React from 'react';
import { Card } from '../ui/card';

export function AITrackDashboard() {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Automated Alerting (AI Engine)</h3>
        <p className="text-slate-400">Real-time anomaly alerts powered by database triggers.</p>
        <button className="mt-4 bg-teal-600 text-white px-4 py-2 rounded">View Active Alerts</button>
      </Card>
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Student RAG (Semantic Search)</h3>
        <p className="text-slate-400">Query attendance history using vector embeddings.</p>
        <input type="text" placeholder="Ask about a student..." className="w-full mt-2 p-2 rounded bg-slate-800 text-white" />
      </Card>
    </div>
  );
}
