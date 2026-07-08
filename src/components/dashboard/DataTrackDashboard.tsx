import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/card';
import { supabase } from '../../lib/supabase';

export function DataTrackDashboard() {
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      // Mocking trend data fetch for demonstration - in production, this calls a SQL view
      setTrends([
        { date: 'Mon', present: 250, late: 10 },
        { date: 'Tue', present: 260, late: 5 },
        { date: 'Wed', present: 245, late: 15 },
      ]);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Attendance Trends (Data Analysis)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800">
           <h4 className="text-sm text-slate-400">Automated ETL Job (Data Engineering)</h4>
           <button className="mt-2 text-teal-400 text-sm font-semibold">Run Data Cleanup Pipeline</button>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
           <h4 className="text-sm text-slate-400">Anomaly Model (Data Science)</h4>
           <div className="text-sm text-slate-200 mt-2">Status: <span className="text-emerald-400">Active (Z-Score)</span></div>
        </Card>
      </div>
    </div>
  );
}
