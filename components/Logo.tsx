import React from 'react';

export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3"
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
    <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
    <line x1="8" x2="16" y1="12" y2="12"/>
  </svg>
);
