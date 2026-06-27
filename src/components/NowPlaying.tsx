import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiHeart,
  FiMessageCircle,
  FiList,
  FiMusic,
  FiPause,
  FiPlay,
  FiRepeat,
  FiShuffle,
  FiSkipBack,
  FiSkipForward,
  FiVolume2,
} from 'react-icons/fi';
import {
  downloadSongFile,
  formatDuration,
  getAudioQualityLabel,
  getImageUrl,
} from '../services/api';
import { usePlayerStore } from '../store/usePlayerStore';
import LyricsViewer from './LyricsViewer';

export default function NowPlaying() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    isLoading,
    showNowPlaying,
    showLyrics,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    isLiked,
    setShowNowPlaying,
    setShowLyrics,
    setShowQueue,
    addDownloadedSong,
    isDownloaded,
  } = usePlayerStore();



  if (!currentSong || !showNowPlaying) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentSong.id);
  const downloaded = isDownloaded(currentSong.id);
  const imageUrl = getImageUrl(currentSong.image, 'high');
  const backgroundImageUrl = getImageUrl(currentSong.image, 'low');
  const isInternationalTrack = (currentSong.language || '').toLowerCase().includes('english');

  const handleDownload = async () => {
    const loadingToast = toast.loading(`Downloading ${currentSong.name}...`);
    try {
      const result = await downloadSongFile(currentSong);
      addDownloadedSong(currentSong);
      toast.success(`Saved in ${result.quality}`, { id: loadingToast });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed.', { id: loadingToast });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.32, ease: [0.32, 0.94, 0.6, 1] }}
      drag={typeof window !== 'undefined' && window.innerWidth < 768 ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.85 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 100 || info.velocity.y > 400) {
          setShowNowPlaying(false);
        }
      }}
      className="fixed inset-0 z-[100]"
    >
      <div className="absolute inset-0 overflow-hidden">
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt=""
            className="h-full w-full object-cover scale-110 animate-fluid-bg"
            style={{ filter: 'blur(45px) brightness(0.38) saturate(1.1)' }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.52)_52%,rgba(0,0,0,0.76)_100%)]" />
      </div>

      <div
        className="relative z-10 flex h-full flex-col px-4 pb-6 pt-4 md:px-8 md:pb-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 40px)' }}
      >
        <div className="mb-4 hidden md:flex items-center justify-between">
          <button
            onClick={() => setShowNowPlaying(false)}
            className="rounded-full p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <FiChevronDown size={28} />
          </button>

          <div className="hidden text-center md:block">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Now Playing</p>
            <p className="mt-1 text-xs text-white/55">{currentSong.album?.name}</p>
          </div>

          <button
            onClick={() => setShowQueue(true)}
            className="rounded-full p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <FiList size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center min-h-0">
          {/* Desktop Layout */}
          {showLyrics ? (
            /* Apple Music Split Screen Layout */
            <div className="hidden md:grid w-full max-w-[1100px] mx-auto gap-16 grid-cols-[360px_1fr] items-center h-[76vh]">
              {/* Left Side: Artwork & Controls */}
              <div className="flex flex-col justify-center w-full max-w-[360px]">
                {/* Artwork */}
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] aspect-square w-full">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={currentSong.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/8 text-white/30">
                      <FiMusic size={64} />
                    </div>
                  )}
                </div>

                {/* Song Info & Fav/More */}
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-white">{currentSong.name}</h2>
                    <p className="mt-1 truncate text-base text-[#ff6d86] font-medium">{currentSong.primaryArtists}</p>
                    <p className="mt-0.5 truncate text-sm text-white/45">{currentSong.album?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleLike(currentSong)}
                      className={`rounded-full p-2.5 transition hover:bg-white/10 ${liked ? 'text-primary' : 'text-white/55'}`}
                    >
                      <FiHeart className={liked ? 'fill-current' : ''} size={19} />
                    </button>
                    <button
                      onClick={handleDownload}
                      className={`rounded-full p-2.5 transition hover:bg-white/10 ${downloaded ? 'text-emerald-400' : 'text-white/55'}`}
                    >
                      {downloaded ? <FiCheck size={19} /> : <FiDownload size={19} />}
                    </button>
                  </div>
                </div>

                {/* Scrubber */}
                <div className="mt-5">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => seekTo((Number(event.target.value) / 100) * duration)}
                    className="progress-bar h-1 w-full"
                    style={{
                      background: `linear-gradient(to right, #ff375f ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
                    }}
                  />
                  <div className="mt-2 flex justify-between text-xs text-white/40 font-medium">
                    <span className="tabular-nums">{formatDuration(currentTime)}</span>
                    <span className="tabular-nums">-{formatDuration(Math.max(0, duration - currentTime))}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-5 flex items-center justify-center gap-5">
                  <button
                    onClick={toggleShuffle}
                    className={`rounded-full p-2.5 transition hover:bg-white/10 ${shuffle ? 'text-primary' : 'text-white/55'}`}
                  >
                    <FiShuffle size={18} />
                  </button>
                  <button onClick={prevSong} className="rounded-full p-2.5 text-white transition hover:bg-white/10">
                    <FiSkipBack size={24} className="fill-current" />
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={togglePlay}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg hover:scale-105 transition"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    ) : isPlaying ? (
                      <FiPause size={24} className="fill-current" />
                    ) : (
                      <FiPlay size={24} className="ml-0.5 fill-current" />
                    )}
                  </motion.button>
                  <button onClick={nextSong} className="rounded-full p-2.5 text-white transition hover:bg-white/10">
                    <FiSkipForward size={24} className="fill-current" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`relative rounded-full p-2.5 transition hover:bg-white/10 ${repeat !== 'off' ? 'text-primary' : 'text-white/55'}`}
                  >
                    <FiRepeat size={18} />
                    {repeat === 'one' && <span className="absolute right-1 top-1 text-[8px] font-bold">1</span>}
                  </button>
                </div>

                {/* Volume & Close Lyrics Button */}
                <div className="mt-6 flex items-center gap-3">
                  <FiVolume2 className="text-white/45" size={16} />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume * 100}
                    onChange={(event) => setVolume(Number(event.target.value) / 100)}
                    className="volume-slider flex-1"
                    style={{
                      background: `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                    }}
                  />
                  <button
                    onClick={() => setShowLyrics(false)}
                    className="ml-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/10 hover:text-white font-medium"
                  >
                    Artwork
                  </button>
                </div>
              </div>

              {/* Right Side: Full Height Lyrics */}
              <div className="h-full w-full overflow-hidden flex flex-col justify-center py-2">
                <LyricsViewer />
              </div>
            </div>
          ) : (
            /* Standard Artwork / Controls Desktop Layout */
            <div className="hidden md:grid w-full max-w-[1200px] mx-auto gap-10 lg:grid-cols-[minmax(300px,620px)_minmax(280px,420px)] lg:items-center">
              <div className="mx-auto hidden w-full max-w-[min(62vw,380px)] sm:max-w-[min(70vw,460px)] lg:block lg:max-w-[min(78vw,520px)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="artwork"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className="overflow-hidden rounded-[2.125rem] border border-white/10 bg-white/6 shadow-[0_28px_90px_rgba(0,0,0,0.38)]"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={currentSong.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-white/8 text-white/30">
                        <FiMusic size={64} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="hidden w-full max-w-[420px] flex-col justify-center rounded-4xl border border-white/10 bg-white/8 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl md:flex md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
                    Black Hole
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
                    {getAudioQualityLabel(currentSong.downloadUrl)}
                  </span>
                </div>

                <h2 className="line-clamp-2 text-3xl font-semibold tracking-tight text-white">{currentSong.name}</h2>
                <p className="mt-2 line-clamp-2 text-lg text-[#ff6d86]">{currentSong.primaryArtists}</p>
                <p className="mt-2 text-sm text-white/45">
                  {currentSong.language ? `${currentSong.language} • ` : ''}
                  {currentSong.year || currentSong.album?.name}
                </p>

                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(currentSong)}
                    className={`rounded-full p-3 transition hover:bg-white/10 ${liked ? 'text-primary' : 'text-white/55'}`}
                  >
                    <FiHeart className={liked ? 'fill-current' : ''} size={19} />
                  </button>
                  <button
                    onClick={handleDownload}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
                      downloaded
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {downloaded ? <FiCheck size={15} /> : <FiDownload size={15} />}
                    {downloaded ? 'Downloaded' : 'Download'}
                  </button>
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={`rounded-full px-4 py-2.5 text-sm transition ${
                      showLyrics
                        ? 'bg-white text-black'
                        : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {showLyrics ? 'Artwork' : 'Lyrics'}
                  </button>
                </div>

                <div className="mt-8">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => seekTo((Number(event.target.value) / 100) * duration)}
                    className="progress-bar h-1.5 w-full"
                    style={{
                      background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.22) ${progress}%)`,
                    }}
                  />
                  <div className="mt-2 flex justify-between text-sm text-white/40">
                    <span className="tabular-nums">{formatDuration(currentTime)}</span>
                    <span className="tabular-nums">{formatDuration(duration)}</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={toggleShuffle}
                    className={`rounded-full p-3 transition hover:bg-white/10 ${shuffle ? 'text-primary' : 'text-white/55'}`}
                  >
                    <FiShuffle size={20} />
                  </button>
                  <button onClick={prevSong} className="rounded-full p-3 text-white transition hover:bg-white/10">
                    <FiSkipBack size={28} className="fill-current" />
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={togglePlay}
                    className="flex h-18 w-18 items-center justify-center rounded-full bg-white text-black shadow-[0_14px_40px_rgba(255,255,255,0.18)]"
                  >
                    {isLoading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    ) : isPlaying ? (
                      <FiPause size={30} />
                    ) : (
                      <FiPlay size={30} className="ml-1" />
                    )}
                  </motion.button>
                  <button onClick={nextSong} className="rounded-full p-3 text-white transition hover:bg-white/10">
                    <FiSkipForward size={28} className="fill-current" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`relative rounded-full p-3 transition hover:bg-white/10 ${repeat !== 'off' ? 'text-primary' : 'text-white/55'}`}
                  >
                    <FiRepeat size={20} />
                    {repeat === 'one' && <span className="absolute right-2 top-2 text-[8px] font-bold">1</span>}
                  </button>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <FiVolume2 className="text-white/45" size={18} />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume * 100}
                    onChange={(event) => setVolume(Number(event.target.value) / 100)}
                    className="volume-slider flex-1"
                    style={{
                      background: `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mobile Apple Music-style Layout */}
          <div className="md:hidden flex flex-col justify-between h-full w-full max-w-md mx-auto px-6 pb-10">
            
            {showLyrics ? (
              // Apple Music style Lyrics Mode Header
              <div 
                className="flex items-center gap-3 w-full border-b border-white/5 pt-3 pb-3 shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30">
                      <FiMusic size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-white">{currentSong.name}</h3>
                  <p className="truncate text-xs text-white/50 mt-0.5">{currentSong.primaryArtists}</p>
                </div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => toggleLike(currentSong)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white transition hover:bg-white/10 active:scale-95"
                >
                  <FiHeart
                    size={18}
                    className={liked ? 'fill-primary text-primary' : 'text-white/70'}
                  />
                </button>
              </div>
            ) : (
              // Top pull-down handle (only shown in artwork mode)
              <div className="flex flex-col items-center pt-2 pb-2 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}

            {/* Album artwork or Lyrics scroll container */}
            <div 
              className="flex-1 flex items-center justify-center py-4 min-h-0 w-full overflow-hidden"
              onPointerDownCapture={(e) => {
                if (showLyrics) e.stopPropagation();
              }}
              onTouchStartCapture={(e) => {
                if (showLyrics) e.stopPropagation();
              }}
            >
              <AnimatePresence mode="wait">
                {showLyrics ? (
                  <motion.div
                    key="mobile-lyrics"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full h-full overflow-hidden flex flex-col"
                  >
                    <LyricsViewer />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mobile-artwork"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-[72vw] max-w-[270px] aspect-square overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 bg-black/20"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={currentSong.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center text-white/30">
                        <FiMusic size={48} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Song Title, Artist, & Like Button in one row (Only shown in artwork mode) */}
            {!showLyrics && (
              <div className="flex items-center justify-between gap-4 mt-2 shrink-0">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold tracking-tight text-white">
                    {currentSong.name}
                  </h2>
                  <p className="truncate text-sm text-white/60 mt-0.5">
                    {currentSong.primaryArtists}
                  </p>
                </div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => toggleLike(currentSong)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white transition hover:bg-white/10 active:scale-95"
                >
                  <FiHeart
                    size={18}
                    className={liked ? 'fill-primary text-primary' : 'text-white/70'}
                  />
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-6 shrink-0">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onTouchStartCapture={(e) => e.stopPropagation()}
                onChange={(event) => seekTo((Number(event.target.value) / 100) * duration)}
                className="progress-bar h-1 w-full cursor-pointer accent-white bg-white/20 rounded-full"
                style={{
                  background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-white/50 font-medium tracking-wide">
                <span className="tabular-nums">{formatDuration(currentTime)}</span>
                <span className="tabular-nums">
                  {duration > 0 ? `-${formatDuration(Math.max(0, duration - currentTime))}` : '0:00'}
                </span>
              </div>
            </div>

            {/* Main Playback Controls */}
            <div className="mt-6 flex items-center justify-center gap-8 shrink-0">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={prevSong}
                className="p-3 text-white/95 transition active:scale-90"
                aria-label="Previous"
              >
                <FiSkipBack size={32} className="fill-current" />
              </button>

              <motion.button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                whileTap={{ scale: 0.93 }}
                onClick={togglePlay}
                className="grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.25)] active:scale-95 transition"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                ) : isPlaying ? (
                  <FiPause size={28} className="fill-current" />
                ) : (
                  <FiPlay size={28} className="fill-current ml-1" />
                )}
              </motion.button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={nextSong}
                className="p-3 text-white/95 transition active:scale-90"
                aria-label="Next"
              >
                <FiSkipForward size={32} className="fill-current" />
              </button>
            </div>

            {/* Bottom Actions Row */}
            <div className="mt-6 flex items-center justify-between px-4 pb-2 text-white/55 shrink-0">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setShowLyrics(!showLyrics)}
                className={`p-2 transition active:scale-90 ${showLyrics ? 'text-primary' : 'hover:text-white'}`}
                aria-label="Lyrics"
              >
                <FiMessageCircle size={20} />
              </button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={toggleShuffle}
                className={`p-2 transition active:scale-90 ${shuffle ? 'text-primary' : 'hover:text-white'}`}
                aria-label="Shuffle"
              >
                <FiShuffle size={20} />
              </button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={toggleRepeat}
                className={`relative p-2 transition active:scale-90 ${repeat !== 'off' ? 'text-primary' : 'hover:text-white'}`}
                aria-label="Repeat"
              >
                <FiRepeat size={20} />
                {repeat === 'one' && (
                  <span className="absolute -right-1 -top-1 text-[8px] font-bold bg-primary text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setShowQueue(true)}
                className="p-2 transition hover:text-white active:scale-90"
                aria-label="Queue"
              >
                <FiList size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
