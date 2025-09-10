
import React, { useState, useEffect } from 'react';
import { useBundles } from '../hooks/useBundles';
import { ItemType } from '../types';
import type { BundleItem, FileItem, LinkItem, NoteItem } from '../types';
import { IconArrowLeft, IconChevronDown, IconChevronUp, IconDownload, IconFile, IconLink, IconNote, IconTrash, IconShare2, IconCopy, IconCheck } from '../components/icons';
import { AddItemForms } from '../components/AddItemForms';
import { base64ToBlob } from '../services/bundleService';
import saveAs from 'file-saver';

interface BundleEditorScreenProps {
  bundleId: string;
  onBack: () => void;
  onNavigateToShare: (bundleId: string) => void;
}

const BundleEditorScreen: React.FC<BundleEditorScreenProps> = ({ bundleId, onBack, onNavigateToShare }) => {
  const { getBundle, updateBundle, removeItemFromBundle, moveItemInBundle } = useBundles();
  const bundle = getBundle(bundleId);
  const [title, setTitle] = useState(bundle?.title || '');

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

  if (!bundle) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
            <p className="mt-4">Loading bundle...</p>
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
          return <p className="text-sm text-blue-500 truncate hover:underline"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a></p>;
        case ItemType.NOTE:
          const note = item as NoteItem;
          return <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{note.text.substring(0, 100)}{note.text.length > 100 ? '...' : ''}</p>;
        case ItemType.FILE:
          const file = item as FileItem;
          return (
            <div className="flex items-center gap-2">
              <IconFile size={16} className="text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{file.filename}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">({(file.size / 1024).toFixed(2)} KB)</span>
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
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-start gap-4 transition-shadow hover:shadow-lg">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full">
            {getItemIcon()}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</h4>
          {renderItemContent()}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            {item.type === ItemType.FILE && <button onClick={() => handleDownloadFile(item)} className="p-2 text-slate-500 hover:text-primary dark:hover:text-primary-light rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><IconDownload size={18} /></button>}
            {item.type === ItemType.LINK && <button onClick={() => handleCopy(item.url)} className="p-2 text-slate-500 hover:text-primary dark:hover:text-primary-light rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">{copied ? <IconCheck size={18} className="text-green-500" /> : <IconCopy size={18} />}</button>}
            {item.type === ItemType.NOTE && <button onClick={() => handleCopy(item.text)} className="p-2 text-slate-500 hover:text-primary dark:hover:text-primary-light rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">{copied ? <IconCheck size={18} className="text-green-500" /> : <IconCopy size={18} />}</button>}

            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 ml-1 pl-1">
                <button disabled={isFirst} onClick={() => moveItemInBundle(bundleId, index, index-1)} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><IconChevronUp size={16}/></button>
                <button disabled={isLast} onClick={() => moveItemInBundle(bundleId, index, index+1)} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><IconChevronDown size={16}/></button>
            </div>
            <button onClick={() => removeItemFromBundle(bundle.id, item.id)} className="p-2 text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
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
          Back to Bundles
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            className="text-3xl font-bold bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none w-full text-slate-900 dark:text-slate-50"
            aria-label="Bundle Title"
          />
          <button onClick={() => onNavigateToShare(bundle.id)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 font-semibold text-white bg-secondary rounded-md hover:bg-secondary-hover shadow-sm">
            <IconShare2 size={18} />
            Share / Export
          </button>
        </div>
      </header>

      <AddItemForms bundleId={bundle.id} />

      <div className="space-y-4">
        {bundle.items.length > 0 ? (
          bundle.items.map((item, index) => <ItemCard key={item.id} item={item} index={index} />)
        ) : (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">This bundle is empty</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Add a link, note, or file to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleEditorScreen;