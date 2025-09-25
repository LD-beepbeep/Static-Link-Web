import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconX } from './icons';

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readerId = "qr-reader";

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Initialize scanner
      const qrScanner = new Html5Qrcode(readerId);
      scannerRef.current = qrScanner;

      const startScanner = async () => {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length) {
            await qrScanner.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                qrScanner.stop();
                onScan(decodedText);
              },
              (errorMessage) => {
                // Ignore "QR code not found" errors
              }
            );
          } else {
              setError("No cameras found on this device.");
          }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start QR scanner.");
        }
      };
      
      startScanner();

      // Cleanup on component unmount or close
      return () => {
        qrScanner.stop().catch(err => {
          // Ignore errors when stopping, it might already be stopped.
        });
      };
    }
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div id={readerId} className="w-full max-w-md h-auto aspect-square"></div>
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end">
        <button
          onClick={onClose}
          className="p-3 bg-black/50 text-white rounded-full"
          aria-label="Close scanner"
        >
          <IconX size={24} />
        </button>
      </div>
      <div className="absolute bottom-10 text-center text-white bg-black/50 p-4 rounded-lg">
          <p className="font-semibold">Scan QR Code</p>
          <p className="text-sm">Position the QR code within the frame.</p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default QrScanner;
