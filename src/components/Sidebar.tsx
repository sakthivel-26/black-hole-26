import { usePlayerStore } from '../store/usePlayerStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiChevronDown, FiDownload, FiHome, FiInfo, FiSearch, FiMusic } from 'react-icons/fi';
import type { ViewMode } from '../types';
import InstallButton from './InstallButton';

const NAV_ITEMS: { view: ViewMode; icon: typeof FiHome; label: string }[] = [
  { view: 'home', icon: FiHome, label: 'Home' },
  { view: 'search', icon: FiSearch, label: 'Search' },
  { view: 'library', icon: FiMusic, label: 'Library' },
  { view: 'downloads', icon: FiDownload, label: 'Downloads' },
];

export default function Sidebar() {
  const { currentView, setView } = usePlayerStore();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full glass-strong border-r border-white/5">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3">
          <img
            src="/logo.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/black-hole-logo.svg";
            }}
            alt="Black Hole logo"
            className="h-10 w-10 rounded-xl object-cover shadow-[0_10px_24px_rgba(255,110,24,0.22)]"
          />
          <span className="text-lg font-bold text-gradient">Black Hole</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                currentView === view
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{label}</span>
              {currentView === view && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto w-1 h-5 rounded-full bg-primary"
                />
              )}
            </button>
          ))}

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
            <button
              onClick={() => setShowAbout((previous) => !previous)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-[#ff8a4f]">
                <FiInfo size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">About Us</p>
                <p className="text-xs text-white/38">Below downloads</p>
              </div>
              <FiChevronDown
                size={16}
                className={`text-white/45 transition-transform ${showAbout ? 'rotate-180' : ''}`}
              />
            </button>

            {showAbout && (
              <div className="border-t border-white/8 px-4 py-4">
                <div className="rounded-2xl border border-[#ff8a4f]/15 bg-[radial-gradient(circle_at_top,rgba(255,160,96,0.12),transparent_58%),rgba(255,255,255,0.03)] px-4 py-5 text-center">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/38">Stay Vibe</p>
                  <p className="mt-3 text-sm font-semibold tracking-wide text-white">
                    POWERED BY SHAKTHI
                  </p>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Info */}
        <div className="px-6 py-4 border-t border-white/5">
          <p className="text-xs text-white/20">Black Hole v1.0</p>
          <p className="text-xs text-white/10">Best available stream: up to 320 kbps AAC</p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around py-1">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-colors ${
                currentView === view ? 'text-primary' : 'text-white/40'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>
      <InstallButton />
    </>
  );
}
