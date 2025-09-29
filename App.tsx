import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import HomeScreen from './screens/HomeScreen';
import BundleEditorScreen from './screens/BundleEditorScreen';
import ShareScreen from './screens/ShareScreen';
import BookmarkletScreen from './screens/BookmarkletScreen'; // New screen
import QrScanner from './components/QrScanner';
import { Screen } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { IconCheck, IconX } from './components/icons';
import { useBundles } from './hooks/useBundles';
import { db } from './db/db';

// --- Toast Notification System ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}
const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    // FIX: Disable toasts on mobile viewports as requested by the user for a cleaner experience.
    if (window.innerWidth < 640) {
        return;
    }
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="status" aria-live="polite">
            {toast.type === 'success' ? <IconCheck size={16} /> : <IconX size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
// --- End Toast System ---


// --- Hash-based Routing System ---
interface Route {
  screen: Screen;
  bundleId: string | null;
  params: URLSearchParams;
}

const parseHash = (hash: string): Route => {
  const [path, query] = hash.substring(1).split('?');
  const params = new URLSearchParams(query || '');
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'bundle' && parts[1]) {
    if (parts[2] === 'share') {
      return { screen: Screen.SHARE, bundleId: parts[1], params };
    }
    return { screen: Screen.EDITOR, bundleId: parts[1], params };
  }
  if (parts[0] === 'bookmarklet') {
      return { screen: Screen.BOOKMARKLET, bundleId: null, params };
  }
  return { screen: Screen.HOME, bundleId: null, params };
};
// --- End Routing System ---

const AppContent: React.FC = () => {
  const [route, setRoute] = useState<Route>(parseHash(window.location.hash));
  const [showArchived, setShowArchived] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { showToast } = useToast();
  const { importBundle } = useBundles();

  const handleScannedData = async (data: string) => {
    setIsScannerOpen(false);
    try {
        // The QR scanner now pre-validates the data, so we can assume it's a valid bundle.
        const parsed = JSON.parse(data);
        const newId = await importBundle(parsed.bundle);
        showToast(`Imported bundle: "${parsed.bundle.title}"`);
        navigateToEditor(newId);
    } catch (e) {
        // This is a fallback, but should rarely be hit.
        console.error("Error processing scanned data:", e);
        showToast("Failed to process QR code data.", "error");
    }
  };

  useEffect(() => {
    const onHashChange = () => {
        setRoute(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  
  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  const navigateToEditor = useCallback((bundleId: string) => navigate(`/bundle/${bundleId}`), [navigate]);
  const navigateToShare = useCallback((bundleId: string) => navigate(`/bundle/${bundleId}/share`), [navigate]);
  const navigateHome = useCallback(() => {
      setShowArchived(false);
      setShowRecycleBin(false);
      navigate('/');
  }, [navigate]);
  const navigateToBookmarklet = useCallback(() => navigate('/bookmarklet'), [navigate]);
  const navigateToArchive = useCallback(() => {
    setShowRecycleBin(false);
    setShowArchived(true);
    navigate('/');
  }, [navigate]);
  const navigateToRecycleBin = useCallback(() => {
    setShowArchived(false);
    setShowRecycleBin(true);
    navigate('/');
  }, [navigate]);
  
  const renderScreen = () => {
    switch (route.screen) {
      case Screen.EDITOR:
        return <BundleEditorScreen bundleId={route.bundleId!} onBack={navigateHome} onNavigateToShare={navigateToShare} />;
      case Screen.SHARE:
        return <ShareScreen bundleId={route.bundleId!} onBack={() => navigateToEditor(route.bundleId!)} />;
      case Screen.BOOKMARKLET:
        return <BookmarkletScreen onBack={navigateHome} />;
      case Screen.HOME:
      default:
        return <HomeScreen
            onNavigateToEditor={navigateToEditor} 
            onNavigateToShare={navigateToShare} 
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            showRecycleBin={showRecycleBin}
            setShowRecycleBin={setShowRecycleBin}
            bookmarkletParams={route.params}
            onOpenScanner={() => setIsScannerOpen(true)}
            onNavigateToArchive={navigateToArchive}
            onNavigateHome={navigateHome}
            onNavigateToRecycleBin={navigateToRecycleBin}
        />;
    }
  };
  
  return (
    <>
      <QrScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScannedData} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header
          onNavigateHome={navigateHome}
          onNavigateToBookmarklet={navigateToBookmarklet}
          onArchivedClick={navigateToArchive}
          onRecycleBinClick={navigateToRecycleBin}
        />
        <main className="flex-grow">
          <div key={`${route.screen}-${route.bundleId}-${showArchived}-${showRecycleBin}`} className="screen">
              {renderScreen()}
          </div>
        </main>
      </div>
    </>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
