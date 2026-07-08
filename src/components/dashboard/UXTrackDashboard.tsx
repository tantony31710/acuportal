import React from 'react';
import { Card } from '../ui/card';

export function UXTrackDashboard() {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Design System</h3>
        <p className="text-slate-400">Manage theme, typography, and reusable components.</p>
      </Card>
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-2">Accessibility (A11y)</h3>
        <p className="text-slate-400">Audit report for WCAG 2.1 compliance.</p>
      </Card>
    </div>
  );
}
