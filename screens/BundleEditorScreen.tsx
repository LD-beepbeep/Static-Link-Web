import React, { useState, useEffect } from 'react';
import { useBundles } from '../hooks/useBundles';
import { ItemType } from '../types';
import type { BundleItem, FileItem, LinkItem, NoteItem } from '../types';
import { IconArrowLeft, IconChevronDown, IconChevronUp, IconDownload, IconFile, IconLink, IconNote, IconTrash, IconShare2, IconCopy, IconCheck } from '../components/icons';
import { AddItemForms } from '../components/AddItemForms';
import { base64ToBlob } from '../services/bundleService';
import saveAs from 'file-saver';
import Modal from '../components/Modal';

interface BundleEditorScreenProps {
  bundleId: string;
  onBack: () => void;
  onNavigateToShare: (bundleId: string) => void;
}

const BundleEditorScreen: React.FC<BundleEditorScreenProps> = ({ bundleId, onBack, onNavigateToShare }) => {
  const { getBundle, updateBundle, removeItemFromBundle, moveItemInBundle } = useBundles();
  const bundle = getBundle(bundleId);
  const [title, setTitle] = useState(bundle?.title || '');
  const [itemToDelete, setItemToDelete] = useState<BundleItem | null>(null);

  useEffect(() => {
    setTitle(bundle?.title || '');
  }, [bundle?.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  const handleTitleBlur = () => {
    if (bundle && title.trim() && title !== bundle.title) {
      updateBundle(bundle.id, { title });
    } else {
        setTitle(bundle?.title || '');
    }
  };

  const handleDeleteConfirm = () => {
    if(itemToDelete && bundle) {
        removeItemFromBundle(bundle.id, itemToDelete.id);
        setItemToDelete(null);
    }
  }

  if (!bundle) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading bundle...</p>
        </div>
      </div>
    );
  }

  const ItemCard: React.FC<{ item: BundleItem, index: number }> = ({ item, index }) => {
    const [copied, setCopied] = useState(false);
    const isFirst = index === 0;
    const isLast = index === bundle.items.length - 1;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    
    const handleDownloadFile = (fileItem: FileItem) => {
        const blob = base64ToBlob(fileItem.content, fileItem.mimeType);
        saveAs(blob, fileItem.filename);
    }

    const renderItemContent = () => {
      switch (item.type) {
        case ItemType.LINK:
          const link = item as LinkItem;
          return <p className="text-sm text-primary truncate hover:underline"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a></p>;
        case ItemType.NOTE:
          const note = item as NoteItem;
          return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.text.substring(0, 100)}{note.text.length > 100 ? '...' : ''}</p>;
        case ItemType.FILE:
          const file = item as FileItem;
          return (
            <div className="flex items-center gap-2">
              <IconFile size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground">{file.filename}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          );
        default:
          return null;
      }
    };

    const getItemIcon = () => {
        switch (item.type) {
            case ItemType.LINK: return <IconLink className="text-primary" />;
            case ItemType.NOTE: return <IconNote className="text-secondary" />;
            case ItemType.FILE: return <IconFile className="text-orange-500" />;
            default: return null;
        }
    };
    
    return (
      <div className="bg-card p-4 rounded-lg border border-border flex items-start gap-4 transition-shadow hover:shadow-md">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-accent rounded-full">
            {getItemIcon()}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className="font-semibold text-card-foreground truncate">{item.title}</h4>
          {renderItemContent()}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            {item.type === ItemType.FILE && <button title="Download" onClick={() => handleDownloadFile(item)} className="p-2 text-muted-foreground hover:text-primary rounded-full hover:bg-accent"><IconDownload size={18} /></button>}
            {item.type === ItemType.LINK && <button title="Copy URL" onClick={() => handleCopy(item.url)} className="p-2 text-muted-foreground hover:text-primary rounded-full hover:bg-accent">{copied ? <IconCheck size={18} className="text-green-500" /> : <IconCopy size={18} />}</button>}
            {item.type === ItemType.NOTE && <button title="Copy Text" onClick={() => handleCopy(item.text)} className="p-2 text-muted-foreground hover:text-primary rounded-full hover:bg-accent">{copied ? <IconCheck size={18} className="text-green-500" /> : <IconCopy size={18} />}</button>}

            <div className="flex flex-col border-l border-border ml-1 pl-1">
                <button title="Move Up" disabled={isFirst} onClick={() => moveItemInBundle(bundleId, index, index-1)} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"><IconChevronUp size={16}/></button>
                <button title="Move Down" disabled={isLast} onClick={() => moveItemInBundle(bundleId, index, index+1)} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"><IconChevronDown size={16}/></button>
            </div>
            <button title="Delete Item" onClick={() => setItemToDelete(item)} className="p-2 text-muted-foreground hover:text-destructive rounded-full hover:bg-accent">
                <IconTrash size={18} />
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-4">
          <IconArrowLeft size={16} />
          Back to My Bundles
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="text-3xl font-bold bg-transparent focus:outline-none w-full text-foreground -ml-1 p-1 rounded-md focus:bg-accent"
            aria-label="Bundle Title"
          />
          <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-muted px-3 py-1.5 rounded-full">{bundle.items.length} {bundle.items.length === 1 ? 'item' : 'items'}</span>
            <button onClick={() => onNavigateToShare(bundle.id)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 font-semibold text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90 shadow-sm transition-colors">
              <IconShare2 size={18} />
              Share / Export
            </button>
          </div>
        </div>
      </header>

      <AddItemForms bundleId={bundle.id} />

      <div className="space-y-4">
        {bundle.items.length > 0 ? (
          bundle.items.map((item, index) => <ItemCard key={item.id} item={item} index={index} />)
        ) : (
          <div className="text-center py-16 px-6 bg-card rounded-lg border-2 border-dashed border-border">
            <h3 className="text-xl font-semibold text-foreground">This bundle is empty</h3>
            <p className="mt-2 text-muted-foreground">Add a link, note, or file to get started.</p>
          </div>
        )}
      </div>
      
      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Delete Item" footer={
        <>
          <button onClick={() => setItemToDelete(null)} className="px-4 py-2 font-medium bg-muted text-foreground rounded-md hover:bg-accent">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90">
            Delete Item
          </button>
        </>
      }>
        <p>Are you sure you want to delete the item "{itemToDelete?.title}"? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default BundleEditorScreen;