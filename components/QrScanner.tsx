import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeError, Html5QrcodeResult } from "html5-qrcode";
import { IconX } from "./icons";

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ isOpen, onClose, onScan }) => {
  const readerId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // instantiate Html5Qrcode only once
  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(readerId);
    }
    // trigger permission warmup early
    Html5Qrcode.getCameras().catch(() => {});
  }, []);

  const qrboxFunction = useCallback((vw: number, vh: number) => {
    const minEdge = Math.min(vw, vh);
    const size = Math.floor(minEdge * 0.6); // smaller for better perf
    return { width: size, height: size };
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    setPermissionError(null);
    setScanFeedback(null);

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setPermissionError("No camera found on this device.");
        return;
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: qrboxFunction,
          useBarCodeDetectorIfSupported: true,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      console.error("QR Scanner start error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera access denied. Please grant permission in your browser settings."
        );
      } else if (err.name === "NotFoundError") {
        setPermissionError("No camera found. Please ensure a camera is connected.");
      } else {
        setPermissionError(err.message || "Failed to start camera.");
      }
    }
  }, [qrboxFunction]);

  // start/stop scanner on modal open
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    }
  }, [isOpen, startScanner]);

  const onScanSuccess = async (decodedText: string, decodedResult: Html5QrcodeResult) => {
    if (!scannerRef.current?.isScanning) return;

    await scannerRef.current.stop().catch(() => {});
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.staticlink_qr && parsed.bundle) {
        setScanFeedback(null);
        onScan(decodedText);
      } else {
        throw new Error();
      }
    } catch {
      setScanFeedback("Unsupported QR Code");
      setTimeout(() => setScanFeedback(null), 2000);
      // restart scanning automatically
      startScanner();
    }
  };

  const onScanFailure = (error: Html5QrcodeError) => {
    // ignore frequent not-found errors
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Scanner viewport */}
      <div id={readerId} className="relative w-full max-w-lg aspect-square">
        {/* Overlay scan box */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-4 border-green-500 rounded-lg w-3/4 h-3/4"></div>
        </div>
      </div>

      {/* Close button */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end">
        <button
          onClick={onClose}
          className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Close scanner"
        >
          <IconX size={24} />
        </button>
      </div>

      {/* Feedback / instructions */}
      <div className="absolute bottom-10 text-center text-white bg-black/50 p-4 rounded-lg max-w-[90%]">
        {permissionError ? (
          <p className="text-sm text-red-400">{permissionError}</p>
        ) : scanFeedback ? (
          <p className="font-semibold text-yellow-400">{scanFeedback}</p>
        ) : (
          <>
            <p className="font-semibold">Scan QR Code</p>
            <p className="text-sm">Position a StaticLink bundle code inside the green box.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default QrScanner;
