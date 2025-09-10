import JSZip from 'jszip';
import type { Bundle, FileItem } from '../types';
import { ItemType } from '../types';

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
      if (item.type === ItemType.FILE) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = item;
        return rest;
      }
      return item;
    }),
    format_version: 1,
    encrypted: false,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  bundle.items.forEach(item => {
    if (item.type === ItemType.FILE) {
      const fileItem = item as FileItem;
      const blob = base64ToBlob(fileItem.content, fileItem.mimeType);
      zip.file(fileItem.filename, blob);
    }
  });

  return zip.generateAsync({ type: 'blob' });
};

export const readPackage = async (file: File): Promise<Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>> => {
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
        throw new Error('Invalid package: manifest.json not found.');
    }
    const manifestContent = await manifestFile.async('string');
    const manifest = JSON.parse(manifestContent);

    const items: (FileItem | any)[] = manifest.items;
    const newItems = await Promise.all(items.map(async item => {
        if (item.type === 'file') {
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
        if(item.type === 'file') {
            return acc + (item as FileItem).size;
        }
        if(item.type === 'note') {
            return acc + new TextEncoder().encode((item as any).text).length;
        }
        if(item.type === 'link') {
            return acc + new TextEncoder().encode((item as any).url).length;
        }
        return acc;
    }, 0);
}