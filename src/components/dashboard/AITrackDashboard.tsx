import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';

export function AITrackDashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Real-time subscription to alerts (AI Engine output)
    const channel = supabase
      .channel('alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, 
        (payload) => setAlerts((prev) => [payload.new, ...prev]))
      .subscribe();

    // Initial fetch
    supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setAlerts(data || []));

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-4">Real-time Anomaly Stream</h3>
        <div className="space-y-3">
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 bg-slate-950 rounded border border-orange-900/30 text-orange-200"
              >
                <p className="font-semibold">{alert.message}</p>
                <span className="text-xs text-orange-500/70">{new Date(alert.created_at).toLocaleTimeString()}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
      
      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold text-white mb-2">Semantic RAG Search</h3>
        <p className="text-muted-foreground mb-4">Query vector embeddings for historical student patterns.</p>
        <div className="flex gap-2">
            <input type="text" placeholder="Search student behavior history..." className="flex-1 p-2 rounded bg-slate-950 border border-border text-white" />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded font-bold">Query</button>
        </div>
      </Card>
    </div>
  );
}
