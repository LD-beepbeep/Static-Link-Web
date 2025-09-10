import React, { useState, useRef } from 'react';
import { useBundles } from '../hooks/useBundles';
import { IconPackage, IconPlus, IconTrash, IconEdit, IconUpload, IconMoreVertical, IconCopy, IconLink, IconNote, IconFile, IconShare2, IconSearch } from '../components/icons';
import type { Bundle, LinkItem, NoteItem } from '../types';
import { ItemType } from '../types';
import Modal from '../components/Modal';
import { readPackage } from '../services/bundleService';

interface HomeScreenProps {
  onNavigateToEditor: (bundleId: string) => void;
  onNavigateToShare: (bundleId: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToEditor, onNavigateToShare }) => {
  const { bundles, addBundle, deleteBundle, importBundle, duplicateBundle, addItemToBundle } = useBundles();
  const [newBundleTitle, setNewBundleTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [importConflict, setImportConflict] = useState<{ existingBundle: Bundle, newBundleData: Omit<Bundle, 'id'|'createdAt'|'updatedAt'> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateBundle = async () => {
    if (newBundleTitle.trim() && !isCreating) {
      setIsCreating(true);
      const newBundleId = await addBundle(newBundleTitle.trim());
      onNavigateToEditor(newBundleId);
      setNewBundleTitle('');
      setIsCreating(false);
    }
  };

  const openDeleteConfirm = (bundle: Bundle) => {
    setBundleToDelete(bundle);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (bundleToDelete) {
      deleteBundle(bundleToDelete.id);
      setDeleteModalOpen(false);
      setBundleToDelete(null);
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const processImportFile = async (file: File) => {
     try {
        const newBundleData = await readPackage(file);
        const existingBundle = bundles?.find(b => b.title === newBundleData.title);
        if(existingBundle) {
          setImportConflict({ existingBundle, newBundleData });
        } else {
          const newBundleId = await importBundle(newBundleData);
          onNavigateToEditor(newBundleId);
        }
      } catch (error) {
        console.error("Failed to import bundle:", error);
        alert("Failed to import bundle. The file might be corrupted or in the wrong format.");
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImportFile(file);
    }
  };

  const handleImportReplace = async () => {
    if(importConflict) {
      await deleteBundle(importConflict.existingBundle.id);
      const newBundleId = await importBundle(importConflict.newBundleData);
      onNavigateToEditor(newBundleId);
      setImportConflict(null);
    }
  }

  const handleImportKeepBoth = async () => {
    if(importConflict) {
      const newBundleDataWithModifiedTitle = {
        ...importConflict.newBundleData,
        title: `${importConflict.newBundleData.title} (Copy)`
      };
      const newBundleId = await importBundle(newBundleDataWithModifiedTitle);
      onNavigateToEditor(newBundleId);
      setImportConflict(null);
    }
  }

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.slpkg')) {
      await processImportFile(file);
    } else if (file) {
      alert("Invalid file type. Please drop a .slpkg file.");
    }
  };
  
  const filteredBundles = bundles?.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const BundleCard: React.FC<{ bundle: Bundle }> = ({ bundle }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpen(prev => !prev);
    }

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateBundle(bundle.id);
        setMenuOpen(false);
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        openDeleteConfirm(bundle);
        setMenuOpen(false);
    }

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col group">
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-card-foreground mb-2 break-all pr-2">{bundle.title}</h3>
                    <div className="relative" ref={menuRef}>
                        <button onClick={toggleMenu} className="p-2 rounded-full text-muted-foreground hover:bg-accent">
                            <IconMoreVertical size={20} />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border">
                                <ul className="py-1">
                                    <li><button onClick={handleDuplicate} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconCopy size={16}/> Duplicate</button></li>
                                    <li><button onClick={handleDelete} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive dark:text-red-500 hover:bg-destructive/10"><IconTrash size={16}/> Delete</button></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{bundle.items.length} {bundle.items.length === 1 ? 'item' : 'items'}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {bundle.items.slice(0, 5).map(item => {
                        const iconProps = { key: item.id, size: 16, className: "text-muted-foreground" };
                        switch(item.type) {
                            case ItemType.LINK: return <IconLink {...iconProps}/>;
                            case ItemType.NOTE: return <IconNote {...iconProps}/>;
                            case ItemType.FILE: return <IconFile {...iconProps}/>;
                            default: return null;
                        }
                    })}
                </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-b-lg flex justify-between items-center gap-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Updated: {new Date(bundle.updatedAt).toLocaleDateString()}</p>
                <div className="flex items-center gap-2">
                    <button onClick={() => onNavigateToShare(bundle.id)} className="flex items-center justify-center h-9 w-9 text-sm font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors" title="Share">
                        <IconShare2 size={16} />
                    </button>
                    <button onClick={() => onNavigateToEditor(bundle.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 shadow-sm transition-transform transform group-hover:scale-105">
                        <IconEdit size={14} />
                        Open
                    </button>
                </div>
            </div>
        </div>
    );
  };
  
  const QuickShare: React.FC<{}> = () => {
      const [type, setType] = useState<'link' | 'note'>('link');
      const [link, setLink] = useState('');
      const [note, setNote] = useState('');
      const [isSharing, setIsSharing] = useState(false);
      
      const handleQuickShare = async () => {
          if (isSharing) return;
          setIsSharing(true);
          try {
            if (type === 'link' && link.trim()) {
                const url = link.trim();
                const bundleId = await addBundle(url);
                const newItem: LinkItem = { id: crypto.randomUUID(), type: ItemType.LINK, url: url, title: url, createdAt: new Date().toISOString() };
                await addItemToBundle(bundleId, newItem);
                onNavigateToShare(bundleId);
                setLink('');
            } else if (type === 'note' && note.trim()) {
                const title = `Quick Note - ${new Date().toLocaleString()}`;
                const bundleId = await addBundle(title);
                const newItem: NoteItem = { id: crypto.randomUUID(), type: ItemType.NOTE, text: note.trim(), title: 'Quick Note', createdAt: new Date().toISOString() };
                await addItemToBundle(bundleId, newItem);
                onNavigateToShare(bundleId);
                setNote('');
            }
          } finally {
            setIsSharing(false);
          }
      };

      return (
          <div className="bg-card border border-border p-5 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">Quick Share</h2>
              <div className="flex border-b border-border mb-4">
                  <button onClick={() => setType('link')} className={`px-4 py-2 text-sm font-medium transition-colors ${type === 'link' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Link</button>
                  <button onClick={() => setType('note')} className={`px-4 py-2 text-sm font-medium transition-colors ${type === 'note' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Note</button>
              </div>
              {type === 'link' ? (
                  <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"/>
              ) : (
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Type a quick note..." rows={3} className="w-full px-4 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"></textarea>
              )}
              <button onClick={handleQuickShare} disabled={isSharing || (type === 'link' ? !link.trim() : !note.trim())} className="mt-4 w-full flex justify-center items-center gap-2 px-6 py-2 font-semibold text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors">
                  {isSharing ? 'Sharing...' : 'Create & Share'}
              </button>
          </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative" onDragEnter={handleDragEnter}>
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Bundles</h1>
          <p className="text-muted-foreground">Create, manage, and search your offline content bundles.</p>
        </div>
        <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20">
          <IconUpload size={18} />
          Import Bundle
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".slpkg" className="hidden" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-border p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">Create New Bundle</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newBundleTitle}
                  onChange={(e) => setNewBundleTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBundle()}
                  placeholder="Enter bundle title..."
                  className="flex-grow px-4 py-2 bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleCreateBundle}
                  className="flex justify-center items-center gap-2 px-6 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
                  disabled={!newBundleTitle.trim() || isCreating}
                >
                  {isCreating ? <><div className="w-5 h-5 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin"></div><span>Creating...</span></> : <><IconPlus size={20} /><span>Create</span></>}
                </button>
              </div>
          </div>
          
           <div>
              <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bundles..."
                  className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {bundles && bundles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredBundles.map((bundle) => (
                    <BundleCard key={bundle.id} bundle={bundle} />
                  ))}
                  {filteredBundles.length === 0 && (
                    <div className="md:col-span-2 text-center py-16 px-6 bg-card border-2 border-dashed border-border rounded-lg">
                        <h3 className="text-xl font-semibold text-foreground">No Matching Bundles</h3>
                        <p className="mt-2 text-muted-foreground">Try adjusting your search query.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 px-6 bg-card border-2 border-dashed border-border rounded-lg">
                  <IconPackage size={48} className="mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-xl font-semibold text-foreground">No Bundles Yet</h3>
                  <p className="mt-2 text-muted-foreground">Create your first bundle or try a Quick Share!</p>
                </div>
              )}
           </div>
        </div>
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <QuickShare />
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion" footer={
        <>
          <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90">
            Delete
          </button>
        </>
      }>
        <p>Are you sure you want to delete the bundle "{bundleToDelete?.title}"? This action cannot be undone.</p>
      </Modal>

      <Modal isOpen={!!importConflict} onClose={() => setImportConflict(null)} title="Import Conflict" footer={
        <>
            <button onClick={() => setImportConflict(null)} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">Cancel</button>
            <button onClick={handleImportKeepBoth} className="px-4 py-2 font-medium text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90">Keep Both</button>
            <button onClick={handleImportReplace} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">Replace</button>
        </>
      }>
        <p>A bundle named "{importConflict?.existingBundle.title}" already exists. How would you like to proceed?</p>
      </Modal>

      {isDragging && (
          <div 
            onDragLeave={handleDragLeave} 
            onDrop={handleDrop} 
            onDragOver={handleDragOver} 
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-primary rounded-lg"
          >
              <div className="text-center p-4">
                  <IconUpload size={64} className="text-primary-foreground mx-auto" />
                  <p className="mt-4 text-2xl font-bold text-primary-foreground">Drop .slpkg file to import</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default HomeScreen;