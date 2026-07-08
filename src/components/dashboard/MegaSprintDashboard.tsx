import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DataTrackDashboard } from './DataTrackDashboard';
import { AITrackDashboard } from './AITrackDashboard';
import { SecurityTrackDashboard } from './SecurityTrackDashboard';
import { FullStackTrackDashboard } from './FullStackTrackDashboard';
import { UXTrackDashboard } from './UXTrackDashboard';

type Tab = 'Data' | 'AI' | 'Security' | 'FullStack' | 'UX';

export function MegaSprintDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('Data');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'Data', label: 'Data (Science/Eng/Analysis)' },
    { id: 'AI', label: 'AI' },
    { id: 'Security', label: 'Security' },
    { id: 'FullStack', label: 'Full-Stack' },
    { id: 'UX', label: 'UX/UI' },
  ];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Acuportal Extreme: Mega-Sprint Dashboard</h1>
      
      <div className="flex space-x-2 mb-6 border-b border-slate-800 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${
              activeTab === tab.id ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'Data' && <DataTrackDashboard />}
        {activeTab === 'AI' && <AITrackDashboard />}
        {activeTab === 'Security' && <SecurityTrackDashboard />}
        {activeTab === 'FullStack' && <FullStackTrackDashboard />}
        {activeTab === 'UX' && <UXTrackDashboard />}
      </motion.div>
    </div>
  );
}
