import React from 'react';
import { IconPackage } from './icons';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <IconPackage size={28} className="text-primary" />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              StaticLink
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};