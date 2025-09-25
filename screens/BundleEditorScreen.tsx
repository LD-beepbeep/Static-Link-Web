import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBundles } from '../hooks/useBundles';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ItemType } from '../types';
import type { Bundle, BundleItem, FileItem, LinkItem, NoteItem, AudioItem, ChecklistItem, ContactItem, LocationItem, DrawingItem, EmailItem, CodeSnippetItem, ChecklistEntry, QrCodeItem } from '../types';
import { IconArrowLeft, IconDownload, IconTrash, IconShare2, IconCopy, IconMic, IconListChecks, IconContact, IconMapPin, IconPenSquare, IconMail, IconCode, IconSearch, IconLock, IconUnlock, IconEdit, IconX, IconPlus, IconGripVertical, IconPalette, IconBold, IconItalic, IconCodeInline, IconQuote, IconList, IconPin, IconPinOff, IconClipboardCopy, IconMoreVertical } from '../components/icons';
import { AddItemForms } from '../components/AddItemForms';
import { base64ToBlob } from '../services/bundleService';
import saveAs from 'file-saver';
import Modal from '../components/Modal';
import showdown from 'showdown';
import { useToast } from '../App';
import { QRCodeSVG } from 'qrcode.react';

interface BundleEditorScreenProps {
  bundleId: string;
  onBack: () => void;
  onNavigateToShare: (bundleId: string) => void;
}

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const markdownConverter = new showdown.Converter({ sanitize: true });

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return <>{parts.map((part, i) => regex.test(part) ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>)}</>;
};

