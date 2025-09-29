import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBundles } from '../hooks/useBundles';
import { IconFile, IconLink, IconNote, IconPlus, IconMic, IconListChecks, IconContact, IconMapPin, IconPenSquare, IconMail, IconCode, IconTarget, IconX, IconArrowLeft, IconQrCode, IconBold, IconItalic, IconCodeInline, IconQuote, IconList } from './icons';
import { calculateChecksum, fileToBase64 } from '../services/bundleService';
import { ItemType } from '../types';
import type { FileItem, LinkItem, NoteItem, AudioItem, ChecklistItem, ContactItem, LocationItem, DrawingItem, EmailItem, CodeSnippetItem, QrCodeItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../App';
// FIX: Import LucideProps for explicit typing of icon components.
import type { LucideProps } from 'lucide-react';

interface AddItemFormsProps {
  bundleId: string;
  onFormSubmit: () => void;
}

const AddButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void, isMobile: boolean }> = ({ icon, label, onClick, isMobile }) => {
    if (isMobile) {
        return (
             <button
                onClick={onClick}
                className="group flex items-center w-full text-left p-4 bg-card border-b border-border transition-all duration-200"
            >
                {icon}
                <span className="font-semibold ml-4 text-sm">{label}</span>
            </button>
        )
    }
    
    return (
        <button
            onClick={onClick}
            className="group flex flex-col justify-center items-center text-center p-6 bg-card border border-border rounded-lg hover:bg-accent hover:shadow-md transition-all duration-200"
        >
            {icon}
            <span className="font-semibold mt-2 text-sm">{label}</span>
        </button>
    );
};

