import { Suspense, lazy, useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { usePlayerStore } from './store/usePlayerStore';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import AudioEngine from './components/AudioEngine';
import NowPlaying from './components/NowPlaying';
import QueuePanel from './components/QueuePanel';
import UpdateModal from './components/UpdateModal';

// Lazy load views for better performance
const HomePage = lazy(() => import('./components/HomePage'));
const SearchPage = lazy(() => import('./components/SearchPage'));
const LibraryPage = lazy(() => import('./components/LibraryPage'));
const DownloadsPage = lazy(() => import('./components/DownloadsPage'));
const AlbumView = lazy(() => import('./components/AlbumView'));
const ArtistView = lazy(() => import('./components/ArtistView'));

const APP_VERSION = '1.0.0';

function App() {
  const { currentView, dominantColor } = usePlayerStore();
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; changelog: string[]; apkUrl: string } | null>(null);

  useEffect(() => {
    void usePlayerStore.getState().hydrateCloudData();

    // Request notification permissions for background MediaSession controls (Android 13+)
    if (Capacitor.isNativePlatform() && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        void Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const fetchUrl = Capacitor.isNativePlatform()
          ? 'https://black-hole26.vercel.app/version.json'
          : '/version.json';

        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== APP_VERSION) {
            setUpdateInfo({
              latestVersion: data.version,
              changelog: data.changelog || [],
              apkUrl: data.apkUrl || 'https://github.com/sakthivel-26/black-hole-26/releases',
            });
            setShowUpdate(true);
          }
        }
      } catch (e) {
        console.warn('Failed to check for updates:', e);
      }
    };

    void checkForUpdates();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener: any = null;
    let lastBackPressTime = 0;

    const setupListener = async () => {
      try {
        backButtonListener = await CapApp.addListener('backButton', () => {
          const state = usePlayerStore.getState();
          
          if (state.showNowPlaying) {
            if (state.showLyrics) {
              state.setShowLyrics(false);
            } else {
              state.setShowNowPlaying(false);
            }
          } else if (state.showQueue) {
            state.setShowQueue(false);
          } else if (state.viewHistory.length > 0) {
            state.goBack();
          } else if (state.currentView !== 'home') {
            state.setView('home');
          } else {
            const now = Date.now();
            if (now - lastBackPressTime < 2000) {
              void CapApp.minimizeApp();
            } else {
              lastBackPressTime = now;
              toast('Press back again to exit', {
                duration: 2000,
                icon: '🚪',
                id: 'back-exit-toast',
              });
            }
          }
        });
      } catch (e) {
        console.error('Failed to setup back button listener:', e);
      }
    };

    void setupListener();

    return () => {
      if (backButtonListener) {
        void backButtonListener.remove();
      }
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomePage />;
      case 'search': return <SearchPage />;
      case 'library': return <LibraryPage />;
      case 'downloads': return <DownloadsPage />;
      case 'album': return <AlbumView />;
      case 'artist': return <ArtistView />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1c1c1e] text-white select-none">
      {/* Status Bar Blocker (Cuts the top camera/battery area) */}
      <div
        className="fixed top-0 left-0 right-0 z-[1000] bg-[#1c1c1e] pointer-events-none"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
      />

      {/* Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 opacity-20"
        style={{ 
          background: `radial-gradient(circle at 50% -20%, ${dominantColor}, transparent 70%)`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,55,95,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(28,28,30,0)_16%),linear-gradient(180deg,#232326_0%,#1c1c1e_26%,#161618_100%)]" />
      
      {/* App Structure */}
      <Sidebar />
      
      <main
        className="flex-1 relative overflow-y-auto overflow-x-hidden hide-scrollbar"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}
      >
        <div className="mx-auto min-h-full max-w-[1560px]">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            {renderView()}
          </Suspense>
        </div>
      </main>

      {/* Overlays & Global Components */}
      <AnimatePresence>
        <NowPlaying />
      </AnimatePresence>
      
      <AnimatePresence>
        <QueuePanel />
      </AnimatePresence>
      
      <PlayerBar />
      <AudioEngine />
      
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
          }
        }}
      />

      <AnimatePresence>
        {showUpdate && updateInfo && (
          <UpdateModal
            latestVersion={updateInfo.latestVersion}
            currentVersion={APP_VERSION}
            changelog={updateInfo.changelog}
            apkUrl={updateInfo.apkUrl}
            onClose={() => setShowUpdate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
