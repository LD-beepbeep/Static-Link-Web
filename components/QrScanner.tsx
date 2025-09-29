import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeError, Html5QrcodeResult } from 'html5-qrcode';
import { IconX } from './icons';

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const readerId = "qr-reader";

  useEffect(() => {
    if (isOpen) {
      setPermissionError(null);
      setScanFeedback(null);
      
      const qrScanner = new Html5Qrcode(readerId);
      scannerRef.current = qrScanner;

      const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        if (scannerRef.current?.isScanning) {
            try {
                const parsed = JSON.parse(decodedText);
                if (parsed.staticlink_qr === true && parsed.bundle) {
                    // Valid StaticLink QR code found
                    setScanFeedback(null);
                    scannerRef.current.stop()
                        .then(() => onScan(decodedText))
                        .catch(err => {
                            console.error("Failed to stop scanner cleanly, but proceeding with scan data.", err);
                            onScan(decodedText);
                        });
                } else {
                    throw new Error("Unsupported QR code format.");
                }
            } catch (e) {
                // Scanned a QR code, but it's not a valid StaticLink bundle
                setScanFeedback("Unsupported QR Code");
                setTimeout(() => setScanFeedback(null), 2000); // Show feedback for 2 seconds
            }
        }
      };
      
      const onScanFailure = (error: Html5QrcodeError) => {
        // This is called frequently, ignore "QR code not found" which is expected.
      };

      const startScanner = async () => {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras || cameras.length === 0) {
            setPermissionError("No camera found on this device.");
            return;
          }
          
          const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.85); // Slightly larger scan box
              return { width: qrboxSize, height: qrboxSize };
          };

          await qrScanner.start(
            { facingMode: "environment" },
            {
              fps: 30, // Higher FPS for faster detection
              qrbox: qrboxFunction,
              useBarCodeDetectorIfSupported: true,
            },
            onScanSuccess,
            onScanFailure
          );
        } catch (err: any) {
            console.error("QR Scanner start error:", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                 setPermissionError("Camera access denied. Please grant permission in your browser settings to use the scanner.");
            } else if (err.name === "NotFoundError") {
                setPermissionError("No camera found. Please ensure a camera is connected and enabled.");
            } else {
                 setPermissionError(err.message || "Failed to start camera.");
            }
        }
      };
      
      startScanner();

      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => {
              // This can fail if the component unmounts before scanner is fully stopped. Safe to ignore.
            });
        }
      };
    }
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div id={readerId} className="w-full max-w-lg h-auto aspect-square"></div>
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end">
        <button
          onClick={onClose}
          className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Close scanner"
        >
          <IconX size={24} />
        </button>
      </div>
      <div className="absolute bottom-10 text-center text-white bg-black/50 p-4 rounded-lg max-w-[90%]">
          {permissionError ? (
             <p className="text-sm text-red-400">{permissionError}</p>
          ) : scanFeedback ? (
            <p className="font-semibold text-yellow-400">{scanFeedback}</p>
          ) : (
            <>
                <p className="font-semibold">Scan QR Code</p>
                <p className="text-sm">Position a StaticLink bundle code within the frame.</p>
            </>
          )}
      </div>
    </div>
  );
};

export default QrScanner;
