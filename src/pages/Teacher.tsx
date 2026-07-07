import React from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function Teacher() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teacher View</h1>
      <Card>
        <h2 className="text-lg font-semibold mb-2">Class Roster</h2>
        <div className="space-y-2">
           <div className="flex justify-between items-center p-2 border-b">
             <span>John Doe</span>
             <Badge variant="success">Present</Badge>
           </div>
           <div className="flex justify-between items-center p-2 border-b">
             <span>Jane Smith</span>
             <Badge variant="warning">Late</Badge>
           </div>
        </div>
      </Card>
    </div>
  );
};
