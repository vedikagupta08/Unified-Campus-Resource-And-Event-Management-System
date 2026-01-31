import React from 'react';

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="loading-spinner" aria-hidden />
      {label && <p className="text-sm text-gray-500 animate-pulse-soft">{label}</p>}
    </div>
  );
}