export const AddItemForms: React.FC<AddItemFormsProps> = ({ bundleId, onFormSubmit }) => {
  const [activeForm, setActiveForm] = useState<ItemType | null>(null);
  const { addItemToBundle, addItemsToBundle } = useBundles();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const { showToast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const createItemAdder = <T extends any[]>(creator: (...args: T) => object | Promise<object>) => async (...args: T) => {
    try {
        const itemData = await creator(...args);
        const newItem = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...itemData,
        };
        await addItemToBundle(bundleId, newItem as any);
        setActiveForm(null);
        onFormSubmit();
    } catch (error: any) {
        showToast(error.message || "Failed to add item.", "error");
        console.error(error);
    }
  };
  
  const handleAddFiles = async (files: File[]) => {
    try {
        const newItems: FileItem[] = await Promise.all(files.map(async (file) => {
            const checksum = await calculateChecksum(file);
            const content = await fileToBase64(file);
            return {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                type: ItemType.FILE,
                title: file.name,
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                content,
                checksum
            };
        }));
        await addItemsToBundle(bundleId, newItems as any);
        setActiveForm(null);
        onFormSubmit();
    } catch (error: any) {
        showToast(error.message || "Failed to add files.", "error");
        console.error(error);
    }
  };

  const handleAddLink = createItemAdder((url: string, title: string) => ({ type: ItemType.LINK, url, title: title || url }));
  const handleAddNote = createItemAdder((text: string, title: string) => ({ type: ItemType.NOTE, text, title: title || `Note ${new Date().toLocaleTimeString()}` }));
  const handleAddAudio = createItemAdder((blob: Blob, duration: number, title: string) => {
    const finalTitle = title || `Audio Recording ${new Date().toLocaleString()}`;
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve({ type: ItemType.AUDIO, title: finalTitle, filename: `${finalTitle}.wav`, mimeType: blob.type, size: blob.size, content: reader.result as string, duration });
        };
        reader.readAsDataURL(blob);
    });
  });
  const handleAddChecklist = createItemAdder((title: string, items: { text: string, checked: boolean }[]) => ({ type: ItemType.CHECKLIST, title, items: items.map(item => ({...item, id: crypto.randomUUID()}))}));
  const handleAddContact = createItemAdder((contact: Omit<ContactItem, 'id' | 'type' | 'createdAt' | 'title'>) => ({ type: ItemType.CONTACT, title: `${contact.firstName} ${contact.lastName}`, ...contact }));
  const handleAddLocation = createItemAdder((location: Omit<LocationItem, 'id' | 'type' | 'createdAt' | 'title'>) => ({ type: ItemType.LOCATION, title: location.address || `Location (${location.latitude}, ${location.longitude})`, ...location }));
  const handleAddDrawing = createItemAdder((dataUrl: string) => {
    const title = `Drawing ${new Date().toLocaleString()}`;
    const size = atob(dataUrl.split(',')[1]).length;
    return { type: ItemType.DRAWING, title, filename: `${title}.png`, mimeType: 'image/png', size, content: dataUrl };
  });
  const handleAddEmail = createItemAdder((email: Omit<EmailItem, 'id'|'type'|'createdAt'|'title'>) => ({ type: ItemType.EMAIL, title: email.subject || `Email to ${email.to}`, ...email }));
  const handleAddCode = createItemAdder((code: Omit<CodeSnippetItem, 'id'|'type'|'createdAt'>) => ({ type: ItemType.CODE, ...code }));
  const handleAddQrCode = createItemAdder((content: string, title: string) => ({ type: ItemType.QR_CODE, content, title: title || content }));


  const renderForm = () => {
    switch (activeForm) {
      case ItemType.LINK: return <AddLinkForm onSubmit={handleAddLink} onCancel={() => setActiveForm(null)} />;
      case ItemType.NOTE: return <AddNoteForm onSubmit={handleAddNote} onCancel={() => setActiveForm(null)} />;
      case ItemType.FILE: return <AddFileForm onSubmit={handleAddFiles} onCancel={() => setActiveForm(null)} />;
      case ItemType.AUDIO: return <AddAudioForm onSubmit={handleAddAudio} onCancel={() => setActiveForm(null)} />;
      case ItemType.CHECKLIST: return <AddChecklistForm onSubmit={handleAddChecklist} onCancel={() => setActiveForm(null)} />;
      case ItemType.CONTACT: return <AddContactForm onSubmit={handleAddContact} onCancel={() => setActiveForm(null)} />;
      case ItemType.LOCATION: return <AddLocationForm onSubmit={handleAddLocation} onCancel={() => setActiveForm(null)} />;
      case ItemType.DRAWING: return <AddDrawingForm onSubmit={handleAddDrawing} onCancel={() => setActiveForm(null)} />;
      case ItemType.EMAIL: return <AddEmailForm onSubmit={handleAddEmail} onCancel={() => setActiveForm(null)} />;
      case ItemType.CODE: return <AddCodeForm onSubmit={handleAddCode} onCancel={() => setActiveForm(null)} />;
      case ItemType.QR_CODE: return <AddQrCodeForm onSubmit={handleAddQrCode} onCancel={() => setActiveForm(null)} />;
      default: return null;
    }
  };
  
  // FIX: Explicitly type `icon` prop to resolve type inference issues with `React.cloneElement`.
  // This ensures that `size` is a known property and `icon.props.className` is accessible.
  const ItemTypeButton: React.FC<{icon:React.ReactElement<LucideProps>, label:string, type:ItemType}> = ({icon, label, type}) => (
     <AddButton 
        icon={React.cloneElement(icon, { size: isMobile ? 24: 28, className: `${icon.props.className || ''} group-hover:scale-110 transition-transform` })} 
        label={label} 
        onClick={() => setActiveForm(type)}
        isMobile={isMobile}
    />
  )

  return (
    <div className="sm:my-0">
      {activeForm ? (
        <div className="p-4 sm:bg-card sm:border sm:border-border sm:rounded-lg">
           <button onClick={() => setActiveForm(null)} className="sm:hidden flex items-center gap-1 text-sm font-medium text-primary mb-4">
               <IconArrowLeft size={16} /> Back
            </button>
            {renderForm()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-0 sm:gap-4">
          <ItemTypeButton icon={<IconLink className="text-primary" />} label="Add Link" type={ItemType.LINK} />
          <ItemTypeButton icon={<IconNote className="text-secondary" />} label="Add Note" type={ItemType.NOTE} />
          <ItemTypeButton icon={<IconFile className="text-orange-500" />} label="Add File" type={ItemType.FILE} />
          <ItemTypeButton icon={<IconQrCode className="text-gray-500" />} label="Add QR Code" type={ItemType.QR_CODE} />
          <ItemTypeButton icon={<IconCode className="text-yellow-500" />} label="Add Code" type={ItemType.CODE} />
          <ItemTypeButton icon={<IconMic className="text-red-500" />} label="Record Audio" type={ItemType.AUDIO} />
          <ItemTypeButton icon={<IconListChecks className="text-indigo-500" />} label="New Checklist" type={ItemType.CHECKLIST} />
          <ItemTypeButton icon={<IconContact className="text-teal-500" />} label="Add Contact" type={ItemType.CONTACT} />
          <ItemTypeButton icon={<IconMapPin className="text-green-500" />} label="Add Location" type={ItemType.LOCATION} />
          <ItemTypeButton icon={<IconPenSquare className="text-purple-500" />} label="New Drawing" type={ItemType.DRAWING} />
          <ItemTypeButton icon={<IconMail className="text-blue-500" />} label="Add Email" type={ItemType.EMAIL} />
        </div>
      )}
    </div>
  );
};


