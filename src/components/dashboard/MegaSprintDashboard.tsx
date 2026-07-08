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
    { id: 'Data', label: 'Data' },
    { id: 'AI', label: 'AI' },
    { id: 'Security', label: 'Security' },
    { id: 'FullStack', label: 'Full-Stack' },
    { id: 'UX', label: 'UX/UI' },
  ];

  return (
    <div className="w-full bg-background rounded-xl border border-border p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Admin Control Center</h2>
      
      <div className="flex space-x-1 mb-6 border-b border-border pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:text-white hover:bg-border'
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
        className="min-h-[400px]"
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
