import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiDisc, FiSearch, FiTrendingUp, FiUser, FiX } from 'react-icons/fi';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  getAlbumById,
  getImageUrl,
  isFreshSongsQuery,
  isSoundtrackStyleQuery,
  searchAlbums,
  searchArtists,
  searchSongs,
} from '../services/api';
import { searchYouTubeSongs } from '../services/youtube';
import type { Album, Artist, Song } from '../types';
import SongRow from './SongRow';

type SearchTab = 'all' | 'songs' | 'albums' | 'artists' | 'global';

const TRENDING_SEARCHES = [
  'Anirudh Ravichander',
  'A.R. Rahman',
  'Harris Jayaraj',
  'Sai Abhyankkar',
  'Theri',
  'Leo',
  '3 movie songs',
  'Jailer',
];

const BROWSE_CARDS = [
  { title: 'Tamil Hits', query: 'latest tamil songs', accent: 'from-[#6434d9] to-[#b16fff]' },
  { title: 'Hindi Pop', query: 'latest hindi pop songs', accent: 'from-[#ef4444] to-[#fb7185]' },
  { title: 'Film Soundtracks', query: 'new movie soundtrack', accent: 'from-[#ff7b2f] to-[#ffb86a]' },
  { title: 'International', query: 'english songs', accent: 'from-[#0f766e] to-[#2dd4bf]' },
  { title: 'Chill', query: 'lofi tamil songs', accent: 'from-[#0f766e] to-[#2dd4bf]' },
  { title: 'Love Songs', query: 'romantic tamil songs', accent: 'from-[#7c3aed] to-[#f472b6]' },
  { title: 'Party Mix', query: 'party tamil songs', accent: 'from-[#1d4ed8] to-[#38bdf8]' },
];