const NoteItemCard: React.FC<{ item: NoteItem; onUpdate: (updates: Partial<NoteItem>) => void }> = ({ item, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(item.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = () => { onUpdate({ text: editText }); setIsEditing(false); };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (isEditing && (e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, editText]);

    const applyStyle = (style: 'bold' | 'italic' | 'code' | 'quote' | 'list') => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd, value } = textarea;
        const selectedText = value.substring(selectionStart, selectionEnd);
        let newText;
        switch(style) {
            case 'bold': newText = `**${selectedText}**`; break;
            case 'italic': newText = `*${selectedText}*`; break;
            case 'code': newText = `\`${selectedText}\``; break;
            case 'quote': newText = `> ${selectedText.replace(/\n/g, '\n> ')}`; break;
            case 'list': newText = selectedText.split('\n').map(line => `- ${line}`).join('\n'); break;
        }
        setEditText(value.substring(0, selectionStart) + newText + value.substring(selectionEnd));
        textarea.focus();
    };

    if (isEditing) {
        return (
            <div className="mt-2 space-y-2">
                 <div className="flex items-center gap-1 border border-input rounded-t-md p-1 bg-muted/50">
                    <button onClick={() => applyStyle('bold')} title="Bold (Ctrl+B)" className="p-2 rounded hover:bg-accent"><IconBold size={16}/></button>
                    <button onClick={() => applyStyle('italic')} title="Italic (Ctrl+I)" className="p-2 rounded hover:bg-accent"><IconItalic size={16}/></button>
                    <button onClick={() => applyStyle('code')} title="Code" className="p-2 rounded hover:bg-accent"><IconCodeInline size={16}/></button>
                    <button onClick={() => applyStyle('quote')} title="Quote" className="p-2 rounded hover:bg-accent"><IconQuote size={16}/></button>
                    <button onClick={() => applyStyle('list')} title="List" className="p-2 rounded hover:bg-accent"><IconList size={16}/></button>
                </div>
                <textarea ref={textareaRef} value={editText} onChange={(e) => setEditText(e.target.value)} rows={8} autoFocus className="w-full text-sm p-2 bg-transparent border border-input rounded-b-md focus:outline-none focus:ring-1 focus:ring-ring font-mono" placeholder="Write in Markdown..."/>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-medium text-foreground bg-muted rounded-md hover:bg-accent">Cancel</button>
                    <button onClick={handleSave} className="px-3 py-1 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">Save (Ctrl+S)</button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground mt-2" dangerouslySetInnerHTML={{ __html: markdownConverter.makeHtml(item.text) }} />
            <button onClick={() => setIsEditing(true)} className="absolute -top-1 -right-1 p-1.5 text-muted-foreground hover:text-primary rounded-full hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity" title="Edit note"><IconEdit size={14} /></button>
        </div>
    );
};
  
const ContactAvatar: React.FC<{ firstName?: string; lastName?: string }> = React.memo(({ firstName = '', lastName = '' }) => {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const charCodeSum = (firstName.charCodeAt(0) || 77) + (lastName.charCodeAt(0) || 97);
    const colors = ['bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200', 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200', 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200', 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200', 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200', 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200'];
    const colorClass = colors[charCodeSum % colors.length];
    return <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colorClass}`}>{initials}</div>;
});

const CodeItemCard: React.FC<{ item: CodeSnippetItem }> = React.memo(({ item }) => {
    const codeRef = React.useRef<HTMLElement>(null);
    React.useEffect(() => {
        if (codeRef.current && (window as any).hljs) (window as any).hljs.highlightElement(codeRef.current);
    }, [item.language, item.code]);
    return <div className="mt-2"><span className="text-xs font-semibold uppercase text-muted-foreground bg-muted px-2 py-1 rounded-md">{item.language}</span><pre className="mt-2 text-sm"><code ref={codeRef} className={`language-${item.language}`}>{item.code}</code></pre></div>;
});

const ChecklistCard: React.FC<{ item: ChecklistItem; onUpdate: (updates: Partial<ChecklistItem>) => void; }> = ({ item, onUpdate }) => {
    const [newItemText, setNewItemText] = useState('');

    const handleUpdate = (newItems: ChecklistEntry[]) => onUpdate({ items: newItems });

    const toggleItem = (id: string) => {
        const newItems = JSON.parse(JSON.stringify(item.items));
        const findAndToggle = (nodes: ChecklistEntry[]): boolean => {
            for (const node of nodes) {
                if (node.id === id) { node.checked = !node.checked; return true; }
                if (node.children && findAndToggle(node.children)) return true;
            }
            return false;
        };
        findAndToggle(newItems);
        handleUpdate(newItems);
    };

    const removeItem = (id: string) => {
        const newItems = JSON.parse(JSON.stringify(item.items));
        const findAndRemove = (nodes: ChecklistEntry[]): ChecklistEntry[] => {
            return nodes.filter(node => {
                if (node.id === id) return false;
                if (node.children) node.children = findAndRemove(node.children);
                return true;
            });
        };
        handleUpdate(findAndRemove(newItems));
    };

    const addItem = () => {
        if (!newItemText.trim()) return;
        handleUpdate([...item.items, { id: crypto.randomUUID(), text: newItemText.trim(), checked: false }]);
        setNewItemText('');
    };
    
    const countItems = (items: ChecklistEntry[]): { total: number, checked: number } => items.reduce((acc, item) => {
        const childCounts = item.children ? countItems(item.children) : { total: 0, checked: 0 };
        return { total: acc.total + 1 + childCounts.total, checked: acc.checked + (item.checked ? 1 : 0) + childCounts.checked };
    }, { total: 0, checked: 0 });

    const { total, checked } = countItems(item.items);
    const progress = total > 0 ? (checked / total) * 100 : 0;

    const renderItem = (checkItem: ChecklistEntry) => (
        <li key={checkItem.id} className="group flex items-center gap-3 py-1.5">
            <input 
                id={`checkbox-${checkItem.id}`}
                type="checkbox" 
                checked={checkItem.checked} 
                onChange={() => toggleItem(checkItem.id)} 
                className="h-5 w-5 rounded border-input text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-card"
            />
            <label htmlFor={`checkbox-${checkItem.id}`} className={`flex-grow cursor-pointer ${checkItem.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {checkItem.text}
            </label>
            <button onClick={() => removeItem(checkItem.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                <IconX size={16} />
            </button>
        </li>
    );

    return (
        <div className="space-y-3 mt-2">
            {total > 0 && (
                <div>
                    <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                        <span>{Math.round(progress)}% Complete</span>
                        <span>{checked} / {total} Tasks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                </div>
            )}
            <ul className="space-y-1">{item.items.map(renderItem)}</ul>
            <div className="flex gap-2 pt-2 border-t border-border">
                <input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Add a task..." className="flex-grow text-sm px-3 py-1.5 bg-transparent border border-input rounded-md focus:ring-1 focus:ring-ring focus:outline-none"/>
                <button onClick={addItem} className="px-4 py-1.5 text-sm font-medium text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90">Add</button>
            </div>
        </div>
    );
};


const FilePreviewModal: React.FC<{ item: FileItem; onClose: () => void }> = ({ item, onClose }) => {
    return (
        <Modal isOpen={true} onClose={onClose} title={item.title}>
            <div className="w-full h-[70vh] bg-muted rounded-md">
                <iframe src={item.content} title={item.title} className="w-full h-full border-0 rounded-md" />
            </div>
        </Modal>
    );
};

const ItemCard = React.memo<{
    item: BundleItem; onUpdateItem: (updates: Partial<BundleItem>) => void; onDeleteItem: (item: BundleItem) => void; onDuplicateItem: () => void; searchQuery: string;
    isSelectMode: boolean; isSelected: boolean; onToggleSelect: () => void;
}>(({ item, onUpdateItem, onDeleteItem, onDuplicateItem, searchQuery, isSelectMode, isSelected, onToggleSelect }) => {
    const { showToast } = useToast();
    const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'color'>('main');
    const menuRef = useRef<HTMLDivElement>(null);

    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); showToast('Copied to clipboard!'); }
    const handleDownload = (itemWithContent: {content: string, mimeType: string, filename: string}) => saveAs(base64ToBlob(itemWithContent.content, itemWithContent.mimeType), itemWithContent.filename);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderItemContent = () => {
      switch (item.type) {
        case ItemType.LINK: return <p className="text-sm text-primary truncate hover:underline mt-2"><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></p>;
        case ItemType.NOTE: return <NoteItemCard item={item as NoteItem} onUpdate={onUpdateItem} />;
        case ItemType.FILE:
            const file = item as FileItem;
            const canPreview = file.mimeType === 'application/pdf' || file.mimeType.startsWith('text/');
            if (file.mimeType.startsWith('image/')) return <img src={file.content} alt={file.filename} className="mt-2 max-h-48 rounded-md object-contain"/>;
            if (canPreview) return <button onClick={() => setIsFilePreviewOpen(true)} className="text-sm text-primary hover:underline mt-2 text-left">{file.filename}</button>;
            return <p className="text-sm text-foreground mt-2">{file.filename} <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span></p>;
        case ItemType.AUDIO: return <audio src={item.content} controls className="w-full mt-2 h-10" />;
        case ItemType.CHECKLIST: return <ChecklistCard item={item as ChecklistItem} onUpdate={onUpdateItem as (updates: Partial<ChecklistItem>) => void} />;
        case ItemType.CONTACT:
            const c = item as ContactItem;
            return <div className="flex items-center gap-4 mt-2"><ContactAvatar firstName={c.firstName} lastName={c.lastName} /><div className="text-sm text-muted-foreground space-y-1">{(c.firstName || c.lastName) && <p className="font-semibold text-foreground">{c.firstName} {c.lastName}</p>}{c.phone && <p>{c.phone}</p>}{c.email && <p>{c.email}</p>}</div></div>;
        case ItemType.LOCATION: return <a href={`https://www.google.com/maps?q=${(item as LocationItem).latitude},${(item as LocationItem).longitude}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 block">{(item as LocationItem).address || `${(item as LocationItem).latitude}, ${(item as LocationItem).longitude}`}</a>;
        case ItemType.DRAWING: return <img src={item.content} alt={item.title} className="mt-2 max-h-48 rounded-md border border-border" />
        case ItemType.EMAIL: return <div className="text-sm mt-2 space-y-1"><p><strong className="text-muted-foreground">To:</strong> {(item as EmailItem).to}</p><p className="text-muted-foreground whitespace-pre-wrap">{(item as EmailItem).body.substring(0,100)}{(item as EmailItem).body.length > 100 ? '...' : ''}</p></div>;
        case ItemType.CODE: return <CodeItemCard item={item as CodeSnippetItem} />;
        case ItemType.QR_CODE: return <div className="mt-2 p-2 bg-white inline-block rounded-md"><QRCodeSVG value={(item as QrCodeItem).content} size={128} /></div>;
        default: return null;
      }
    };
    
    const cardContent = (
        <div className={`p-4 rounded-lg border flex items-start gap-3 transition-all duration-200 ${item.color || 'bg-card'} ${isSelected ? 'ring-2 ring-primary' : ''}`} style={{ borderColor: item.color ? 'transparent' : 'hsl(var(--border))' }}>
            {!isSelectMode && <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"><IconGripVertical size={20} /></div>}
            {isSelectMode && <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-2 flex-shrink-0"/>}
            <div className="flex-grow min-w-0" onClick={() => isSelectMode && onToggleSelect()}>
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-card-foreground truncate flex-grow pr-2"><HighlightedText text={item.title} highlight={searchQuery} /></h4>
                    {!isSelectMode && (
                        <div className="relative flex-shrink-0" ref={menuRef}>
                            <button onClick={() => { setIsMenuOpen(p => !p); if (!isMenuOpen) setMenuView('main'); }} className="p-2 text-muted-foreground hover:bg-accent rounded-full -mr-2 -mt-1"><IconMoreVertical size={18} /></button>
                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-auto bg-popover rounded-md shadow-lg z-20 border border-border">
                                    {menuView === 'main' ? (
                                        <ul className="py-1 w-48">
                                            <li><button onClick={() => { onUpdateItem({ isPinned: !item.isPinned }); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent">{item.isPinned ? <IconPinOff size={16}/> : <IconPin size={16}/>} {item.isPinned ? 'Unpin' : 'Pin'}</button></li>
                                            <li><button onClick={() => { onDuplicateItem(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconCopy size={16}/> Duplicate</button></li>
                                            {(item.type === ItemType.LINK || item.type === ItemType.NOTE || item.type === ItemType.CODE) && <li><button onClick={() => { handleCopy((item as any).url || (item as any).text || (item as any).code); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconClipboardCopy size={16}/> Copy Content</button></li>}
                                            {(item.type === ItemType.FILE || item.type === ItemType.AUDIO || item.type === ItemType.DRAWING) && <li><button onClick={() => { handleDownload(item as any); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconDownload size={16}/> Download</button></li>}
                                            <li><button onClick={() => setMenuView('color')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent"><IconPalette size={16}/> Color</button></li>
                                            <li><button onClick={() => { onDeleteItem(item); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"><IconTrash size={16}/> Delete</button></li>
                                        </ul>
                                    ) : (
                                        <div>
                                            <div className="flex items-center p-1 border-b border-border">
                                                <button onClick={() => setMenuView('main')} className="p-2 rounded-full hover:bg-accent"><IconArrowLeft size={16}/></button>
                                                <span className="text-sm font-semibold mx-auto pr-8">Select Color</span>
                                            </div>
                                            <div className="p-2 flex justify-center gap-2">
                                                {['bg-red-500/20', 'bg-yellow-500/20', 'bg-green-500/20', 'bg-blue-500/20', 'bg-indigo-500/20', 'bg-purple-500/20'].map(c => 
                                                    <button key={c} onClick={() => { onUpdateItem({ color: c }); setIsMenuOpen(false); }} className={`w-6 h-6 rounded-full ${c.replace('/20', '')} hover:scale-110 transition-transform ring-2 ring-offset-2 ring-offset-popover ${item.color === c ? 'ring-primary' : 'ring-transparent'}`}/>
                                                )}
                                            </div>
                                            <button onClick={() => { onUpdateItem({ color: '' }); setIsMenuOpen(false); }} className="w-full text-xs text-center p-2 hover:bg-accent rounded-b-md border-t border-border">Clear Color</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {renderItemContent()}
            </div>
        </div>
    );

    return (
      <>
        {isFilePreviewOpen && item.type === ItemType.FILE && <FilePreviewModal item={item as FileItem} onClose={() => setIsFilePreviewOpen(false)} />}
        {cardContent}
      </>
    );
});

const BundleEditorSkeleton: React.FC = () => (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse"><div className="h-6 w-1/3 bg-muted rounded-md mb-4"></div><div className="mb-6"><div className="h-10 w-2/3 bg-muted rounded-md mb-2"></div><div className="flex justify-end gap-2"><div className="h-9 w-24 bg-muted rounded-full"></div><div className="h-9 w-9 bg-muted rounded-md"></div><div className="h-9 w-24 bg-muted rounded-md"></div></div></div><div className="h-40 w-full bg-card border border-border rounded-lg mb-6"></div><div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="bg-card p-4 rounded-lg border border-border flex items-start gap-4"><div className="flex-shrink-0 w-10 h-10 bg-muted rounded-full"></div><div className="flex-grow min-w-0"><div className="h-5 w-1/2 bg-muted rounded-md"></div><div className="h-4 w-full bg-muted rounded-md mt-3"></div></div></div>)}</div></div>
);

const BundleEditorScreen: React.FC<BundleEditorScreenProps> = ({ bundleId, onBack, onNavigateToShare }) => {
  const { updateBundle, removeItemFromBundle, moveItemInBundle, updateItemInBundle, removeItemsFromBundle, duplicateItemInBundle } = useBundles();
  const bundle = useLiveQuery(() => db.bundles.get(bundleId), [bundleId]);
  
  const [title, setTitle] = useState(bundle?.title || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [itemToDelete, setItemToDelete] = useState<BundleItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isAddItemFormVisible, setIsAddItemFormVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setItemToDelete(null); setIsPasswordModalOpen(false); setIsAddItemSheetOpen(false); setIsSelectMode(false); }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { setTitle(bundle?.title || ''); }, [bundle?.title]);
  useEffect(() => {
    const originalTitle = document.title;
    if (bundle?.title) document.title = `Editing: ${bundle.title} | StaticLink`;
    return () => { document.title = originalTitle; };
  }, [bundle?.title]);

  useEffect(() => { if (isEditingTitle && titleInputRef.current) { titleInputRef.current.focus(); titleInputRef.current.select(); }}, [isEditingTitle]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (bundle && title.trim() && title !== bundle.title) updateBundle(bundle.id, { title });
    else setTitle(bundle?.title || '');
  };

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<BundleItem>) => { updateItemInBundle(bundleId, itemId, updates); }, [bundleId, updateItemInBundle]);
  const handleDuplicateItem = useCallback((itemId: string) => { duplicateItemInBundle(bundleId, itemId); }, [bundleId, duplicateItemInBundle]);
  
  const handleDeleteConfirm = () => {
      if (isSelectMode && selectedItemIds.size > 0) {
          removeItemsFromBundle(bundleId, selectedItemIds);
          setIsSelectMode(false);
          setSelectedItemIds(new Set());
          setItemToDelete(null); // FIX: Close modal after bulk delete
      } else if(itemToDelete && bundle) {
          removeItemFromBundle(bundle.id, itemToDelete.id);
          setItemToDelete(null);
      }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => { setDraggedItemIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, dropIndex: number) => { e.preventDefault(); if (draggedItemIndex !== null && draggedItemIndex !== dropIndex) moveItemInBundle(bundleId, draggedItemIndex, dropIndex); setDraggedItemIndex(null); };

  const handleToggleSelect = (itemId: string) => {
    setSelectedItemIds(prev => { const next = new Set(prev); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; });
  };


  const processedItems = useMemo(() => {
    if (!bundle) return [];
    let items = [...bundle.items];
    
    if (searchQuery.trim()) {
        const lowercasedQuery = searchQuery.toLowerCase();
        items = items.filter(item => JSON.stringify(item).toLowerCase().includes(lowercasedQuery));
    }
    
    items.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    
    return items;
  }, [bundle, searchQuery]);

  if (!bundle) return <BundleEditorSkeleton />;

  const PasswordManagementModal: React.FC<{onClose: () => void}> = ({ onClose }) => {
    const [mode, setMode] = useState<'set' | 'remove'>(bundle.isLocked ? 'remove' : 'set');
    const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState('');
    const handleSetPassword = async (e: React.FormEvent) => { e.preventDefault(); setError(''); if (password.length < 4) { setError('Password must be at least 4 characters.'); return; } if (password !== confirm) { setError('Passwords do not match.'); return; } const passwordHash = await hashPassword(password); await updateBundle(bundleId, { isLocked: true, passwordHash }); onClose(); };
    const handleRemovePassword = async (e: React.FormEvent) => { e.preventDefault(); setError(''); const hashed = await hashPassword(password); if (hashed !== bundle.passwordHash) { setError('Incorrect password.'); return; } await updateBundle(bundleId, { isLocked: false, passwordHash: '' }); onClose(); };
    return (
        <Modal isOpen={true} onClose={onClose} title="Manage Bundle Protection">
            {mode === 'set' ? (<form onSubmit={handleSetPassword} className="space-y-4"><p>Set a password to lock this bundle.</p><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New Password" required className="w-full px-3 py-2 bg-transparent border border-input rounded-md"/> <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm Password" required className="w-full px-3 py-2 bg-transparent border border-input rounded-md"/> {error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button type="submit" className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md">Set Password</button></div></form>)
            : (<form onSubmit={handleRemovePassword} className="space-y-4"><p>Enter current password to remove protection.</p><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Current Password" required className="w-full px-3 py-2 bg-transparent border border-input rounded-md"/> {error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-between items-center pt-2"><button type="button" onClick={() => setMode('set')} className="text-sm text-primary hover:underline">Change password?</button><div className="flex gap-3"><button type="button" onClick={onClose} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button type="submit" className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Remove</button></div></div></form>)}
        </Modal>
    );
  };
  
  const AddItemSheet: React.FC<{onClose: () => void}> = ({ onClose }) => (
      <div className="bottom-sheet-overlay" onClick={onClose}><div className="bottom-sheet" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-border sticky top-0 bg-card"><h3 className="text-xl font-semibold text-center">Add to Bundle</h3><button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground"><IconX /></button></div><AddItemForms bundleId={bundleId} onFormSubmit={onClose} /></div></div>
  );
  
  const MobileNavButton: React.FC<{ label: string, icon: React.ReactNode, isActive?: boolean, onClick: () => void }> = ({ label, icon, isActive = false, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
      {isPasswordModalOpen && <PasswordManagementModal onClose={() => setIsPasswordModalOpen(false)} />}
      
      {!isSelectMode && (
        <div className="sm:hidden mobile-dock">
            <MobileNavButton label="Back" icon={<IconArrowLeft size={22}/>} onClick={onBack} />
            <button onClick={() => setIsAddItemSheetOpen(true)} className="flex-1 flex flex-col items-center justify-center h-full text-primary">
                <div className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ring-4 ring-background -mt-6">
                    <IconPlus size={28} />
                </div>
                <span className="text-xs font-medium mt-1">Add</span>
            </button>
            <MobileNavButton label="Select" icon={<IconListChecks size={22}/>} isActive={isSelectMode} onClick={() => setIsSelectMode(!isSelectMode)} />
            <MobileNavButton label="Share" icon={<IconShare2 size={22}/>} onClick={() => onNavigateToShare(bundle.id)} />
        </div>
      )}
      
      {isAddItemSheetOpen && <AddItemSheet onClose={() => setIsAddItemSheetOpen(false)} />}

      <header className="mb-6"><button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-4"><IconArrowLeft size={16} />Back to My Bundles</button><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="min-w-0 flex-1">{isEditingTitle ? <input ref={titleInputRef} type="text" value={title} onChange={e => setTitle(e.target.value)} onBlur={handleTitleBlur} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className="text-3xl font-bold bg-transparent focus:outline-none w-full text-foreground -ml-1 p-1 rounded-md ring-1 ring-ring"/> : <h1 onClick={() => setIsEditingTitle(true)} className="text-3xl font-bold w-full text-foreground -ml-1 p-1 rounded-md hover:bg-accent/50 cursor-pointer truncate" title="Click to edit">{bundle.title}</h1>}</div><div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end"><button onClick={() => setIsPasswordModalOpen(true)} title="Manage Protection" className="flex-shrink-0 flex items-center justify-center h-9 w-9 font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20">{bundle.isLocked ? <IconLock size={16} /> : <IconUnlock size={16} />}</button><button onClick={() => onNavigateToShare(bundle.id)} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 shadow-sm"><IconShare2 size={14} />Share</button></div></div></header>
      
      <div className="hidden sm:block mb-6">
        {isAddItemFormVisible ? (
          <div className="bg-card border border-border rounded-lg p-4">
              <AddItemForms bundleId={bundleId} onFormSubmit={() => setIsAddItemFormVisible(false)} />
          </div>
        ) : (
          <button onClick={() => setIsAddItemFormVisible(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all">
            <IconPlus size={18} /> Add New Item
          </button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-4"><div className="relative flex-grow"><IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search items..." className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"/></div><button onClick={() => setIsSelectMode(!isSelectMode)} className={`hidden sm:inline-flex px-4 py-2 text-sm font-medium rounded-md ${isSelectMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>Select</button></div>

      <div className="space-y-4">{processedItems.length > 0 ? (processedItems.map((item, index) => <div key={item.id} draggable={!isSelectMode} onDragStart={e => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, index)} className={`transition-opacity ${draggedItemIndex === index ? 'opacity-30' : ''}`}><ItemCard item={item} searchQuery={searchQuery} onUpdateItem={(updates) => handleUpdateItem(item.id, updates)} onDeleteItem={() => setItemToDelete(item)} onDuplicateItem={() => handleDuplicateItem(item.id)} isSelectMode={isSelectMode} isSelected={selectedItemIds.has(item.id)} onToggleSelect={() => handleToggleSelect(item.id)} /></div>)) : (<div className="text-center py-16 px-6 bg-card border-2 border-dashed border-border rounded-lg"><h3 className="text-xl font-semibold text-foreground">{searchQuery ? 'No Matching Items' : 'This Bundle is Empty'}</h3><p className="mt-2 text-muted-foreground">{searchQuery ? 'Try another search.' : 'Add your first item!'} </p></div>)}</div>
      
      {isSelectMode && (
          <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 z-30">
              <div className="bg-background border-t sm:border border-border shadow-lg sm:rounded-full flex items-center justify-between gap-4 p-2 pl-4 h-16 sm:h-auto">
                  <span className="text-sm font-semibold text-foreground">{selectedItemIds.size} selected</span>
                  <div className="flex items-center gap-2">
                       <button 
                          disabled={selectedItemIds.size === 0} 
                          onClick={() => setItemToDelete({id:'bulk_delete'} as any)} 
                          className="px-4 py-2 text-sm font-medium rounded-full bg-destructive text-destructive-foreground disabled:bg-muted disabled:text-muted-foreground"
                       >
                          Delete
                       </button>
                      <button onClick={() => setIsSelectMode(false)} className="p-2 text-muted-foreground hover:bg-accent rounded-full"><IconX /></button>
                  </div>
              </div>
          </div>
      )}

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title={isSelectMode ? `Delete ${selectedItemIds.size} Items` : "Delete Item"} footer={<><button onClick={() => setItemToDelete(null)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleDeleteConfirm} className="px-4 py-2 font-medium text-destructive-foreground bg-destructive rounded-md">Delete</button></>}><p>Are you sure you want to delete {isSelectMode ? `${selectedItemIds.size} items` : `"${itemToDelete?.title}"`}?</p></Modal>
    </div>
  );
};

export default BundleEditorScreen;