import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { IconSun, IconMoon, IconMonitor } from './icons';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { name: 'light', icon: <IconSun size={20} /> },
    { name: 'dark', icon: <IconMoon size={20} /> },
    { name: 'system', icon: <IconMonitor size={20} /> },
  ] as const;

  return (
    <div className="flex items-center p-1 bg-muted rounded-full">
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          className={`p-1.5 rounded-full transition-colors ${
            theme === t.name
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={`Switch to ${t.name} theme`}
          title={`Switch to ${t.name} theme`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};