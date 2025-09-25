import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { IconMoreVertical, IconArchive, IconBookmarkPlus, IconRecycle } from './icons';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateToBookmarklet: () => void;
  onArchivedClick: () => void;
  onRecycleBinClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome, onNavigateToBookmarklet, onArchivedClick, onRecycleBinClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <a href="/#" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} className="flex items-center gap-3">
              <Logo size={28} className="text-primary" />
              <span className="text-2xl font-bold tracking-tight text-foreground">
                StaticLink
              </span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
                title="More options"
              >
                <IconMoreVertical size={20} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-popover rounded-md shadow-lg z-20 border border-border">
                  <ul className="py-1">
                    <li><button onClick={() => { onArchivedClick(); setMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconArchive size={16} /> Archived Bundles</button></li>
                    <li><button onClick={() => { onRecycleBinClick(); setMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconRecycle size={16} /> Recycle Bin</button></li>
                    <li><button onClick={() => { onNavigateToBookmarklet(); setMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconBookmarkPlus size={16} /> Quick Add Bookmarklet</button></li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};