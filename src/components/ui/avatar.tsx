import React from 'react';

export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'md' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
  };
  
  return (
    <div className={`${sizes[size]} rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold`}>
      {initials}
    </div>
  );
};
