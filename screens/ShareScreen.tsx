import React, { useMemo } from 'react';
import { useBundles } from '../hooks/useBundles';
import { QRCodeSVG } from 'qrcode.react';
import { createPackage, totalBundleSize } from '../services/bundleService';
import saveAs from 'file-saver';
import { IconArrowLeft, IconDownload, IconQrCode } from '../components/icons';

interface ShareScreenProps {
  bundleId: string;
  onBack: () => void;
}

const QR_CODE_SIZE_LIMIT = 2048; // Approx 2KB limit for QR codes

const ShareScreen: React.FC<ShareScreenProps> = ({ bundleId, onBack }) => {
  const { getBundle } = useBundles();
  const bundle = getBundle(bundleId);

  const bundleDataString = useMemo(() => {
    if (!bundle) return null;
    return JSON.stringify(bundle);
  }, [bundle]);

  const canShareViaQR = bundleDataString ? bundleDataString.length < QR_CODE_SIZE_LIMIT : false;

  const handleDownload = async () => {
    if (bundle) {
      const pkg = await createPackage(bundle);
      saveAs(pkg, `${bundle.title.replace(/\s/g, '_')}.slpkg`);
    }
  };

  if (!bundle) {
     return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading share options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-4">
          <IconArrowLeft size={16} />
          Back to Editor
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Share Bundle</h1>
        <p className="text-muted-foreground truncate">"{bundle.title}"</p>
      </header>

      <div className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-xl font-semibold flex items-center gap-3 text-card-foreground">
                      <IconDownload className="text-primary" />
                      Download Package
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                      Total size: {(totalBundleSize(bundle) / 1024).toFixed(2)} KB
                  </p>
              </div>
              <button 
                  onClick={handleDownload}
                  className="px-6 py-2 font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 w-full sm:w-auto flex-shrink-0"
              >
                  Download .slpkg
              </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
              The .slpkg file is a compressed archive containing all items in your bundle. It can be imported into another StaticLink app.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg">
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-4 text-card-foreground">
              <IconQrCode className="text-secondary" />
              Share via QR Code
          </h2>
          {canShareViaQR && bundleDataString ? (
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-lg shadow-inner">
                  <QRCodeSVG
                      value={bundleDataString}
                      size={256}
                      level="L"
                      includeMargin={true}
                      className="w-full max-w-[256px] h-auto"
                  />
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center max-w-xs">
                  Scan this QR code with another device to transfer the bundle. This only works for small bundles.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground">
                  This bundle is too large to be shared via a single QR code.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                  Please use the download option above to share as a file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareScreen;