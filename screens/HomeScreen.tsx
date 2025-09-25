import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBundles } from '../hooks/useBundles';
import { db } from '../db/db';
import { IconPackage, IconPlus, IconTrash, IconEdit, IconUpload, IconMoreVertical, IconCopy, IconLink, IconNote, IconFile, IconShare2, IconSearch, IconMic, IconListChecks, IconContact, IconMapPin, IconPenSquare, IconMail, IconCode, IconImage, IconFileText, IconLock, IconQrCode, IconX, IconPin, IconPinOff, IconArchive, IconHistory, IconRecycle, IconHome, IconScan } from '../components/icons';
import type { Bundle, LinkItem, BundleItem, FileItem } from '../types';
import { ItemType } from '../types';
import Modal from '../components/Modal';
import { readPackage } from '../services/bundleService';
import { useToast } from '../App';
import { useLiveQuery } from 'dexie-react-hooks';

interface HomeScreenProps {
  onNavigateToEditor: (bundleId: string) => void;
  onNavigateToShare: (bundleId: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  showRecycleBin: boolean;
  setShowRecycleBin: (show: boolean) => void;
  bookmarkletParams: URLSearchParams;
  onOpenScanner: () => void;
}

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const OnboardingModal: React.FC<{onClose: () => void}> = ({ onClose }) => (
    <Modal isOpen={true} onClose={onClose} title="Welcome to StaticLink!" footer={
        <button onClick={onClose} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">
            Got it, let's start!
        </button>
    }>
        <div className="space-y-4">
            <p>StaticLink helps you create and share bundles of content that work completely offline.</p>
            <ul className="space-y-2 text-sm pl-4">
                <li className="flex items-start gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <div>
                        <strong className="font-semibold text-foreground">Create a Bundle:</strong>
                        <p>Think of it as a folder for your links, notes, files, and more.</p>
                    </div>
                </li>
                 <li className="flex items-start gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <div>
                        <strong className="font-semibold text-foreground">Add Items:</strong>
                        <p>Add different types of content to your bundle, from simple notes to audio recordings.</p>
                    </div>
                </li>
                 <li className="flex items-start gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <div>
                        <strong className="font-semibold text-foreground">Share Offline:</strong>
                        <p>Download your bundle as a single file (.slpkg) and share it with anyone.</p>
                    </div>
                </li>
            </ul>
             <p className="text-xs text-center pt-2">Everything is stored securely in your browser. There are no accounts and no servers.</p>
        </div>
    </Modal>
);

const PasswordPromptModal: React.FC<{ bundle: Bundle; onClose: () => void; onUnlock: (bundleId: string) => void; }> = ({ bundle, onClose, onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const hashed = await hashPassword(password);
        if (hashed === bundle.passwordHash) {
            onUnlock(bundle.id);
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Unlock "${bundle.title}"`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p>This bundle is password protected. Please enter the password to continue.</p>
                <div>
                    <label htmlFor="bundle-password" className="sr-only">Password</label>
                    <input
                        ref={inputRef}
                        id="bundle-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-transparent border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Enter password"
                    />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={onClose} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">
                        Unlock
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToEditor, onNavigateToShare, showArchived, setShowArchived, showRecycleBin, setShowRecycleBin, bookmarkletParams, onOpenScanner }) => {
  const { bundles, addBundle, deleteBundle, deleteBundles, importBundle, duplicateBundle, updateBundle, mergeBundles, restoreBundle, permanentlyDeleteBundle, archiveBundles, addItemToBundle } = useBundles();
  
  // FIX: This query could crash the app for users on older DB versions without the `isDeleted` index.
  // Changed to fetch all bundles and filter in memory for robustness, preventing crashes.
  const deletedBundles = useLiveQuery(async () => {
    const allBundles = await db.bundles.toArray();
    return allBundles.filter(bundle => bundle.isDeleted === true);
  }, []);
  
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [bundleToUnlock, setBundleToUnlock] = useState<Bundle | null>(null);
  const [importConflict, setImportConflict] = useState<{ existingBundle: Bundle, newBundleData: Omit<Bundle, 'id'|'createdAt'|'updatedAt'> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setIsActionMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    const url = bookmarkletParams.get('url');
    const title = bookmarkletParams.get('title');
    if (url) {
      const quickAddItem = async () => {
        let targetBundle = bundles?.find(b => b.title.toLowerCase() === 'inbox');
        if (!targetBundle) {
          const newBundleId = await addBundle('Inbox');
          targetBundle = { id: newBundleId, title: 'Inbox', items: [], createdAt: '', updatedAt: ''}; // simplified for immediate use
        }
        const newLink: LinkItem = {
          id: crypto.randomUUID(),
          type: ItemType.LINK,
          title: title || url,
          url: url,
          createdAt: new Date().toISOString()
        };
        
        // FIX: Replaced direct db.bundles.update with addItemToBundle hook to prevent circular reference errors.
        await addItemToBundle(targetBundle.id, newLink);
        showToast(`Link added to "${targetBundle.title}"`);
        onNavigateToEditor(targetBundle.id);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
      };
      
      if(bundles) {
          quickAddItem();
      }
    }
  }, [bookmarkletParams, bundles, addBundle, onNavigateToEditor, showToast, addItemToBundle]);
  

  useEffect(() => {
      const hasVisited = localStorage.getItem('hasVisited');
      if (!hasVisited) setShowOnboarding(true);
  }, []);

  const handleCloseOnboarding = () => {
      localStorage.setItem('hasVisited', 'true');
      setShowOnboarding(false);
  };
  
  const handleOpenBundle = (bundle: Bundle) => {
      if(isSelectMode) return handleToggleSelect(bundle.id);
      if (bundle.isLocked) setBundleToUnlock(bundle);
      else onNavigateToEditor(bundle.id);
  };

  const openDeleteConfirm = (bundle: Bundle) => setBundleToDelete(bundle);

  const handleDeleteConfirm = () => {
    if (bundleToDelete) {
      if(showRecycleBin){
          permanentlyDeleteBundle(bundleToDelete.id);
          showToast(`Permanently deleted "${bundleToDelete.title}"`);
      } else {
          deleteBundle(bundleToDelete.id);
          showToast(`Moved "${bundleToDelete.title}" to Recycle Bin`);
      }
      setBundleToDelete(null);
    }
  };
  
  const handleImportClick = () => { fileInputRef.current?.click(); };
  
  const processImportData = async (newBundleData: Omit<Bundle, 'id'|'createdAt'|'updatedAt'>) => {
    setIsImporting(true);
    try {
        const existingBundle = bundles?.find(b => b.title === newBundleData.title);
        if (existingBundle) setImportConflict({ existingBundle, newBundleData });
        else { const newBundleId = await importBundle(newBundleData); onNavigateToEditor(newBundleId); }
    } catch (error) {
        console.error("Failed to import bundle data:", error);
        showToast("Failed to import bundle. Data might be corrupted.");
    } finally { setIsImporting(false); }
  };

  const processImportFile = async (file: File) => {
     try {
        const newBundleData = await readPackage(file);
        await processImportData(newBundleData);
      } catch (error) {
        console.error("Failed to import bundle:", error);
        showToast("Failed to import file. It may be corrupted.");
      } finally { if(fileInputRef.current) fileInputRef.current.value = ""; }
  }
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processImportFile(file);
  };

  const handleImportReplace = async () => {
    if(!importConflict) return;
    await permanentlyDeleteBundle(importConflict.existingBundle.id);
    const newBundleId = await importBundle(importConflict.newBundleData);
    onNavigateToEditor(newBundleId);
    setImportConflict(null);
  }

  const handleImportKeepBoth = async () => {
    if(!importConflict) return;
    const newBundleDataWithModifiedTitle = { ...importConflict.newBundleData, title: `${importConflict.newBundleData.title} (Copy)` };
    const newBundleId = await importBundle(newBundleDataWithModifiedTitle);
    onNavigateToEditor(newBundleId);
    setImportConflict(null);
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.slpkg')) await processImportFile(file);
    else if (file) alert("Invalid file type. Please drop a .slpkg file.");
  };
  
  const handleToggleSelect = (bundleId: string) => {
      setSelectedBundleIds(prev => { const next = new Set(prev); if (next.has(bundleId)) next.delete(bundleId); else next.add(bundleId); return next; });
  };

  const handleToggleSelectMode = () => { setIsSelectMode(!isSelectMode); setSelectedBundleIds(new Set()); };
  
  const handleMerge = async (newTitle: string) => {
      if (selectedBundleIds.size < 2) return;
      const newBundleId = await mergeBundles(Array.from(selectedBundleIds), newTitle);
      setIsMergeModalOpen(false);
      handleToggleSelectMode();
      onNavigateToEditor(newBundleId);
  };

  const handleArchiveSelected = async () => {
      setIsActionMenuOpen(false);
      await archiveBundles(selectedBundleIds);
      showToast(`Archived ${selectedBundleIds.size} bundles.`);
      handleToggleSelectMode();
  };
  
  const handleDeleteSelected = async () => {
    setIsActionMenuOpen(false);
    await deleteBundles(selectedBundleIds);
    showToast(`Moved ${selectedBundleIds.size} bundles to Recycle Bin.`);
    setIsBulkDeleteConfirmOpen(false);
    handleToggleSelectMode();
  };

  const handleUnarchive = async (bundleId: string) => updateBundle(bundleId, { isArchived: false });
  const handleRestore = async (bundleId: string) => restoreBundle(bundleId);

  
  const allBundles = useMemo(() => {
    const currentList = showRecycleBin ? deletedBundles : bundles;
    const filterByQuery = (b: Bundle) => b.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!currentList) return { pinned: [], active: [], archived: [], deleted: [], hasArchived: false, hasDeleted: false };
    
    const pinned = currentList.filter(b => b.isPinned && !b.isArchived) || [];
    const active = currentList.filter(b => !b.isPinned && !b.isArchived) || [];
    const archived = currentList.filter(b => b.isArchived) || [];
    const deleted = deletedBundles || [];
    
    return {
        pinned: pinned.filter(filterByQuery),
        active: active.filter(filterByQuery),
        archived: archived.filter(filterByQuery),
        deleted: deleted.filter(filterByQuery),
        hasArchived: (bundles || []).some(b => b.isArchived),
        hasDeleted: deleted.length > 0
    };
  }, [bundles, deletedBundles, searchQuery, showRecycleBin]);


  const BundleCard: React.FC<{ bundle: Bundle }> = ({ bundle }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isSelected = selectedBundleIds.has(bundle.id);

    const toggleMenu = (e: React.MouseEvent) => { e.stopPropagation(); setMenuOpen(prev => !prev); }
    const handleAction = (e: React.MouseEvent, action: () => void) => { e.stopPropagation(); action(); setMenuOpen(false); }

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    const getItemIcon = (item: BundleItem) => {
        const iconProps = { key: item.id, size: 16, className: "text-muted-foreground" };
        switch (item.type) {
            case ItemType.LINK: return <IconLink {...iconProps}/>;
            case ItemType.NOTE: return <IconNote {...iconProps}/>;
            case ItemType.FILE: if ((item as FileItem).mimeType.startsWith('image/')) return <IconImage {...iconProps} />; return <IconFileText {...iconProps} />;
            default: return null;
        }
    };

    const isDeletedView = showRecycleBin;

    return (
        <div 
          className={`bg-card border rounded-lg shadow-sm flex flex-col group transition-all duration-200
            ${isSelectMode ? 'cursor-pointer' : ''}
            ${!isDeletedView ? 'hover:shadow-md hover:border-primary/30' : ''}
            ${isSelected ? 'border-primary shadow-md ring-2 ring-primary' : 'border-border'}`
          }
          onClick={() => !isDeletedView && handleOpenBundle(bundle)}
        >
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 pr-2">
                        {bundle.isLocked && <IconLock size={16} className="text-muted-foreground flex-shrink-0" />}
                        <h3 className="text-lg font-bold text-card-foreground break-all">{bundle.title}</h3>
                    </div>
                    {isSelectMode ? (
                      <input type="checkbox" checked={isSelected} readOnly className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"/>
                    ) : (
                      !isDeletedView && (
                        <div className="relative" ref={menuRef}>
                            <button onClick={toggleMenu} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><IconMoreVertical size={20} /></button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border">
                                    <ul className="py-1">
                                        <li><button onClick={e => handleAction(e, () => updateBundle(bundle.id, { isPinned: !bundle.isPinned }))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent">{bundle.isPinned ? <IconPinOff size={16}/> : <IconPin size={16}/>} {bundle.isPinned ? 'Unpin' : 'Pin'}</button></li>
                                        <li><button onClick={e => handleAction(e, () => duplicateBundle(bundle.id))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconCopy size={16}/> Duplicate</button></li>
                                        <li><button onClick={e => handleAction(e, () => updateBundle(bundle.id, { isArchived: true }))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconArchive size={16}/> Archive</button></li>
                                        <li><button onClick={e => handleAction(e, () => openDeleteConfirm(bundle))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive dark:text-red-500 hover:bg-destructive/10"><IconTrash size={16}/> Delete</button></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                      )
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{bundle.items.length} {bundle.items.length === 1 ? 'item' : 'items'}</p>
                {isDeletedView && bundle.deletedAt && <p className="text-xs text-muted-foreground mt-1">Deleted: {new Date(bundle.deletedAt).toLocaleString()}</p>}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {bundle.items.slice(0, 7).map(item => getItemIcon(item))}
                    {bundle.items.length > 7 && <span className="text-xs text-muted-foreground">&hellip;</span>}
                </div>
            </div>
            {!bundle.isArchived && !isDeletedView && (
              <div className="bg-muted/50 p-3 rounded-b-lg flex justify-between items-center gap-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Updated: {new Date(bundle.updatedAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                      {!isSelectMode && <button onClick={(e) => {e.stopPropagation(); onNavigateToShare(bundle.id);}} className="flex items-center justify-center h-9 w-9 text-sm font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors" title="Share"><IconShare2 size={16} /></button>}
                      <button className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 shadow-sm transition-transform ${!isSelectMode && "group-hover:scale-105"}`}>
                          <IconEdit size={14} /> Open
                      </button>
                  </div>
              </div>
            )}
            {bundle.isArchived && (
                 <div className="bg-muted/50 p-3 rounded-b-lg flex justify-end items-center gap-2 border-t border-border">
                    <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(bundle); }} className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md">Delete Permanently</button>
                    <button onClick={(e) => { e.stopPropagation(); handleUnarchive(bundle.id); }} className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-md">Unarchive</button>
                 </div>
            )}
             {isDeletedView && (
                 <div className="bg-muted/50 p-3 rounded-b-lg flex justify-end items-center gap-2 border-t border-border">
                    <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(bundle); }} className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md flex items-center gap-1.5"><IconTrash size={14}/> Delete Forever</button>
                    <button onClick={(e) => { e.stopPropagation(); handleRestore(bundle.id); }} className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-md flex items-center gap-1.5"><IconHistory size={14}/> Restore</button>
                 </div>
            )}
        </div>
    );
  };
  
  const CreateBundleModal: React.FC<{onClose: () => void, onCreate: (title: string) => void}> = ({ onClose, onCreate }) => {
      const [title, setTitle] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      
      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!title.trim() || isLoading) return;
          setIsLoading(true);
          await onCreate(title.trim());
      };

      return (
          <Modal isOpen={true} onClose={onClose} title="Create New Bundle">
              <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter bundle title..." autoFocus className="w-full px-4 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring" />
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={onClose} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">Cancel</button>
                      <button type="submit" className="flex justify-center items-center gap-2 px-6 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors" disabled={!title.trim() || isLoading}>
                          {isLoading ? 'Creating...' : 'Create & Open'}
                      </button>
                  </div>
              </form>
          </Modal>
      )
  }

  const MergeBundleModal: React.FC<{onClose: () => void, onMerge: (title: string) => void}> = ({ onClose, onMerge }) => {
      const [title, setTitle] = useState('');
      const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onMerge(title.trim()); };
      return (
          <Modal isOpen={true} onClose={onClose} title="Merge Bundles">
              <form onSubmit={handleSubmit} className="space-y-4">
                  <p>Create a new bundle from the {selectedBundleIds.size} selected bundles. The original bundles will not be changed.</p>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter new bundle title..." autoFocus required className="w-full px-4 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"/>
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={onClose} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">Cancel</button>
                      <button type="submit" disabled={!title.trim()} className="px-6 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground">Merge</button>
                  </div>
              </form>
          </Modal>
      )
  }
  
  const pageTitle = showRecycleBin ? "Recycle Bin" : showArchived ? "Archived Bundles" : "My Bundles";
  const pageDescription = showRecycleBin ? "Bundles here will be permanently deleted after 30 days." : showArchived ? "View and manage your archived bundles." : "Create, manage, and search your content.";
  const currentBundles = showRecycleBin ? allBundles.deleted : showArchived ? allBundles.archived : [...allBundles.pinned, ...allBundles.active];
  
  const MobileNavButton: React.FC<{ label: string, icon: React.ReactNode, isActive?: boolean, onClick: () => void }> = ({ label, icon, isActive = false, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8 relative" onDragEnter={handleDragEnter}>
       {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
       {bundleToUnlock && <PasswordPromptModal bundle={bundleToUnlock} onClose={() => setBundleToUnlock(null)} onUnlock={(id) => { setBundleToUnlock(null); onNavigateToEditor(id); }} />}
       {isCreateModalOpen && <CreateBundleModal onClose={() => setIsCreateModalOpen(false)} onCreate={async (title) => { const id = await addBundle(title); onNavigateToEditor(id); }} />}
       {isMergeModalOpen && <MergeBundleModal onClose={() => setIsMergeModalOpen(false)} onMerge={handleMerge} />}
       <Modal isOpen={isImporting} onClose={() => {}} title="Importing Bundle">
         <div className="flex flex-col items-center justify-center gap-4 p-4"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div><p className="text-muted-foreground">Processing...</p></div>
       </Modal>
        
       <div className="sm:hidden mobile-dock">
          <MobileNavButton label="Home" icon={<IconHome size={22}/>} isActive={!showArchived && !showRecycleBin} onClick={() => { setShowArchived(false); setShowRecycleBin(false); }} />
          <MobileNavButton label="Scan" icon={<IconScan size={22}/>} onClick={onOpenScanner} />
          <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 flex flex-col items-center justify-center h-full text-primary">
              <div className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
                  <IconPlus size={28} />
              </div>
              <span className="text-xs font-medium mt-1">New</span>
          </button>
          <MobileNavButton label="Select" icon={<IconListChecks size={22}/>} isActive={isSelectMode} onClick={handleToggleSelectMode} />
          <MobileNavButton label="Import" icon={<IconUpload size={22}/>} onClick={handleImportClick} />
      </div>
      
      {isSelectMode && (
          <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] left-1/2 -translate-x-1/2 sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0 z-30">
              <div className="bg-background border border-border shadow-lg rounded-full flex items-center justify-between gap-4 p-2 pl-4">
                  <span className="text-sm font-semibold text-foreground">{selectedBundleIds.size} selected</span>
                  <div className="flex items-center gap-2">
                      <div className="relative" ref={actionMenuRef}>
                          <button onClick={() => setIsActionMenuOpen(p => !p)} className="px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                              Actions
                          </button>
                          {isActionMenuOpen && (
                              <div className="absolute bottom-full right-0 mb-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border">
                                  <ul className="py-1">
                                      <li><button disabled={selectedBundleIds.size < 2} onClick={() => { setIsMergeModalOpen(true); setIsActionMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"><IconCopy size={16}/> Merge</button></li>
                                      <li><button disabled={selectedBundleIds.size === 0} onClick={handleArchiveSelected} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"><IconArchive size={16}/> Archive</button></li>
                                      <li><button disabled={selectedBundleIds.size === 0} onClick={() => { setIsBulkDeleteConfirmOpen(true); setIsActionMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"><IconTrash size={16}/> Delete</button></li>
                                  </ul>
                              </div>
                          )}
                      </div>
                      <button onClick={handleToggleSelectMode} className="p-2 text-muted-foreground hover:bg-accent rounded-full"><IconX /></button>
                  </div>
              </div>
          </div>
      )}

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
            {!showRecycleBin && !showArchived && <button onClick={handleToggleSelectMode} className={`px-4 py-2 text-sm font-medium rounded-md ${isSelectMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>Select</button>}
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"><IconPlus size={18} /> New</button>
            <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20"><IconUpload size={18} /> Import</button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".slpkg" className="hidden" />
      </div>

        <div>
          <div className="relative mb-6">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${pageTitle.toLowerCase()}...`} className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"/>
          </div>

          {showArchived ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {allBundles.archived.map((b) => <BundleCard key={b.id} bundle={b} />)}
             </div>
          ) : showRecycleBin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {allBundles.deleted.map((b) => <BundleCard key={b.id} bundle={b} />)}
             </div>
          ) : (
            <>
              {allBundles.pinned.length > 0 && (
                <div className="mb-8">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3"><IconPin size={14}/> PINNED</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{allBundles.pinned.map((b) => <BundleCard key={b.id} bundle={b} />)}</div>
                </div>
              )}
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{allBundles.active.map((b) => <BundleCard key={b.id} bundle={b} />)}</div>
            </>
          )}

          {currentBundles.length === 0 && (
            <div className="text-center py-16 px-6 bg-card border-2 border-dashed border-border rounded-lg">
              <IconPackage size={48} className="mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">{searchQuery ? 'No Matching Bundles' : 'No Bundles Here'}</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? 'Try adjusting your search query.' : (showRecycleBin ? 'Your recycle bin is empty.' : 'Create your first bundle to get started!')}
              </p>
            </div>
          )}
        </div>

      <Modal isOpen={!!bundleToDelete} onClose={() => setBundleToDelete(null)} title="Confirm Deletion" footer={
        <><button onClick={() => setBundleToDelete(null)} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">Cancel</button><button onClick={handleDeleteConfirm} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90">{showRecycleBin ? "Delete Permanently" : "Delete"}</button></>
      }>
        <p>Are you sure you want to {showRecycleBin ? 'permanently delete' : 'delete'} "{bundleToDelete?.title}"? This action cannot be undone.</p>
      </Modal>

      <Modal isOpen={isBulkDeleteConfirmOpen} onClose={() => setIsBulkDeleteConfirmOpen(false)} title={`Delete ${selectedBundleIds.size} Bundles`} footer={
        <><button onClick={() => setIsBulkDeleteConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleDeleteSelected} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Delete</button></>
      }>
        <p>Are you sure you want to move {selectedBundleIds.size} bundles to the Recycle Bin?</p>
      </Modal>

      <Modal isOpen={!!importConflict} onClose={() => setImportConflict(null)} title="Import Conflict" footer={
        <><button onClick={() => setImportConflict(null)} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">Cancel</button><button onClick={handleImportKeepBoth} className="px-4 py-2 font-medium text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90">Keep Both</button><button onClick={handleImportReplace} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">Replace</button></>
      }>
        <p>A bundle named "{importConflict?.existingBundle.title}" already exists. How would you like to proceed?</p>
      </Modal>

      {isDragging && (
          <div onDragLeave={handleDragLeave} onDrop={handleDrop} onDragOver={handleDragOver} className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-primary rounded-lg">
              <div className="text-center p-4"><IconUpload size={64} className="text-primary-foreground mx-auto" /><p className="mt-4 text-2xl font-bold text-primary-foreground">Drop .slpkg file to import</p></div>
          </div>
      )}
    </div>
  );
};

export default HomeScreen;