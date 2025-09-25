

import JSZip from 'jszip';
import type { Bundle, FileItem, AudioItem, DrawingItem, LinkItem, NoteItem, ChecklistItem, ContactItem, LocationItem, EmailItem, CodeSnippetItem } from '../types';
import { ItemType } from '../types';
import showdown from 'showdown';

export const calculateChecksum = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: mimeType });
};

export const createPackage = async (bundle: Bundle): Promise<Blob> => {
  const zip = new JSZip();
  
  const manifest = {
    bundle_id: bundle.id,
    created_at: bundle.createdAt,
    title: bundle.title,
    items: bundle.items.map(item => {
      if (item.type === ItemType.FILE || item.type === ItemType.AUDIO || item.type === ItemType.DRAWING) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = item as FileItem | AudioItem | DrawingItem;
        return rest;
      }
      return item;
    }),
    format_version: 1,
    encrypted: false,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  bundle.items.forEach(item => {
    if (item.type === ItemType.FILE || item.type === ItemType.AUDIO || item.type === ItemType.DRAWING) {
      const fileItem = item as FileItem | AudioItem | DrawingItem;
      const blob = base64ToBlob(fileItem.content, fileItem.mimeType);
      zip.file(fileItem.filename, blob);
    }
  });

  return zip.generateAsync({ type: 'blob' });
};

export const readPackage = async (file: File): Promise<Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>> => {
    const fileData = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(fileData);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
        throw new Error('Invalid package: manifest.json not found.');
    }
    const manifestContent = await manifestFile.async('string');
    const manifest = JSON.parse(manifestContent);

    const items: (FileItem | AudioItem | DrawingItem | any)[] = manifest.items;
    const newItems = await Promise.all(items.map(async item => {
        if (item.type === 'file' || item.type === 'audio' || item.type === 'drawing') {
            const fileInZip = zip.file(item.filename);
            if(fileInZip) {
                const base64Content = await fileInZip.async('base64');
                const mimeType = item.mimeType || 'application/octet-stream';
                item.content = `data:${mimeType};base64,${base64Content}`;
            }
        }
        return item;
    }));

    return {
        title: manifest.title,
        items: newItems,
    };
};

export const totalBundleSize = (bundle: Bundle) => {
    return bundle.items.reduce((acc, item) => {
        if(item.type === 'file' || item.type === 'audio' || item.type === 'drawing') {
            return acc + (item as FileItem | AudioItem | DrawingItem).size;
        }
        // For other types, estimate based on string content
        return acc + new TextEncoder().encode(JSON.stringify(item)).length;
    }, 0);
}


export const exportBundleAsHtml = (bundle: Bundle): Blob => {
  const markdownConverter = new showdown.Converter({ sanitize: true });
  
  const escapeHtml = (unsafe: string) => 
    unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

  const itemsHtml = bundle.items.map(item => {
    let contentHtml = '';
    switch (item.type) {
      case ItemType.LINK:
        const link = item as LinkItem;
        contentHtml = `<p>URL: <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.url)}</a></p>`;
        break;
      case ItemType.NOTE:
        const note = item as NoteItem;
        contentHtml = `<div class="note-content">${markdownConverter.makeHtml(note.text)}</div>`;
        break;
      case ItemType.FILE:
        const file = item as FileItem;
        if (file.mimeType.startsWith('image/')) {
            contentHtml = `<img src="${file.content}" alt="${escapeHtml(file.filename)}" style="max-width: 100%; height: auto; border-radius: 4px;">`;
        } else {
            contentHtml = `<p>File: ${escapeHtml(file.filename)} (${(file.size/1024).toFixed(2)} KB)</p><p><a href="${file.content}" download="${escapeHtml(file.filename)}">Download File</a></p>`;
        }
        break;
      case ItemType.AUDIO:
        const audio = item as AudioItem;
        contentHtml = `<p>Audio: ${escapeHtml(audio.filename)}</p><audio controls src="${audio.content}"></audio>`;
        break;
      case ItemType.CHECKLIST:
        const checklist = item as ChecklistItem;
        const listItems = checklist.items.map(i => `<li><input type="checkbox" ${i.checked ? 'checked' : ''} disabled> ${escapeHtml(i.text)}</li>`).join('');
        contentHtml = `<ul>${listItems}</ul>`;
        break;
      case ItemType.CONTACT:
        const c = item as ContactItem;
        contentHtml = `<ul style="list-style-type: none; padding-left: 0;">
            ${c.firstName || c.lastName ? `<li><strong>Name:</strong> ${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</li>` : ''}
            ${c.phone ? `<li><strong>Phone:</strong> ${escapeHtml(c.phone)}</li>` : ''}
            ${c.email ? `<li><strong>Email:</strong> ${escapeHtml(c.email)}</li>` : ''}
            ${c.organization ? `<li><strong>Organization:</strong> ${escapeHtml(c.organization)}</li>` : ''}
            ${c.address ? `<li><strong>Address:</strong> ${escapeHtml(c.address)}</li>` : ''}
        </ul>`;
        break;
      case ItemType.LOCATION:
        const l = item as LocationItem;
        contentHtml = `<p><a href="https://www.google.com/maps?q=${l.latitude},${l.longitude}" target="_blank" rel="noopener noreferrer">${l.address ? escapeHtml(l.address) : `(${l.latitude}, ${l.longitude})`}</a></p>`;
        break;
      case ItemType.DRAWING:
        const d = item as DrawingItem;
        contentHtml = `<img src="${d.content}" alt="${escapeHtml(d.filename)}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">`;
        break;
      case ItemType.EMAIL:
        const e = item as EmailItem;
        contentHtml = `<div style="border-left: 3px solid #ccc; padding-left: 1em;">
            <p><strong>To:</strong> ${escapeHtml(e.to)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(e.subject)}</p>
            <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(e.body)}</pre>
        </div>`
        break;
      case ItemType.CODE:
        const code = item as CodeSnippetItem;
        contentHtml = `<p>Language: ${escapeHtml(code.language)}</p><pre style="background-color: #f4f4f4; padding: 1em; border-radius: 4px; overflow-x: auto;"><code>${escapeHtml(code.code)}</code></pre>`;
        break;
      default:
        contentHtml = '<p>Unsupported item type.</p>';
    }
    
    return `<div class="item"><h3>${escapeHtml(item.title)}</h3><p class="item-meta">Type: ${item.type} | Created: ${new Date(item.createdAt).toLocaleString()}</p>${contentHtml}</div>`;
  }).join('');
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(bundle.title)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background-color: #fdfdfd; }
        header { border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
        h1 { color: #111; }
        h3 { margin-bottom: 0.5rem; }
        .item { background-color: #fff; border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .item-meta { font-size: 0.8rem; color: #777; margin-top: -0.25rem; margin-bottom: 1rem; }
        a { color: #007bff; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
        code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
        audio { width: 100%; margin-top: 1rem; }
        .note-content p { margin-top: 0; }
      </style>
    </head>
    <body>
      <header>
        <h1>Bundle: ${escapeHtml(bundle.title)}</h1>
        <p>Exported from StaticLink on ${new Date().toLocaleString()}</p>
      </header>
      <main>
        ${itemsHtml}
      </main>
    </body>
    </html>
  `;
  
  return new Blob([html], { type: 'text/html;charset=utf-8' });
};