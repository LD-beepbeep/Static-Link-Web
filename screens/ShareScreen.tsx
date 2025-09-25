import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { QRCodeSVG } from 'qrcode.react';
import { createPackage, exportBundleAsHtml, totalBundleSize } from '../services/bundleService';
import saveAs from 'file-saver';
import { 
  IconArrowLeft, IconDownload, IconQrCode, IconFileCode, IconLink, IconNote, IconFile, IconImage, 
  IconFileText, IconMic, IconListChecks, IconContact, IconMapPin, IconPenSquare, IconMail, IconCode
} from '../components/icons';
import type { Bundle, BundleItem, FileItem } from '../types';
import { ItemType } from '../types';
import Modal from '../components/Modal';

interface ShareScreenProps {
  bundleId: string;
  onBack: () => void;
}

const QR_CODE_SIZE_LIMIT = 2048; // Approx 2KB limit for QR codes

const getItemIcon = (itemType: ItemType, item?: BundleItem) => {
    const iconProps = { className: "w-5 h-5 flex-shrink-0" };
    switch (itemType) {
      case ItemType.LINK: return <IconLink {...iconProps} className="text-primary"/>;
      case ItemType.NOTE: return <IconNote {...iconProps} className="text-secondary"/>;
      case ItemType.FILE:
        const file = item as FileItem;
        if (file && file.mimeType.startsWith('image/')) return <IconImage {...iconProps} className="text-purple-500" />;
        if (file && (file.mimeType.includes('pdf') || file.mimeType.includes('document'))) return <IconFileText {...iconProps} className="text-blue-500" />;
        return <IconFile {...iconProps} className="text-orange-500"/>;
      case ItemType.AUDIO: return <IconMic {...iconProps} className="text-red-500"/>;
      case ItemType.CHECKLIST: return <IconListChecks {...iconProps} className="text-indigo-500"/>;
      case ItemType.CONTACT: return <IconContact {...iconProps} className="text-teal-500"/>;
      case ItemType.LOCATION: return <IconMapPin {...iconProps} className="text-green-500"/>;
      case ItemType.DRAWING: return <IconPenSquare {...iconProps} className="text-purple-500"/>;
      case ItemType.EMAIL: return <IconMail {...iconProps} className="text-blue-500"/>;
      case ItemType.CODE: return <IconCode {...iconProps} className="text-yellow-500"/>;
      case ItemType.QR_CODE: return <IconQrCode {...iconProps} className="text-gray-500"/>;
      default: return null;
    }
};

const BundleStats: React.FC<{ bundle: Bundle }> = ({ bundle }) => {
    const stats = useMemo(() => {
        const counts = bundle.items.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<ItemType, number>);

        const size = totalBundleSize(bundle);
        const formattedSize = size > 1024 * 1024 
            ? `${(size / (1024 * 1024)).toFixed(2)} MB`
            : `${(size / 1024).toFixed(2)} KB`;

        return { counts, formattedSize, totalItems: bundle.items.length };
    }, [bundle]);

    return (
        <div className="w-full p-6 bg-card border border-border rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-card-foreground">Bundle Overview</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-muted-foreground">Total Items</span>
                    <span className="font-semibold text-foreground">{stats.totalItems}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-muted-foreground">Bundle Size</span>
                    <span className="font-semibold text-foreground">{stats.formattedSize}</span>
                </div>
                {Object.keys(stats.counts).length > 0 && (
                    <div className="pt-2 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Item Breakdown:</h4>
                        <ul className="space-y-2">
                            {Object.entries(stats.counts).map(([type, count]) => (
                                <li key={type} className="flex items-center gap-3 text-sm">
                                    {getItemIcon(type as ItemType)}
                                    <span className="capitalize flex-grow text-foreground">{type.replace('_', ' ')}s</span>
                                    <span className="font-semibold text-foreground">{count}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


const ShareScreen: React.FC<ShareScreenProps> = ({ bundleId, onBack }) => {
  const bundle = useLiveQuery(() => db.bundles.get(bundleId), [bundleId]);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not-found'>('loading');
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'slpkg' | 'html' | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // This effect runs when `useLiveQuery` provides its first result (either the bundle or undefined)
    if (bundle !== undefined) {
      setLoadState(bundle ? 'loaded' : 'not-found');
    }
  }, [bundle]);

  const canShareViaQR = useMemo(() => {
    if (!bundle) return false;
    const hasFileBasedItems = bundle.items.some(item => [ItemType.FILE, ItemType.AUDIO, ItemType.DRAWING].includes(item.type));
    if (hasFileBasedItems) return false;
    const dataString = JSON.stringify({ staticlink_qr: true, bundle });
    return dataString.length < QR_CODE_SIZE_LIMIT;
  }, [bundle]);

  const qrCodeDataString = useMemo(() => {
    if (!canShareViaQR || !bundle) return null;
    const bundleForQr = { title: bundle.title, items: bundle.items.map(({ id, createdAt, ...rest }) => rest) };
    return JSON.stringify({ staticlink_qr: true, bundle: bundleForQr });
  }, [bundle, canShareViaQR]);


  const openExportModal = (type: 'slpkg' | 'html') => {
    if (!bundle) return;
    setExportType(type);
    setSelectedItemIds(new Set(bundle.items.map(item => item.id)));
    setIsExportModalOpen(true);
  };
  
  const handleDownloadPackage = () => openExportModal('slpkg');
  const handleExportHtml = () => openExportModal('html');

  const handleConfirmExport = async () => {
    if (!bundle || !exportType || selectedItemIds.size === 0) return;
    const itemsToExport = bundle.items.filter(item => selectedItemIds.has(item.id));
    const partialBundle: Bundle = { ...bundle, items: itemsToExport };

    if (exportType === 'slpkg') {
        const pkg = await createPackage(partialBundle);
        saveAs(pkg, `${partialBundle.title.replace(/\s/g, '_')}.slpkg`);
    } else if (exportType === 'html') {
        const htmlBlob = exportBundleAsHtml(partialBundle);
        saveAs(htmlBlob, `${partialBundle.title.replace(/\s/g, '_')}.html`);
    }
    setIsExportModalOpen(false);
    setExportType(null);
  };

  const ExportCustomizationModal = () => {
    if (!bundle) return null;
    const toggleItemSelection = (itemId: string) => { const newSelection = new Set(selectedItemIds); if (newSelection.has(itemId)) newSelection.delete(itemId); else newSelection.add(itemId); setSelectedItemIds(newSelection); };
    const selectAll = () => setSelectedItemIds(new Set(bundle.items.map(item => item.id)));
    const deselectAll = () => setSelectedItemIds(new Set());
    
    return (
        <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Customize Export" footer={<><button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 font-medium bg-muted rounded-md">Cancel</button><button onClick={handleConfirmExport} disabled={selectedItemIds.size === 0} className="px-4 py-2 font-medium text-primary-foreground bg-primary rounded-md disabled:bg-muted">Export</button></>}>
            <div className="space-y-4"><p>Select which items to include in the exported <span className="font-semibold">{exportType === 'slpkg' ? '.slpkg package' : '.html file'}</span>.</p><div className="flex justify-between items-center"><span className="text-sm font-medium">{selectedItemIds.size} of {bundle.items.length} selected</span><div className="flex gap-2"><button onClick={deselectAll} className="text-xs font-semibold text-primary">Deselect All</button><button onClick={selectAll} className="text-xs font-semibold text-primary">Select All</button></div></div><div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-muted/50 rounded-md border">{bundle.items.map(item => <label key={item.id} className="flex items-center gap-3 p-2 bg-card rounded-md cursor-pointer hover:bg-accent"><input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItemSelection(item.id)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>{getItemIcon(item.type, item)}<span className="flex-grow text-sm truncate">{item.title}</span></label>)}</div></div>
        </Modal>
    );
  };
  
  if (loadState === 'loading') {
    return ( <div className="flex items-center justify-center h-full"><p>Loading bundle...</p></div> );
  }

  if (loadState === 'not-found' || !bundle) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h1 className="text-2xl font-bold mt-8">Bundle Not Found</h1>
        <p className="text-muted-foreground mt-2">The requested bundle could not be found. It may have been deleted.</p>
        <button onClick={onBack} className="mt-6 flex items-center mx-auto gap-2 text-sm font-medium text-primary hover:underline"><IconArrowLeft size={16} /> Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <ExportCustomizationModal />
      <header className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-4"><IconArrowLeft size={16} /> Back to Editor</button>
        <div><h1 className="text-3xl font-bold text-foreground">Share "{bundle.title}"</h1><p className="text-muted-foreground">{bundle.items.length} item{bundle.items.length !== 1 && 's'}</p></div>
      </header>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-start">
        <div className="w-full md:sticky md:top-24 order-1 md:order-2">
          <div className="w-full p-6 bg-card border border-border rounded-lg flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-4 text-card-foreground">Share via QR Code</h3>
            {canShareViaQR && qrCodeDataString ? (
              <><div className="p-4 bg-white rounded-lg"><QRCodeSVG value={qrCodeDataString} size={256} /></div><p className="text-sm text-center text-muted-foreground mt-4 max-w-xs">Scan this code to instantly import this bundle.</p></>
            ) : (
              <div className="text-center py-8"><IconQrCode size={48} className="mx-auto text-muted-foreground" /><p className="text-muted-foreground mt-4 max-w-xs">This bundle is too large or contains files, making it unsuitable for QR code sharing.</p></div>
            )}
          </div>
        </div>
        <div className="space-y-8 w-full order-2 md:order-1">
            <BundleStats bundle={bundle} />
            <div className="w-full p-6 bg-card border border-border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Download Package</h3>
                <p className="text-sm text-muted-foreground mb-4">Download a portable <code className="text-xs bg-muted p-1 rounded">.slpkg</code> file containing all your items.</p>
                <button onClick={handleDownloadPackage} className="w-full flex justify-center items-center gap-2 px-6 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"><IconDownload size={18}/>Download .slpkg</button>
            </div>
             <div className="w-full p-6 bg-card border border-border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Export as HTML</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a self-contained HTML file of your bundle, viewable in any browser.</p>
                <button onClick={handleExportHtml} className="w-full flex justify-center items-center gap-2 px-6 py-2 font-semibold text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/90"><IconFileCode size={18}/>Export .html</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareScreen;