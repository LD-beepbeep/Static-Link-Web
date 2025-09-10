import React, { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import BundleEditorScreen from './screens/BundleEditorScreen';
import ShareScreen from './screens/ShareScreen';
import { Screen } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);

  const navigateToEditor = useCallback((bundleId: string) => {
    setActiveBundleId(bundleId);
    setCurrentScreen(Screen.EDITOR);
  }, []);

  const navigateToShare = useCallback((bundleId: string) => {
    setActiveBundleId(bundleId);
    setCurrentScreen(Screen.SHARE);
  }, []);

  const navigateHome = useCallback(() => {
    setActiveBundleId(null);
    setCurrentScreen(Screen.HOME);
  }, []);
  
  const navigateBackFromShare = useCallback(() => {
    if(activeBundleId) {
        setCurrentScreen(Screen.EDITOR);
    } else {
        navigateHome();
    }
  }, [activeBundleId, navigateHome]);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.EDITOR:
        if (activeBundleId) {
          return <BundleEditorScreen bundleId={activeBundleId} onBack={navigateHome} onNavigateToShare={navigateToShare} />;
        }
        // Fallback to home if no ID
        return <HomeScreen onNavigateToEditor={navigateToEditor} onNavigateToShare={navigateToShare} />;
      case Screen.SHARE:
        if (activeBundleId) {
          return <ShareScreen bundleId={activeBundleId} onBack={navigateBackFromShare} />;
        }
         // Fallback to home if no ID
        return <HomeScreen onNavigateToEditor={navigateToEditor} onNavigateToShare={navigateToShare} />;
      case Screen.HOME:
      default:
        return <HomeScreen onNavigateToEditor={navigateToEditor} onNavigateToShare={navigateToShare} />;
    }
  };

  return (
    <main className="min-h-screen">
      {renderScreen()}
    </main>
  );
};

export default App;