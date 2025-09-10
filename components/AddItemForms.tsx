
import React, { useState } from 'react';
import { useBundles } from '../hooks/useBundles';
import { IconFile, IconLink, IconNote, IconPlus } from './icons';
import { calculateChecksum, fileToBase64 } from '../services/bundleService';
import { ItemType } from '../types';
import type { FileItem, LinkItem, NoteItem } from '../types';

interface AddItemFormsProps {
  bundleId: string;
}

export const AddItemForms: React.FC<AddItemFormsProps> = ({ bundleId }) => {
  const [activeForm, setActiveForm] = useState<ItemType | null>(null);
  const { addItemToBundle } = useBundles();

  const handleAddLink = async (url: string, title: string) => {
    const newItem: LinkItem = {
      id: crypto.randomUUID(),
      type: ItemType.LINK,
      url,
      title: title || url,
      createdAt: new Date().toISOString(),
    };
    await addItemToBundle(bundleId, newItem);
    setActiveForm(null);
  };

  const handleAddNote = async (text: string, title: string) => {
    const newItem: NoteItem = {
      id: crypto.randomUUID(),
      type: ItemType.NOTE,
      text,
      title: title || `Note ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString(),
    };
    await addItemToBundle(bundleId, newItem);
    setActiveForm(null);
  };
  
  const handleAddFile = async (file: File) => {
    if (!file) return;
    const checksum = await calculateChecksum(file);
    const content = await fileToBase64(file);
    const newItem: FileItem = {
      id: crypto.randomUUID(),
      type: ItemType.FILE,
      title: file.name,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      content,
      checksum,
      createdAt: new Date().toISOString(),
    };
    await addItemToBundle(bundleId, newItem);
    setActiveForm(null);
  };

  const renderForm = () => {
    switch (activeForm) {
      case ItemType.LINK:
        return <AddLinkForm onSubmit={handleAddLink} onCancel={() => setActiveForm(null)} />;
      case ItemType.NOTE:
        return <AddNoteForm onSubmit={handleAddNote} onCancel={() => setActiveForm(null)} />;
      case ItemType.FILE:
        return <AddFileForm onSubmit={handleAddFile} onCancel={() => setActiveForm(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="my-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {activeForm ? (
        renderForm()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setActiveForm(ItemType.LINK)} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow">
            <IconLink size={32} className="text-brand-primary mb-2" />
            <span className="font-semibold">Add Link</span>
          </button>
          <button onClick={() => setActiveForm(ItemType.NOTE)} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow">
            <IconNote size={32} className="text-brand-secondary mb-2" />
            <span className="font-semibold">Add Note</span>
          </button>
          <button onClick={() => setActiveForm(ItemType.FILE)} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow">
            <IconFile size={32} className="text-orange-500 mb-2" />
            <span className="font-semibold">Add File</span>
          </button>
        </div>
      )}
    </div>
  );
};


const AddLinkForm: React.FC<{ onSubmit: (url: string, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) onSubmit(url, title);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center">Add a New Link</h3>
            <div>
                <label htmlFor="link-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL</label>
                <input type="url" id="link-url" value={url} onChange={e => setUrl(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" placeholder="https://example.com" />
            </div>
            <div>
                <label htmlFor="link-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title (Optional)</label>
                <input type="text" id="link-title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" placeholder="My Awesome Link" />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={16}/> Add Link</button>
            </div>
        </form>
    );
};

const AddNoteForm: React.FC<{ onSubmit: (text: string, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [text, setText] = useState('');
    const [title, setTitle] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text) onSubmit(text, title);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center">Add a New Note</h3>
             <div>
                <label htmlFor="note-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title (Optional)</label>
                <input type="text" id="note-title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" placeholder="My Important Note" />
            </div>
            <div>
                <label htmlFor="note-text" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Content</label>
                <textarea id="note-text" value={text} onChange={e => setText(e.target.value)} required rows={4} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" placeholder="Type your note here..."></textarea>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={16}/> Add Note</button>
            </div>
        </form>
    );
};

const AddFileForm: React.FC<{ onSubmit: (file: File) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file) onSubmit(file);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center">Add a New File</h3>
            <div>
                <label htmlFor="file-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select File</label>
                <input type="file" id="file-input" onChange={handleFileChange} required className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-brand-primary dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800" />
            </div>
            {file && <p className="text-sm text-slate-500 dark:text-slate-400">Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={16}/> Add File</button>
            </div>
        </form>
    );
};
