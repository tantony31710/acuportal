import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white shadow rounded-lg p-6 border border-gray-200 ${className}`}>
    {children}
  </div>
);
