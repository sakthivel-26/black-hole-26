import React, { useEffect, useRef, useState } from 'react';
import { FiMusic, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSongLyrics } from '../services/api';

interface SyncedLine {
  time: number;
  text: string;
}

function parseLRC(lrc: string): SyncedLine[] {
  const lines = lrc.split('\n');
  const result: SyncedLine[] = [];
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, '').trim();
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export default function LyricsViewer() {
  const { currentSong, currentTime, duration, seekTo } = usePlayerStore();
  const [lyricsState, setLyricsState] = useState<{
    text: string;
    isSynced: boolean;
    lines: SyncedLine[];
    loading: boolean;
  }>({
    text: '',
    isSynced: false,
    lines: [],
    loading: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics on song change
  useEffect(() => {
    if (!currentSong) return;

    let active = true;
    setLyricsState({ text: '', lines: [], isSynced: false, loading: true });

    const fetchLyrics = async () => {
      // 1. Try LrcLib Search (highly robust for fuzzy matching and regional songs)
      try {
        const cleanArtist = currentSong.primaryArtists.split(',')[0].split('&')[0].trim();
        const cleanTitle = currentSong.name
          .replace(/\s*[\(\[][^)]*Version[^)]*[\)\]]/gi, '')
          .replace(/\s*[\(\[][^)]*From[^)]*[\)\]]/gi, '')
          .replace(/\s*[\(\[][^)]*Soundtrack[^)]*[\)\]]/gi, '')
          .replace(/\s*[\(\[][^)]*OST[^)]*[\)\]]/gi, '')
          .trim();

        let results = [];
        const searchQuery = `${cleanTitle} ${cleanArtist}`;
        const searchResponse = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (searchResponse.ok) {
          results = await searchResponse.json();
        }

        // Fallback: if no results, search with just the track title to handle artist mismatches
        if ((!results || results.length === 0) && active) {
          const fallbackResponse = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`);
          if (fallbackResponse.ok) {
            results = await fallbackResponse.json();
          }
        }

        if (Array.isArray(results) && results.length > 0 && active) {
          // Prioritize matches that have synced lyrics first
          let match = results.find((r: any) => r.syncedLyrics && r.syncedLyrics.trim().length > 0);
          if (!match) {
            // Otherwise, fallback to matches that have plain lyrics
            match = results.find((r: any) => r.plainLyrics && r.plainLyrics.trim().length > 0);
          }

          if (match) {
            if (match.syncedLyrics) {
              const parsed = parseLRC(match.syncedLyrics);
              if (parsed.length > 0) {
                setLyricsState({
                  text: match.syncedLyrics,
                  isSynced: true,
                  lines: parsed,
                  loading: false,
                });
                return;
              }
            }
            if (match.plainLyrics) {
              setLyricsState({
                text: match.plainLyrics,
                isSynced: false,
                lines: [],
                loading: false,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('LrcLib search failed, checking Saavn fallback:', err);
      }

      // 2. Fallback to Saavn
      try {
        const saavnData = await getSongLyrics(currentSong.id);
        if (active) {
          setLyricsState({
            text: saavnData.lyrics || '',
            isSynced: false,
            lines: [],
            loading: false,
          });
        }
      } catch (err) {
        console.error('Saavn fallback failed:', err);
        if (active) {
          setLyricsState({ text: '', isSynced: false, lines: [], loading: false });
        }
      }
    };

    void fetchLyrics();

    return () => {
      active = false;
    };
  }, [currentSong?.id, duration]);

  const { isSynced, lines, loading, text } = lyricsState;

  // Find active line index
  const activeLineIndex = isSynced
    ? lines.findIndex((line, index) => {
        const nextLine = lines[index + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
      })
    : -1;

  // Scroll to active line
  useEffect(() => {
    if (isSynced && activeLineIndex >= -1) {
      const container = containerRef.current;
      if (activeLineIndex === -1) {
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      const activeLine = container?.querySelector(`#lyric-line-${activeLineIndex}`) as HTMLElement;
      if (container && activeLine) {
        const containerHeight = container.clientHeight;
        const activeLineHeight = activeLine.clientHeight;
        const activeLineTop = activeLine.offsetTop;
        const targetScrollTop = activeLineTop - (containerHeight / 2) + (activeLineHeight / 2);

        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      }
    }
  }, [activeLineIndex, isSynced]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <FiLoader size={30} className="animate-spin text-[#ff3b30]" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading Lyrics</p>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center px-6">
        <FiMusic size={40} className="mb-3 text-white/20" />
        <p className="text-lg font-bold text-white/70">No lyrics available</p>
        <p className="mt-1 text-xs text-white/30 max-w-[200px]">
          Lyrics aren't synced or uploaded yet.
        </p>
      </div>
    );
  }

  if (!isSynced) {
    return (
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto px-6 py-12 hide-scrollbar text-center select-none"
      >
        <div className="space-y-6 max-w-sm mx-auto">
          {text.split('\n').map((line, index) => (
            <p
              key={index}
              className="text-lg font-bold leading-relaxed text-white/80 transition-colors duration-200 hover:text-white"
            >
              {line || <br />}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-y-auto px-6 py-28 md:px-10 hide-scrollbar select-none"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
      }}
    >
      <div className="flex flex-col items-start space-y-7 pb-28 text-left">
        {lines.map((line, index) => {
          const isActive = index === activeLineIndex;
          const isPassed = index < activeLineIndex;

          return (
            <motion.button
              key={index}
              id={`lyric-line-${index}`}
              onClick={() => seekTo(line.time)}
              className="w-full text-left font-black text-2xl md:text-3xl lg:text-4xl tracking-tighter leading-tight focus:outline-none py-1.5 origin-left block"
              initial={{ opacity: 0.28, scale: 1 }}
              animate={{
                opacity: isActive ? 1 : isPassed ? 0.5 : 0.28,
                scale: isActive ? 1.03 : 1,
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                filter: isActive ? 'drop-shadow(0 4px 12px rgba(255,255,255,0.18))' : 'none',
              }}
              transition={{ duration: 0.38, ease: [0.25, 1, 0.5, 1] }}
              whileTap={{ scale: 0.96 }}
            >
              {line.text || '•••'}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
