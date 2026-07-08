import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getDashboardStats, getSessionAnomalies } from '../../lib/analytics';
import { Card } from '../ui/card';

export const AnalyticsDashboard = React.memo(function AnalyticsDashboard({ sessionId }: { sessionId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: s } = await getDashboardStats(sessionId);
      const { data: a } = await getSessionAnomalies(sessionId);
      setStats(s);
      setAnomalies(a || []);
    }
    loadData();
  }, [sessionId]);

  const sortedAnomalies = useMemo(() => {
    return [...anomalies].sort((a, b) => b.z_score - a.z_score);
  }, [anomalies]);

  if (!stats) return <div>Loading Analytics...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-sm text-slate-400">Total</div>
          <div className="text-2xl font-bold text-white">{stats.total_submissions}</div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-sm text-emerald-400">Present</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.present_count}</div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-sm text-amber-300">Late</div>
          <div className="text-2xl font-bold text-amber-300">{stats.late_count}</div>
        </Card>
        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="text-sm text-orange-400">Flagged</div>
          <div className="text-2xl font-bold text-orange-400">{stats.flagged_count}</div>
        </Card>
      </div>

      {sortedAnomalies.length > 0 && (
        <Card className="p-6 bg-slate-900 border-orange-900/50">
          <h3 className="text-lg font-semibold text-orange-400 mb-4">Anomaly Alerts</h3>
          <ul className="space-y-2">
            {sortedAnomalies.map((a: any) => (
              <li key={a.student_id} className="text-sm text-slate-300">
                Student {a.student_id} shows suspicious check-in pattern (Z-score: {a.z_score.toFixed(2)})
              </li>
            ))}
          </ul>
        </Card>
      )}
    </motion.div>
  );
});
