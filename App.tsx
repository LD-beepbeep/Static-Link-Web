import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import HomeScreen from './screens/HomeScreen';
import BundleEditorScreen from './screens/BundleEditorScreen';
import ShareScreen from './screens/ShareScreen';
import BookmarkletScreen from './screens/BookmarkletScreen'; // New screen
import QrScanner from './components/QrScanner';
import { Screen, ItemType, LinkItem } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { IconCheck } from './components/icons';
import { useBundles } from './hooks/useBundles';
import { db } from './db/db';

// --- Toast Notification System ---
interface Toast {
  id: number;
  message: string;
}
interface ToastContextType {
  showToast: (message: string) => void;
}
const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast" role="status" aria-live="polite">
            <IconCheck size={16} />
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
  const { bundles, addBundle, importBundle, addItemToBundle } = useBundles();

  const handleScannedData = async (data: string) => {
    setIsScannerOpen(false);
    try {
        const parsed = JSON.parse(data);
        if(parsed.staticlink_qr && parsed.bundle) {
            const newId = await importBundle(parsed.bundle);
            showToast(`Imported bundle "${parsed.bundle.title}"`);
            navigateToEditor(newId);
            return;
        }
    } catch (e) {
        // Not a JSON bundle, treat as text/URL
    }

    // Handle as a regular URL/text
    if(bundles) {
        let targetBundle = bundles.find(b => b.title.toLowerCase() === 'inbox');
        if (!targetBundle) {
            const newBundleId = await addBundle('Inbox');
            targetBundle = { id: newBundleId, title: 'Inbox', items: [], createdAt: '', updatedAt: ''};
        }
        
        const newLink: LinkItem = {
          id: crypto.randomUUID(),
          type: ItemType.LINK,
          title: data,
          url: data,
          createdAt: new Date().toISOString()
        };
        
        // FIX: Replaced direct db.bundles.update with addItemToBundle hook to prevent circular reference errors.
        await addItemToBundle(targetBundle.id, newLink);
        showToast(`Link added to "${targetBundle.title}"`);
        navigateToEditor(targetBundle.id);
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
          onArchivedClick={() => { navigateHome(); setShowArchived(true); }}
          onRecycleBinClick={() => { navigateHome(); setShowRecycleBin(true); }}
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