const FormButtons: React.FC<{ onCancel: () => void; submitText: string; disabled?: boolean }> = ({ onCancel, submitText, disabled }) => (
    <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-accent">Cancel</button>
        <button type="submit" disabled={disabled} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 flex items-center gap-1 disabled:bg-muted disabled:text-muted-foreground"><IconPlus size={16}/> {submitText}</button>
    </div>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <input {...props} className="mt-1 block w-full px-3 py-2 bg-transparent border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
    </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <textarea {...props} className="mt-1 block w-full px-3 py-2 bg-transparent border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"></textarea>
    </div>
);
const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <select {...props} className="mt-1 block w-full pl-3 pr-10 py-2 bg-transparent border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {children}
        </select>
    </div>
);

// Existing Forms (AddLinkForm, AddNoteForm, AddFileForm) remain largely the same, but use FormButtons and FormInput
const AddLinkForm: React.FC<{ onSubmit: (url: string, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (url) onSubmit(url, title); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">Add a New Link</h3>
            <FormInput label="URL" id="link-url" type="url" value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://example.com" />
            <FormInput label="Title (Optional)" id="link-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Link" />
            <FormButtons onCancel={onCancel} submitText="Add Link" />
        </form>
    );
};
const AddNoteForm: React.FC<{ onSubmit: (text: string, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [text, setText] = useState('');
    const [title, setTitle] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());

    const checkActiveStyles = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, value } = textarea;
        const newStyles = new Set<string>();
        
        const check = (start: string, end: string, style: string) => {
            let i = selectionStart - start.length;
            while(i >= 0) {
                if (value.substring(i, i + start.length) === start) {
                    const closing = value.indexOf(end, i + start.length);
                    if (closing !== -1 && closing >= selectionStart - start.length) {
                        newStyles.add(style);
                    }
                    return;
                }
                if (value[i] === '\n') break;
                i--;
            }
        };
        
        check('**', '**', 'bold');
        check('*', '*', 'italic');
        check('`', '`', 'code');

        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        if (value.substring(lineStart, lineStart + 2) === '> ') newStyles.add('quote');
        if (value.substring(lineStart, lineStart + 2) === '- ') newStyles.add('list');

        setActiveStyles(newStyles);
    }, [textareaRef]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (text) onSubmit(text, title); };

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
        setText(value.substring(0, selectionStart) + newText + value.substring(selectionEnd));
        textarea.focus();
        setTimeout(checkActiveStyles, 0);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">Add a New Note</h3>
            <FormInput label="Title (Optional)" id="note-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Important Note" />
            <div>
                 <label htmlFor="note-text" className="block text-sm font-medium text-muted-foreground">Content</label>
                 <div className="mt-1 flex items-center gap-1 border border-input rounded-t-md p-1 bg-muted/50">
                    <button type="button" onClick={() => applyStyle('bold')} title="Bold (Ctrl+B)" className={`p-2 rounded hover:bg-accent ${activeStyles.has('bold') ? 'bg-primary/20 text-primary' : ''}`}><IconBold size={16}/></button>
                    <button type="button" onClick={() => applyStyle('italic')} title="Italic (Ctrl+I)" className={`p-2 rounded hover:bg-accent ${activeStyles.has('italic') ? 'bg-primary/20 text-primary' : ''}`}><IconItalic size={16}/></button>
                    <button type="button" onClick={() => applyStyle('code')} title="Code" className={`p-2 rounded hover:bg-accent ${activeStyles.has('code') ? 'bg-primary/20 text-primary' : ''}`}><IconCodeInline size={16}/></button>
                    <button type="button" onClick={() => applyStyle('quote')} title="Quote" className={`p-2 rounded hover:bg-accent ${activeStyles.has('quote') ? 'bg-primary/20 text-primary' : ''}`}><IconQuote size={16}/></button>
                    <button type="button" onClick={() => applyStyle('list')} title="List" className={`p-2 rounded hover:bg-accent ${activeStyles.has('list') ? 'bg-primary/20 text-primary' : ''}`}><IconList size={16}/></button>
                </div>
                <textarea 
                    ref={textareaRef} 
                    id="note-text" 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    onSelect={checkActiveStyles}
                    onKeyUp={checkActiveStyles}
                    onFocus={checkActiveStyles}
                    onClick={checkActiveStyles}
                    required 
                    rows={6} 
                    placeholder="Type your note here... supports Markdown."
                    className="w-full text-sm p-2 bg-transparent border border-t-0 border-input rounded-b-md focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                ></textarea>
            </div>
            <FormButtons onCancel={onCancel} submitText="Add Note" />
        </form>
    );
};
const AddFileForm: React.FC<{ onSubmit: (files: File[]) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [files, setFiles] = useState<File[]>([]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFiles(Array.from(e.target.files)); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (files.length > 0) onSubmit(files); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">Add File(s)</h3>
            <div>
                <label htmlFor="file-input" className="block text-sm font-medium text-muted-foreground">Select File(s)</label>
                <input type="file" id="file-input" onChange={handleFileChange} required multiple className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
            </div>
            {files.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-muted/50 p-2 rounded-md">
                    <ul className="text-xs text-muted-foreground space-y-1">
                        {files.map(file => (
                            <li key={file.name + file.size}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                        ))}
                    </ul>
                </div>
            )}
            <FormButtons onCancel={onCancel} submitText={`Add ${files.length} File(s)`} />
        </form>
    );
};