export default function SearchPage() {
  const { playSong, setView, searchQuery, setSearchQuery } = usePlayerStore();
  const [query, setQuery] = useState(searchQuery);
  const deferredQuery = useDeferredValue(query);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [youtubeSongs, setYoutubeSongs] = useState<Song[]>([]);
  const [soundtrackAlbum, setSoundtrackAlbum] = useState<Album | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSoundtrackAlbum, setLoadingSoundtrackAlbum] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [didYouMean, setDidYouMean] = useState('');

  const addToRecentSearches = (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (trimmed.length <= 2) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addToRecentSearches(query);
    }
  };

  const trimmedQuery = deferredQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const isFreshQuery = isFreshSongsQuery(trimmedQuery);
  const shouldShowSoundtrackContent = isSoundtrackStyleQuery(trimmedQuery) && !isFreshQuery;
  const featuredAlbum = albums.find((album) => album.name.toLowerCase().includes(normalizedQuery)) || albums[0] || null;
  const featuredSoundtrack = albums.find((album) => {
    const name = album.name.toLowerCase();
    return (
      name.includes(normalizedQuery) &&
      (name.includes('original motion picture soundtrack') || name.includes('soundtrack'))
    );
  });

  useEffect(() => {
    if (!trimmedQuery || songs.length === 0) {
      setDidYouMean('');
      return;
    }

    const topSong = songs[0];
    const topSongName = topSong.name.trim();
    const sameQuery = topSongName.toLowerCase() === trimmedQuery.toLowerCase();

    if (!sameQuery && topSongName.length > 0) {
      setDidYouMean(topSongName);
      return;
    }

    setDidYouMean('');
  }, [songs, trimmedQuery]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;

    if (!trimmedQuery) {
      setSongs([]);
      setAlbums([]);
      setArtists([]);
      setYoutubeSongs([]);
      setSoundtrackAlbum(null);
      setHasSearched(false);
      setIsSearching(false);
      setErrorMessage('');
      return;
    }

    setActiveTab('all');
    setIsSearching(true);
    setHasSearched(true);
    setErrorMessage('');
    setSongs([]);
    setAlbums([]);
    setArtists([]);
    setYoutubeSongs([]);
    setSoundtrackAlbum(null);
    setSearchQuery(trimmedQuery);

    Promise.allSettled([
      searchSongs(trimmedQuery, 1, 30),
      searchAlbums(trimmedQuery),
      searchArtists(trimmedQuery),
      searchYouTubeSongs(trimmedQuery),
    ])
      .then(([songsResult, albumsResult, artistsResult, ytResult]) => {
        if (!active) return;

        if (songsResult.status === 'fulfilled') setSongs(songsResult.value.results);
        if (albumsResult.status === 'fulfilled') setAlbums(albumsResult.value.results);
        if (artistsResult.status === 'fulfilled') setArtists(artistsResult.value.results);
        if (ytResult.status === 'fulfilled') setYoutubeSongs(ytResult.value);

        if (
          songsResult.status === 'rejected' &&
          albumsResult.status === 'rejected' &&
          artistsResult.status === 'rejected' &&
          ytResult.status === 'rejected'
        ) {
          setErrorMessage('Could not reach the music API right now. Please try again in a moment.');
        }
      })
      .finally(() => {
        if (active) setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [trimmedQuery, setSearchQuery]);

  useEffect(() => {
    if (!trimmedQuery || !featuredAlbum || !shouldShowSoundtrackContent) {
      setSoundtrackAlbum(null);
      setLoadingSoundtrackAlbum(false);
      return;
    }

    let active = true;
    setLoadingSoundtrackAlbum(true);

    getAlbumById(featuredAlbum.id)
      .then((album) => {
        if (!active) return;
        setSoundtrackAlbum(album.songs.length > 0 ? album : null);
      })
      .catch(() => {
        if (!active) return;
        setSoundtrackAlbum(null);
      })
      .finally(() => {
        if (active) setLoadingSoundtrackAlbum(false);
      });

    return () => {
      active = false;
    };
  }, [featuredAlbum, trimmedQuery, shouldShowSoundtrackContent]);

  const handleBrowseSearch = (browseQuery: string) => {
    setQuery(browseQuery);
  };

  return (
    <div className="px-4 pb-32 pt-6 md:px-8 md:pb-24">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Search</h1>
        <p className="mt-2 text-sm text-white/50">
          Find songs, albums, artists, and movie soundtrack tracklists in one place.
        </p>
      </header>

      <div
        className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/6 bg-[#1c1c1e]/92 px-4 py-4 backdrop-blur-2xl md:-mx-8 md:px-8"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="relative max-w-3xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={19} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Artists, songs, albums, movies"
            className="w-full rounded-[22px] border border-white/10 bg-white/6 py-3 pl-12 pr-11 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-white/8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/35 transition hover:bg-white/10 hover:text-white/70"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {didYouMean && hasSearched && !isSearching && (
          <div className="mt-3 flex max-w-3xl flex-wrap items-center gap-2 text-sm text-white/55">
            <span>Did you mean</span>
            <button
              onClick={() => setQuery(didYouMean)}
              className="rounded-full bg-white/8 px-3 py-1.5 font-medium text-white transition hover:bg-white/12 hover:text-white"
            >
              {didYouMean}
            </button>
          </div>
        )}

        {hasSearched && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(['all', 'songs', 'albums', 'artists', 'global'] as SearchTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-white/6 text-white/60 hover:bg-white/8 hover:text-white'
                }`}
              >
                {tab === 'global' ? 'Global (YT)' : tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {isSearching && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      )}

      {hasSearched && !isSearching && (
        <div>
          {errorMessage ? (
            <div className="rounded-[28px] border border-white/8 bg-white/4 px-6 py-12 text-center">
              <FiSearch className="mx-auto mb-4 text-white/35" size={42} />
              <p className="text-lg font-medium text-white">Search is temporarily unavailable</p>
              <p className="mt-2 text-sm text-white/45">{errorMessage}</p>
            </div>
          ) : (
            <>
              {featuredSoundtrack && shouldShowSoundtrackContent && activeTab === 'all' && (
                <section className="mb-10">
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-white">Top soundtrack result</h2>
                    <p className="text-sm text-white/40">
                      Movie searches are boosted toward original soundtrack albums when they exist.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      addToRecentSearches(query);
                      setView('album', featuredSoundtrack);
                    }}
                    className="grid w-full gap-5 overflow-hidden rounded-[30px] border border-white/8 bg-white/5 p-5 text-left shadow-[0_22px_70px_rgba(0,0,0,0.18)] md:grid-cols-[180px_1fr]"
                  >
                    <div className="aspect-square overflow-hidden rounded-3xl bg-white/6">
                      {getImageUrl(featuredSoundtrack.image, 'high') ? (
                        <img
                          src={getImageUrl(featuredSoundtrack.image, 'high')}
                          alt={featuredSoundtrack.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <FiSearch size={28} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-center">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">Album</p>
                      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                        {featuredSoundtrack.name}
                      </h3>
                      <p className="mt-3 text-base text-[#ff6d86]">{featuredSoundtrack.primaryArtists}</p>
                      <p className="mt-2 text-sm text-white/45">
                        {featuredSoundtrack.year ? `${featuredSoundtrack.year} - ` : ''}
                        {featuredSoundtrack.songCount} songs
                      </p>
                    </div>
                  </motion.button>
                </section>
              )}

              {loadingSoundtrackAlbum && shouldShowSoundtrackContent && activeTab === 'all' && (
                <section className="mb-10">
                  <div className="rounded-[28px] border border-white/8 bg-white/4 p-6">
                    <div className="flex items-center gap-3 text-white/50">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
                      <span>Loading songs from the top movie album...</span>
                    </div>
                  </div>
                </section>
              )}

              {soundtrackAlbum && shouldShowSoundtrackContent && activeTab === 'all' && (
                <section className="mb-10">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-white">
                        Songs from {soundtrackAlbum.name}
                      </h2>
                      <p className="text-sm text-white/40">
                        Search now pulls the top album tracklist so movie names show the actual songs too.
                      </p>
                    </div>
                    <button
                      onClick={() => setView('album', soundtrackAlbum)}
                      className="text-sm font-medium text-[#ff617b] transition hover:text-[#ff8fa1]"
                    >
                      Open album
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/4">
                    <div className="flex flex-col gap-4 border-b border-white/8 p-4 sm:flex-row sm:items-center">
                      <div className="h-16 w-16 overflow-hidden rounded-[18px] bg-white/6">
                        {getImageUrl(soundtrackAlbum.image, 'medium') ? (
                          <img
                            src={getImageUrl(soundtrackAlbum.image, 'medium')}
                            alt={soundtrackAlbum.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/30">
                            <FiDisc size={22} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-lg font-medium text-white">{soundtrackAlbum.name}</p>
                        <p className="line-clamp-1 text-sm text-white/45">{soundtrackAlbum.primaryArtists}</p>
                      </div>

                      <button
                        onClick={() => {
                          addToRecentSearches(query);
                          playSong(soundtrackAlbum.songs[0], soundtrackAlbum.songs);
                        }}
                        className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
                      >
                        Play All
                      </button>
                    </div>

                    <div className="p-2">
                      {soundtrackAlbum.songs.slice(0, 12).map((song, index) => (
                        <SongRow
                          key={`${soundtrackAlbum.id}-${song.id}`}
                          song={song}
                          index={index + 1}
                          onPlay={() => {
                            addToRecentSearches(query);
                            playSong(song, soundtrackAlbum.songs);
                          }}
                          showAlbum={false}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'songs') && songs.length > 0 && (
                <section className="mb-10">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-white">
                        {isFreshQuery ? 'Latest Top Matches' : 'Songs'}
                      </h2>
                      <p className="text-sm text-white/40">
                        {isFreshQuery
                          ? `Fresh song-first results for "${trimmedQuery}"`
                          : `Top matches for "${trimmedQuery}"`}
                      </p>
                    </div>
                    {songs.length > 8 && activeTab === 'all' && (
                      <button
                        onClick={() => setActiveTab('songs')}
                        className="text-sm font-medium text-[#ff617b] transition hover:text-[#ff8fa1]"
                      >
                        See all
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {songs.slice(0, activeTab === 'songs' ? 50 : 8).map((song, index) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        index={index + 1}
                        onPlay={() => {
                          addToRecentSearches(query);
                          playSong(song, songs);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'global') && youtubeSongs.length > 0 && (
                <section className="mb-10">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                        Global Tracks <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">YouTube</span>
                      </h2>
                      <p className="text-sm text-white/40">Full length high quality streams from YouTube Music.</p>
                    </div>
                    {youtubeSongs.length > 6 && activeTab === 'all' && (
                      <button
                        onClick={() => setActiveTab('global')}
                        className="text-sm font-medium text-[#ff617b] transition hover:text-[#ff8fa1]"
                      >
                        See all
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {youtubeSongs.slice(0, activeTab === 'global' ? 50 : 6).map((song, index) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        index={index + 1}
                        onPlay={() => {
                          addToRecentSearches(query);
                          playSong(song, youtubeSongs);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {!isFreshQuery && (activeTab === 'all' || activeTab === 'albums') && albums.length > 0 && (
                <section className="mb-10">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-white">Albums</h2>
                      <p className="text-sm text-white/40">Full projects and soundtrack cuts.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {albums.slice(0, activeTab === 'albums' ? 20 : 5).map((album) => (
                      <motion.button
                        key={album.id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-left"
                        onClick={() => {
                          addToRecentSearches(query);
                          setView('album', album);
                        }}
                      >
                        <div className="aspect-square overflow-hidden rounded-3xl bg-white/5">
                          {getImageUrl(album.image, 'medium') ? (
                            <img
                              src={getImageUrl(album.image, 'medium')}
                              alt={album.name}
                              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/30">
                              <FiSearch size={28} />
                            </div>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-2 text-base font-medium text-white">{album.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-white/45">
                          {album.year ? `${album.year} - ` : ''}
                          {album.primaryArtists}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'artists') && artists.length > 0 && (
                <section className="mb-10">
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-white">Artists</h2>
                    <p className="text-sm text-white/40">People behind the songs.</p>
                  </div>

                  <div className="flex gap-5 overflow-x-auto pb-2 hide-scrollbar">
                    {artists.slice(0, activeTab === 'artists' ? 20 : 10).map((artist) => (
                      <motion.button
                        key={artist.id}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          addToRecentSearches(query);
                          setView('artist', artist);
                        }}
                        className="w-28 shrink-0 text-center"
                      >
                        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/5">
                          {getImageUrl(artist.image, 'medium') ? (
                            <img
                              src={getImageUrl(artist.image, 'medium')}
                              alt={artist.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <FiUser className="text-white/30" size={32} />
                          )}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-medium text-white">{artist.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {songs.length === 0 && albums.length === 0 && artists.length === 0 && youtubeSongs.length === 0 && !soundtrackAlbum && (
                <div className="rounded-[28px] border border-white/8 bg-white/4 px-6 py-14 text-center">
                  <FiSearch className="mx-auto mb-4 text-white/35" size={42} />
                  <p className="text-lg font-medium text-white">No results found</p>
                  <p className="mt-2 text-sm text-white/45">Try a different song title, artist name, or album.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="space-y-10">
          {recentSearches.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <FiSearch className="text-primary animate-pulse" size={18} />
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Recent Searches</h2>
                </div>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('recentSearches');
                      setRecentSearches([]);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="text-xs font-semibold text-white/40 hover:text-white transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleBrowseSearch(item)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-[#ff617b]" size={18} />
              <h2 className="text-2xl font-semibold tracking-tight text-white">Trending Searches</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((item) => (
                <button
                  key={item}
                  onClick={() => handleBrowseSearch(item)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white">Browse by mood</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {BROWSE_CARDS.map((card) => (
                <motion.button
                  key={card.title}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleBrowseSearch(card.query)}
                  className={`relative overflow-hidden rounded-[28px] bg-linear-to-br ${card.accent} p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)]`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_38%)]" />
                  <p className="relative text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">Quick Search</p>
                  <h3 className="relative mt-10 max-w-40 text-3xl font-semibold tracking-tight text-white">
                    {card.title}
                  </h3>
                  <div className="relative mt-12 flex items-center justify-between text-white/80">
                    <span className="text-sm">Jump in</span>
                    <FiSearch size={18} />
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
