import React, { useState, useRef, useCallback } from 'react';
import { useBundles } from '../hooks/useBundles';
import { IconPackage, IconPlus, IconTrash, IconEdit, IconUpload, IconMoreVertical, IconCopy, IconLink, IconNote, IconFile, IconX } from '../components/icons';
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
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [importConflict, setImportConflict] = useState<{ existingBundle: Bundle, newBundleData: Omit<Bundle, 'id'|'createdAt'|'updatedAt'> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBundle = async () => {
    if (newBundleTitle.trim()) {
      const newBundleId = await addBundle(newBundleTitle.trim());
      onNavigateToEditor(newBundleId);
      setNewBundleTitle('');
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
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
        // Reset file input to allow re-uploading the same file
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
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

    // Basic click outside handler
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col group">
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2 break-all pr-2">{bundle.title}</h3>
                    <div className="relative" ref={menuRef}>
                        <button onClick={toggleMenu} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <IconMoreVertical size={20} />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700">
                                <ul className="py-1">
                                    <li><button onClick={handleDuplicate} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><IconCopy size={16}/> Duplicate</button></li>
                                    <li><button onClick={handleDelete} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"><IconTrash size={16}/> Delete</button></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{bundle.items.length} items</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {bundle.items.slice(0, 5).map(item => {
                        switch(item.type) {
                            case ItemType.LINK: return <IconLink key={item.id} size={16} className="text-slate-400"/>;
                            case ItemType.NOTE: return <IconNote key={item.id} size={16} className="text-slate-400"/>;
                            case ItemType.FILE: return <IconFile key={item.id} size={16} className="text-slate-400"/>;
                            default: return null;
                        }
                    })}
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-b-lg flex justify-between items-center transition-colors">
                <p className="text-xs text-slate-400 dark:text-slate-500">Updated: {new Date(bundle.updatedAt).toLocaleDateString()}</p>
                <button onClick={() => onNavigateToEditor(bundle.id)} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary-hover shadow-sm transition-transform transform group-hover:scale-105">
                    <IconEdit size={14} />
                    Open
                </button>
            </div>
        </div>
    );
  };
  
  const QuickShare: React.FC<{}> = () => {
      const [type, setType] = useState<'link' | 'note'>('link');
      const [link, setLink] = useState('');
      const [note, setNote] = useState('');
      
      const handleQuickShare = async () => {
          if (type === 'link' && link.trim()) {
              const url = link.trim();
              const bundleId = await addBundle(url);
              const newItem: LinkItem = {
                  id: crypto.randomUUID(),
                  type: ItemType.LINK,
                  url: url,
                  title: url,
                  createdAt: new Date().toISOString(),
              };
              await addItemToBundle(bundleId, newItem);
              onNavigateToShare(bundleId);
              setLink('');
          } else if (type === 'note' && note.trim()) {
              const title = `Quick Note - ${new Date().toLocaleString()}`;
              const bundleId = await addBundle(title);
              const newItem: NoteItem = {
                  id: crypto.randomUUID(),
                  type: ItemType.NOTE,
                  text: note.trim(),
                  title: 'Quick Note',
                  createdAt: new Date().toISOString(),
              };
              await addItemToBundle(bundleId, newItem);
              onNavigateToShare(bundleId);
              setNote('');
          }
      };

      return (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quick Share</h2>
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                  <button onClick={() => setType('link')} className={`px-4 py-2 text-sm font-medium ${type === 'link' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`}>Link</button>
                  <button onClick={() => setType('note')} className={`px-4 py-2 text-sm font-medium ${type === 'note' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`}>Note</button>
              </div>
              {type === 'link' ? (
                  <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
              ) : (
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Type a quick note..." rows={3} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
              )}
              <button onClick={handleQuickShare} disabled={type === 'link' ? !link.trim() : !note.trim()} className="mt-4 w-full flex justify-center items-center gap-2 px-6 py-2 font-semibold text-white bg-secondary rounded-md hover:bg-secondary-hover disabled:bg-slate-400 dark:disabled:bg-slate-600">
                  Create & Share
              </button>
          </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
            <IconPackage size={40} className="text-primary" />
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">StaticLink Bundles</h1>
                <p className="text-slate-600 dark:text-slate-400">Create and manage your offline content bundles.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary dark:text-indigo-300 bg-primary-light dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800">
                <IconUpload size={18} />
                Import
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".slpkg" className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">Create New Bundle</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newBundleTitle}
                  onChange={(e) => setNewBundleTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBundle()}
                  placeholder="Enter bundle title..."
                  className="flex-grow px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleCreateBundle}
                  className="flex justify-center items-center gap-2 px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-hover disabled:bg-slate-400 dark:disabled:bg-slate-600"
                  disabled={!newBundleTitle.trim()}
                >
                  <IconPlus size={20} />
                  Create
                </button>
              </div>
          </div>

          {bundles && bundles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg">
              <IconPackage size={48} className="mx-auto text-slate-400" />
              <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">No Bundles Yet</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Create your first bundle or try a Quick Share!</p>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <QuickShare />
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion" footer={
        <>
          <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="px-4 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
            Delete
          </button>
        </>
      }>
        <p>Are you sure you want to delete the bundle "{bundleToDelete?.title}"? This action cannot be undone.</p>
      </Modal>

      <Modal isOpen={!!importConflict} onClose={() => setImportConflict(null)} title="Import Conflict" footer={
        <>
            <button onClick={() => setImportConflict(null)} className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
            <button onClick={handleImportKeepBoth} className="px-4 py-2 font-medium text-white bg-secondary rounded-md hover:bg-secondary-hover">Keep Both</button>
            <button onClick={handleImportReplace} className="px-4 py-2 font-medium text-white bg-primary rounded-md hover:bg-primary-hover">Replace</button>
        </>
      }>
        <p>A bundle named "{importConflict?.existingBundle.title}" already exists. How would you like to proceed?</p>
      </Modal>
    </div>
  );
};

export default HomeScreen;