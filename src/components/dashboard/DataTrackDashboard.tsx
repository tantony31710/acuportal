import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export function DataTrackDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      // Enterprise: Fetching raw submission data to process locally for deep analysis
      const { data: submissions } = await supabase
        .from('attendance_submissions')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (submissions) {
        // Data Analysis: Grouping for visualization
        const grouped = submissions.reduce((acc: any, curr) => {
          const day = new Date(curr.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          if (!acc[day]) acc[day] = { day, present: 0, late: 0 };
          if (curr.status === 'present') acc[day].present++;
          if (curr.status === 'late') acc[day].late++;
          return acc;
        }, {});
        setData(Object.values(grouped));
      }
    }
    fetchData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-6">Attendance Throughput</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#2dd4bf" strokeWidth={3} />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-4">Engineering: ETL Pipeline</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-border">
            <span>Last Sync</span>
            <span className="text-teal-400 font-mono">2026-07-08 14:00</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-border">
            <span>Status</span>
            <span className="text-emerald-500 font-bold">OPTIMAL</span>
          </div>
          <button className="w-full mt-4 bg-primary text-primary-foreground py-2 rounded font-bold hover:brightness-110">
            Trigger Full Roster Re-Sync
          </button>
        </div>
      </Card>
    </div>
  );
}