const AddQrCodeForm: React.FC<{ onSubmit: (content: string, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (content) onSubmit(content, title); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">Add a New QR Code</h3>
            <FormInput label="Content (URL or Text)" id="qr-content" type="text" value={content} onChange={e => setContent(e.target.value)} required placeholder="https://example.com" />
            <FormInput label="Title (Optional)" id="qr-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Website QR Code" />
            <FormButtons onCancel={onCancel} submitText="Add QR Code" />
        </form>
    );
};

// New Forms
const AddAudioForm: React.FC<{ onSubmit: (blob: Blob, duration: number, title: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState(0);
    const [title, setTitle] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                setAudioBlob(blob);
                chunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setDuration(0);
            timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please ensure you have given microphone permissions.");
        }
    };

    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleSubmit = () => {
        if (audioBlob) onSubmit(audioBlob, duration, title);
    };
    
    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, []);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">Record Audio</h3>
            <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                {!isRecording && !audioBlob && (
                    <button onClick={handleStartRecording} className="flex items-center gap-2 px-6 py-3 font-semibold text-white bg-red-600 rounded-full hover:bg-red-700">
                        <IconMic size={24}/> Start Recording
                    </button>
                )}
                {isRecording && (
                    <>
                        <p className="text-lg font-mono text-red-500 animate-pulse">Recording... {Math.floor(duration/60)}:{(duration%60).toString().padStart(2, '0')}</p>
                        <button onClick={handleStopRecording} className="mt-4 px-6 py-2 font-semibold text-foreground bg-accent rounded-full hover:bg-border">Stop</button>
                    </>
                )}
                {audioBlob && !isRecording && (
                    <div className="w-full">
                        <p className="text-center font-medium mb-2">Recording Complete</p>
                        <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                        <button onClick={() => {setAudioBlob(null); setDuration(0)}} className="w-full mt-4 text-sm text-center text-muted-foreground hover:text-foreground">Record Again</button>
                    </div>
                )}
            </div>
            {audioBlob && <FormInput label="Title (Optional)" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={`Audio Recording ${new Date().toLocaleString()}`} />}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-accent">Cancel</button>
                <button type="button" disabled={!audioBlob} onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"><IconPlus size={16}/> Add Recording</button>
            </div>
        </div>
    );
};
const AddChecklistForm: React.FC<{ onSubmit: (title: string, items: { text: string, checked: boolean }[]) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [title, setTitle] = useState('');
    const [items, setItems] = useState<{text: string, checked: boolean}[]>([]);
    const [currentItem, setCurrentItem] = useState('');
    const itemInputRef = useRef<HTMLInputElement>(null);
    
    const addItem = () => { 
        if (currentItem.trim()) { 
            setItems([...items, { text: currentItem.trim(), checked: false }]); 
            setCurrentItem(''); 
            itemInputRef.current?.focus();
        }
    };
    const removeItem = (indexToRemove: number) => { setItems(items.filter((_, index) => index !== indexToRemove)); };
    
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (title && items.length) onSubmit(title, items); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">New Checklist</h3>
            <FormInput label="Title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Shopping List" />
            <div>
                <label className="block text-sm font-medium text-muted-foreground">Items</label>
                <ul className="mt-1 space-y-1">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded group">
                            <span>{item.text}</span>
                            <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconX size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-2 mt-2">
                    <input 
                        ref={itemInputRef}
                        type="text" 
                        value={currentItem} 
                        onChange={e => setCurrentItem(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())} 
                        className="flex-grow px-3 py-2 bg-transparent border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" 
                        placeholder="New item..." 
                    />
                    <button type="button" onClick={addItem} className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">Add</button>
                </div>
            </div>
            <FormButtons onCancel={onCancel} submitText="Add Checklist" />
        </form>
    );
};
const AddContactForm: React.FC<{ onSubmit: (contact: Omit<ContactItem, 'id' | 'type' | 'createdAt' | 'title'>) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '', organization: '', address: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setContact({...contact, [e.target.name]: e.target.value});
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(contact.firstName || contact.lastName) onSubmit(contact);};
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <h3 className="text-lg font-medium text-center text-foreground">New Contact</h3>
             <div className="grid grid-cols-2 gap-4">
                <FormInput label="First Name" name="firstName" value={contact.firstName} onChange={handleChange} required />
                <FormInput label="Last Name" name="lastName" value={contact.lastName} onChange={handleChange} />
             </div>
             <FormInput label="Phone" name="phone" type="tel" value={contact.phone} onChange={handleChange} />
             <FormInput label="Email" name="email" type="email" value={contact.email} onChange={handleChange} />
             <FormInput label="Organization" name="organization" value={contact.organization} onChange={handleChange} />
             <FormInput label="Address" name="address" value={contact.address} onChange={handleChange} />
             <FormButtons onCancel={onCancel} submitText="Add Contact" />
        </form>
    );
};
const AddLocationForm: React.FC<{ onSubmit: (location: Omit<LocationItem, 'id' | 'type' | 'createdAt' | 'title'>) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [location, setLocation] = useState({ latitude: 0, longitude: 0, address: '' });
    const [isFetching, setIsFetching] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocation({...location, [name]: name === 'address' ? value : parseFloat(value) || 0 });
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(location); };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        setIsFetching(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation(loc => ({
                    ...loc,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
                setIsFetching(false);
            },
            (error) => {
                alert(`Error getting location: ${error.message}`);
                setIsFetching(false);
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <h3 className="text-lg font-medium text-center text-foreground">New Location</h3>
             <div className="grid grid-cols-2 gap-4">
                <FormInput label="Latitude" name="latitude" type="number" step="any" value={location.latitude} onChange={handleChange} required />
                <FormInput label="Longitude" name="longitude" type="number" step="any" value={location.longitude} onChange={handleChange} required />
             </div>
             <button type="button" onClick={handleGetCurrentLocation} disabled={isFetching} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground">
                <IconTarget size={16}/>
                {isFetching ? 'Fetching...' : 'Use My Current Location'}
             </button>
             <FormInput label="Address or Description" name="address" value={location.address} onChange={handleChange} placeholder="e.g. Eiffel Tower"/>
             <FormButtons onCancel={onCancel} submitText="Add Location" />
        </form>
    );
};
const AddDrawingForm: React.FC<{ onSubmit: (dataUrl: string) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.lineCap = 'round';
        context.lineWidth = 3;
        contextRef.current = context;
    }, []);

    useEffect(() => {
        if(contextRef.current) {
            const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            contextRef.current.strokeStyle = isDarkMode ? 'white' : 'black';
        }
    }, [theme])

    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };
    const finishDrawing = () => setIsDrawing(false);
    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current?.lineTo(offsetX, offsetY);
        contextRef.current?.stroke();
    };
    const handleSubmit = () => {
        const dataUrl = canvasRef.current?.toDataURL('image/png');
        if (dataUrl) onSubmit(dataUrl);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">New Drawing</h3>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseMove={draw}
                onMouseLeave={finishDrawing}
                width={400}
                height={300}
                className="bg-muted border border-border rounded-md cursor-crosshair"
            />
             <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-accent">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"><IconPlus size={16}/> Add Drawing</button>
            </div>
        </div>
    );
};
const AddEmailForm: React.FC<{ onSubmit: (email: Omit<EmailItem, 'id' | 'type' | 'createdAt' | 'title'>) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [email, setEmail] = useState({ to: '', subject: '', body: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEmail({ ...email, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (email.to && email.subject) onSubmit(email); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">New Email</h3>
            <FormInput label="To" name="to" type="email" value={email.to} onChange={handleChange} required />
            <FormInput label="Subject" name="subject" value={email.subject} onChange={handleChange} required />
            <FormTextarea label="Body" name="body" value={email.body} onChange={handleChange} rows={5} />
            <FormButtons onCancel={onCancel} submitText="Add Email" />
        </form>
    );
};
const AddCodeForm: React.FC<{ onSubmit: (code: Omit<CodeSnippetItem, 'id' | 'type' | 'createdAt'>) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [title, setTitle] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && code) {
            onSubmit({ title, language, code });
        }
    };
    
    const languages = ["plaintext", "javascript", "typescript", "python", "java", "csharp", "php", "ruby", "go", "swift", "kotlin", "rust", "html", "css", "sql", "bash", "json", "yaml"];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-center text-foreground">New Code Snippet</h3>
            <FormInput label="Title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., React Component" />
            <FormSelect label="Language" value={language} onChange={e => setLanguage(e.target.value)}>
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </FormSelect>
            <FormTextarea label="Code" value={code} onChange={e => setCode(e.target.value)} required rows={8} placeholder="Paste your code here..." className="font-mono text-sm" />
            <FormButtons onCancel={onCancel} submitText="Add Snippet" />
        </form>
    );
};
