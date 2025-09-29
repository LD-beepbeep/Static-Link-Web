import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBundles } from '../hooks/useBundles';
import { db } from '../db/db';
import { IconPackage, IconPlus, IconTrash, IconEdit, IconUpload, IconMoreVertical, IconCopy, IconLink, IconNote, IconFile, IconShare2, IconSearch, IconMic, IconListChecks, IconContact, IconMapPin, IconPenSquare, IconMail, IconCode, IconImage, IconFileText, IconLock, IconQrCode, IconX, IconPin, IconPinOff, IconArchive, IconHistory, IconRecycle, IconHome, IconScan, IconArchiveRestore, IconClipboardCopy } from '../components/icons';
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
  onNavigateToArchive: () => void;
  onNavigateToHome: () => void;
  onNavigateToRecycleBin: () => void;
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

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToEditor, onNavigateToShare, showArchived, setShowArchived, showRecycleBin, setShowRecycleBin, bookmarkletParams, onOpenScanner, onNavigateToArchive, onNavigateHome, onNavigateToRecycleBin }) => {
  const { bundles, addBundle, deleteBundle, deleteBundles, importBundle, duplicateBundle, updateBundle, mergeBundles, restoreBundle, permanentlyDeleteBundle, archiveBundles, unarchiveBundles, addItemToBundle, permanentlyDeleteBundles, restoreBundles } = useBundles();
  
  const deletedBundles = useLiveQuery(async () => {
    const allBundles = await db.bundles.toArray();
    return allBundles.filter(bundle => bundle.isDeleted === true);
  }, []);

  const archivedBundles = useLiveQuery(async () => {
    const allBundles = await db.bundles.toArray();
    return allBundles.filter(bundle => bundle.isArchived === true && !bundle.isDeleted);
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
  
  // Confirmation modals for bulk actions
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkPermanentDeleteConfirmOpen, setIsBulkPermanentDeleteConfirmOpen] = useState(false);
  const [isDeleteAllFromBinConfirmOpen, setIsDeleteAllFromBinConfirmOpen] = useState(false);
  const [isRestoreAllFromBinConfirmOpen, setIsRestoreAllFromBinConfirmOpen] = useState(false);
  const [isMoveAllArchivedToBinConfirmOpen, setIsMoveAllArchivedToBinConfirmOpen] = useState(false);
  const [isUnarchiveAllConfirmOpen, setIsUnarchiveAllConfirmOpen] = useState(false);

  useEffect(() => {
    // Exit select mode when switching views
    setIsSelectMode(false);
    setSelectedBundleIds(new Set());
  }, [showArchived, showRecycleBin]);
  
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
  
  const handleCardClick = (bundle: Bundle) => {
      if (isSelectMode) {
          handleToggleSelect(bundle.id);
      } else {
          if (bundle.isLocked) setBundleToUnlock(bundle);
          else onNavigateToEditor(bundle.id);
      }
  };

  const openDeleteConfirm = (bundle: Bundle) => setBundleToDelete(bundle);

  const handleDeleteConfirm = () => {
    if (bundleToDelete) {
      if(showRecycleBin){
          permanentlyDeleteBundle(bundleToDelete.id);
      } else {
          deleteBundle(bundleToDelete.id);
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
      await archiveBundles(selectedBundleIds);
      handleToggleSelectMode();
  };
  
  const handleDeleteSelected = async () => {
    await deleteBundles(selectedBundleIds);
    setIsBulkDeleteConfirmOpen(false);
    handleToggleSelectMode();
  };

  const handleUnarchive = async (bundleId: string) => updateBundle(bundleId, { isArchived: false });
  const handleRestore = async (bundleId: string) => restoreBundle(bundleId);

  const handleBulkPermanentDelete = async () => {
    const ids = Array.from(selectedBundleIds);
    await permanentlyDeleteBundles(ids);
    setIsBulkPermanentDeleteConfirmOpen(false);
    handleToggleSelectMode();
  }
  
  const handleBulkUnarchive = async () => {
      await unarchiveBundles(selectedBundleIds);
      handleToggleSelectMode();
  }

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedBundleIds);
    await restoreBundles(ids);
    handleToggleSelectMode();
  }
  
  const handleDeleteAllFromBin = async () => {
    const ids = (deletedBundles || []).map(b => b.id);
    if (ids.length > 0) await permanentlyDeleteBundles(ids);
    setIsDeleteAllFromBinConfirmOpen(false);
  }
  
  const handleRestoreAllFromBin = async () => {
      const ids = (deletedBundles || []).map(b => b.id);
      if (ids.length > 0) await restoreBundles(ids);
      setIsRestoreAllFromBinConfirmOpen(false);
  }

  const handleMoveAllArchivedToBin = async () => {
    const ids = new Set((archivedBundles || []).map(b => b.id));
    if (ids.size > 0) await deleteBundles(ids);
    setIsMoveAllArchivedToBinConfirmOpen(false);
  }
  
  const handleUnarchiveAll = async () => {
      const ids = new Set((archivedBundles || []).map(b => b.id));
      if (ids.size > 0) await unarchiveBundles(ids);
      setIsUnarchiveAllConfirmOpen(false);
  }
  
  const allBundles = useMemo(() => {
    const baseList = bundles || [];
    const filterByQuery = (b: Bundle) => b.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const pinned = baseList.filter(b => b.isPinned && !b.isArchived && !b.isDeleted).filter(filterByQuery);
    const active = baseList.filter(b => !b.isPinned && !b.isArchived && !b.isDeleted).filter(filterByQuery);
    const archived = (archivedBundles || []).filter(filterByQuery);
    const deleted = (deletedBundles || []).filter(filterByQuery);
    
    return { pinned, active, archived, deleted };
  }, [bundles, archivedBundles, deletedBundles, searchQuery]);

  const currentList = showRecycleBin ? allBundles.deleted : showArchived ? allBundles.archived : [...allBundles.pinned, ...allBundles.active];

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

    return (
        <div 
          className={`bg-card border rounded-lg shadow-sm flex flex-col group transition-all duration-200 cursor-pointer
            ${!isSelectMode ? 'hover:shadow-md hover:border-primary/30' : ''}
            ${isSelected ? 'border-primary shadow-md ring-2 ring-primary' : 'border-border'}`
          }
          onClick={() => handleCardClick(bundle)}
        >
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 pr-2">
                        {bundle.isLocked && <IconLock size={16} className="text-muted-foreground flex-shrink-0" />}
                        <h3 className="text-lg font-bold text-card-foreground break-all">{bundle.title}</h3>
                    </div>
                    {isSelectMode ? (
                      <input type="checkbox" checked={isSelected} readOnly className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"/>
                    ) : (!showArchived && !showRecycleBin) && (
                      <div className="relative" ref={menuRef}>
                          <button onClick={toggleMenu} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><IconMoreVertical size={20} /></button>
                          {menuOpen && (
                              <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border">
                                  <ul className="py-1">
                                      <li><button onClick={e => handleAction(e, () => updateBundle(bundle.id, { isPinned: !bundle.isPinned }))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent">{bundle.isPinned ? <IconPinOff size={16}/> : <IconPin size={16}/>} {bundle.isPinned ? 'Unpin' : 'Pin'}</button></li>
                                      <li><button onClick={e => handleAction(e, () => duplicateBundle(bundle.id))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconCopy size={16}/> Duplicate</button></li>
                                      <li><button onClick={e => handleAction(e, () => { navigator.clipboard.writeText(bundle.title); showToast("Title copied!"); })} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconClipboardCopy size={16}/> Copy Title</button></li>
                                      <li><button onClick={e => handleAction(e, () => updateBundle(bundle.id, { isArchived: true }))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconArchive size={16}/> Archive</button></li>
                                      <li><button onClick={e => handleAction(e, () => openDeleteConfirm(bundle))} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive dark:text-red-500 hover:bg-destructive/10"><IconTrash size={16}/> Delete</button></li>
                                  </ul>
                              </div>
                          )}
                      </div>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{bundle.items.length} {bundle.items.length === 1 ? 'item' : 'items'}</p>
                {showRecycleBin && bundle.deletedAt && <p className="text-xs text-muted-foreground mt-1">Deleted: {new Date(bundle.deletedAt).toLocaleString()}</p>}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {bundle.items.slice(0, 7).map(item => getItemIcon(item))}
                    {bundle.items.length > 7 && <span className="text-xs text-muted-foreground">&hellip;</span>}
                </div>
            </div>
            {!showRecycleBin && (
              <div className="bg-muted/50 p-3 rounded-b-lg flex justify-between items-center gap-2 border-t border-border">
                  <p className="text-xs text-muted-foreground" title={`Created: ${new Date(bundle.createdAt).toLocaleString()}`}>Updated: {new Date(bundle.updatedAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                      {!isSelectMode && !showArchived && <button onClick={(e) => {e.stopPropagation(); onNavigateToShare(bundle.id);}} className="flex items-center justify-center h-9 w-9 text-sm font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors" title="Share"><IconShare2 size={16} /></button>}
                      <button onClick={(e) => {e.stopPropagation(); handleCardClick(bundle);}} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md ${showArchived ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 'text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm'} transition-transform ${!isSelectMode && "group-hover:scale-105"}`}>
                          {showArchived ? <IconArchiveRestore size={14}/> : <IconEdit size={14} />} {showArchived ? 'Unarchive' : 'Open'}
                      </button>
                  </div>
              </div>
            )}
             {showRecycleBin && (
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
  
  const MobileNavButton: React.FC<{ label: string, icon: React.ReactNode, isActive?: boolean, onClick: () => void, disabled?: boolean }> = ({ label, icon, isActive = false, onClick, disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'} disabled:text-muted-foreground/50 disabled:cursor-not-allowed`}>
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );

  const MobileSelectAction: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void, disabled?: boolean, isPrimary?: boolean }> = ({ label, icon, onClick, disabled=false, isPrimary=false }) => {
    if (isPrimary) {
      return (
        <button onClick={onClick} disabled={disabled} className="flex-1 flex flex-col items-center justify-center h-full text-primary disabled:text-muted-foreground/50">
          <div className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
              {icon}
          </div>
          <span className="text-xs font-medium mt-1">{label}</span>
        </button>
      );
    }
    return <MobileNavButton label={label} icon={icon} onClick={onClick} disabled={disabled} />;
  };

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
          {isSelectMode ? (
            <>
              <MobileNavButton label={`Cancel (${selectedBundleIds.size})`} icon={<IconX size={22}/>} onClick={handleToggleSelectMode} />
              {showRecycleBin ? (
                  <>
                    <MobileSelectAction label="Restore" icon={<IconHistory size={28}/>} onClick={handleBulkRestore} disabled={selectedBundleIds.size === 0} isPrimary />
                    <MobileSelectAction label="Delete" icon={<IconTrash size={22}/>} onClick={() => setIsBulkPermanentDeleteConfirmOpen(true)} disabled={selectedBundleIds.size === 0}/>
                  </>
              ) : showArchived ? (
                  <>
                    <MobileSelectAction label="Unarchive" icon={<IconArchiveRestore size={28}/>} onClick={handleBulkUnarchive} disabled={selectedBundleIds.size === 0} isPrimary />
                    <MobileSelectAction label="Delete" icon={<IconTrash size={22}/>} onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={selectedBundleIds.size === 0}/>
                  </>
              ) : (
                  <>
                    <MobileNavButton label="Archive" icon={<IconArchive size={22}/>} onClick={handleArchiveSelected} disabled={selectedBundleIds.size === 0}/>
                    <MobileSelectAction label="Merge" icon={<IconCopy size={28}/>} onClick={() => setIsMergeModalOpen(true)} disabled={selectedBundleIds.size < 2} isPrimary />
                    <MobileNavButton label="Delete" icon={<IconTrash size={22}/>} onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={selectedBundleIds.size === 0}/>
                  </>
              )}
            </>
          ) : showRecycleBin ? (
            <>
              <MobileNavButton label="Home" icon={<IconHome size={22}/>} onClick={onNavigateHome} />
              <MobileNavButton label="Restore All" icon={<IconHistory size={22}/>} onClick={() => setIsRestoreAllFromBinConfirmOpen(true)} disabled={!allBundles.deleted || allBundles.deleted.length === 0} />
              <button onClick={() => setIsDeleteAllFromBinConfirmOpen(true)} disabled={!allBundles.deleted || allBundles.deleted.length === 0} className="flex-1 flex flex-col items-center justify-center h-full text-destructive disabled:text-muted-foreground/50">
                  <div className="h-14 w-14 bg-destructive text-destructive-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
                      <IconTrash size={28} />
                  </div>
                  <span className="text-xs font-medium mt-1">Delete All</span>
              </button>
              <MobileNavButton label="Select" icon={<IconListChecks size={22}/>} onClick={handleToggleSelectMode} />
            </>
          ) : showArchived ? (
            <>
              <MobileNavButton label="Home" icon={<IconHome size={22}/>} onClick={onNavigateHome} />
              <button onClick={handleToggleSelectMode} className="flex-1 flex flex-col items-center justify-center h-full text-primary">
                  <div className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
                      <IconListChecks size={28} />
                  </div>
                  <span className="text-xs font-medium mt-1">Select</span>
              </button>
              <MobileNavButton label="Bin All" icon={<IconTrash size={22}/>} onClick={() => setIsMoveAllArchivedToBinConfirmOpen(true)} disabled={!allBundles.archived || allBundles.archived.length === 0} />
            </>
          ) : (
            <>
              <MobileNavButton label="Home" icon={<IconHome size={22}/>} isActive={!showArchived && !showRecycleBin} onClick={onNavigateHome} />
              <MobileNavButton label="Scan" icon={<IconScan size={22}/>} onClick={onOpenScanner} />
              <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 flex flex-col items-center justify-center h-full text-primary">
                  <div className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
                      <IconPlus size={28} />
                  </div>
                  <span className="text-xs font-medium mt-1">New</span>
              </button>
              <MobileNavButton label="Select" icon={<IconListChecks size={22}/>} isActive={isSelectMode} onClick={handleToggleSelectMode} />
              <MobileNavButton label="Import" icon={<IconUpload size={22}/>} onClick={handleImportClick} />
            </>
          )}
      </div>
      
      <div className="hidden sm:flex fixed bottom-4 right-4 z-30">
        {isSelectMode && (
          <div className="bg-background border border-border shadow-lg rounded-full flex items-center justify-between gap-2 p-2 pl-4">
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">{selectedBundleIds.size} selected</span>
              <div className="flex items-center gap-1">
                  {showRecycleBin ? (
                    <>
                      <button disabled={selectedBundleIds.size === 0} onClick={handleBulkRestore} className="p-2 text-muted-foreground enabled:hover:text-primary rounded-full disabled:opacity-50" title="Restore"><IconHistory size={20}/></button>
                      <button disabled={selectedBundleIds.size === 0} onClick={() => setIsBulkPermanentDeleteConfirmOpen(true)} className="p-2 text-muted-foreground enabled:hover:text-destructive rounded-full disabled:opacity-50" title="Delete Forever"><IconTrash size={20}/></button>
                    </>
                  ) : showArchived ? (
                    <>
                      <button disabled={selectedBundleIds.size === 0} onClick={handleBulkUnarchive} className="p-2 text-muted-foreground enabled:hover:text-primary rounded-full disabled:opacity-50" title="Unarchive"><IconArchiveRestore size={20}/></button>
                      <button disabled={selectedBundleIds.size === 0} onClick={() => setIsBulkDeleteConfirmOpen(true)} className="p-2 text-muted-foreground enabled:hover:text-destructive rounded-full disabled:opacity-50" title="Move to Bin"><IconRecycle size={20}/></button>
                    </>
                  ) : (
                    <>
                      <button disabled={selectedBundleIds.size < 2} onClick={() => setIsMergeModalOpen(true)} className="p-2 text-muted-foreground enabled:hover:text-primary rounded-full disabled:opacity-50" title="Merge"><IconCopy size={20}/></button>
                      <button disabled={selectedBundleIds.size === 0} onClick={handleArchiveSelected} className="p-2 text-muted-foreground enabled:hover:text-primary rounded-full disabled:opacity-50" title="Archive"><IconArchive size={20}/></button>
                      <button disabled={selectedBundleIds.size === 0} onClick={() => setIsBulkDeleteConfirmOpen(true)} className="p-2 text-muted-foreground enabled:hover:text-destructive rounded-full disabled:opacity-50" title="Delete"><IconTrash size={20}/></button>
                    </>
                  )}
                  <button onClick={handleToggleSelectMode} className="p-2 text-muted-foreground hover:bg-accent rounded-full"><IconX /></button>
              </div>
          </div>
        )}
      </div>

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
            {showRecycleBin ? (
                <>
                  <button onClick={() => setIsRestoreAllFromBinConfirmOpen(true)} disabled={!allBundles.deleted || allBundles.deleted.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 disabled:opacity-50"><IconHistory size={18} /> Restore All</button>
                  <button onClick={() => setIsDeleteAllFromBinConfirmOpen(true)} disabled={!allBundles.deleted || allBundles.deleted.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 disabled:opacity-50"><IconTrash size={18} /> Delete All</button>
                </>
            ) : showArchived ? (
                <>
                  <button onClick={() => setIsUnarchiveAllConfirmOpen(true)} disabled={!allBundles.archived || allBundles.archived.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 disabled:opacity-50"><IconArchiveRestore size={18} /> Unarchive All</button>
                  <button onClick={() => setIsMoveAllArchivedToBinConfirmOpen(true)} disabled={!allBundles.archived || allBundles.archived.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 disabled:opacity-50"><IconTrash size={18} /> Move all to Bin</button>
                </>
            ) : (
                <>
                    <button onClick={handleToggleSelectMode} className={`px-4 py-2 text-sm font-medium rounded-md ${isSelectMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>Select</button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"><IconPlus size={18} /> New</button>
                    <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20"><IconUpload size={18} /> Import</button>
                </>
            )}
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

          {currentList.length === 0 && (
            <div className="text-center py-16 px-6 bg-card border-2 border-dashed border-border rounded-lg">
              <IconPackage size={48} className="mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">{searchQuery ? 'No Matching Bundles' : 'No Bundles Here'}</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? 'Try adjusting your search query.' : (showRecycleBin ? 'Your recycle bin is empty.' : (showArchived ? 'You have no archived bundles.' : 'Create your first bundle to get started!'))}
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
      
      <Modal isOpen={isBulkPermanentDeleteConfirmOpen} onClose={() => setIsBulkPermanentDeleteConfirmOpen(false)} title={`Permanently Delete ${selectedBundleIds.size} Bundles`} footer={
        <><button onClick={() => setIsBulkPermanentDeleteConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleBulkPermanentDelete} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Delete Forever</button></>
      }>
        <p>Are you sure you want to permanently delete {selectedBundleIds.size} bundles? This action cannot be undone.</p>
      </Modal>
      
      <Modal isOpen={isDeleteAllFromBinConfirmOpen} onClose={() => setIsDeleteAllFromBinConfirmOpen(false)} title="Empty Recycle Bin" footer={
        <><button onClick={() => setIsDeleteAllFromBinConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleDeleteAllFromBin} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Delete Forever</button></>
      }>
        <p>Are you sure you want to permanently delete all {allBundles.deleted.length} bundles in the Recycle Bin? This action cannot be undone.</p>
      </Modal>
      
      <Modal isOpen={isRestoreAllFromBinConfirmOpen} onClose={() => setIsRestoreAllFromBinConfirmOpen(false)} title="Restore All" footer={
        <><button onClick={() => setIsRestoreAllFromBinConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleRestoreAllFromBin} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md">Restore All</button></>
      }>
        <p>Are you sure you want to restore all {allBundles.deleted.length} bundles from the Recycle Bin?</p>
      </Modal>

      <Modal isOpen={isUnarchiveAllConfirmOpen} onClose={() => setIsUnarchiveAllConfirmOpen(false)} title="Unarchive All" footer={
        <><button onClick={() => setIsUnarchiveAllConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleUnarchiveAll} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md">Unarchive All</button></>
      }>
        <p>Are you sure you want to unarchive all {allBundles.archived.length} bundles?</p>
      </Modal>
      
      <Modal isOpen={isMoveAllArchivedToBinConfirmOpen} onClose={() => setIsMoveAllArchivedToBinConfirmOpen(false)} title="Move All to Bin" footer={
        <><button onClick={() => setIsMoveAllArchivedToBinConfirmOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleMoveAllArchivedToBin} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Move to Bin</button></>
      }>
        <p>Are you sure you want to move all {allBundles.archived.length} archived bundles to the Recycle Bin?</p>
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
