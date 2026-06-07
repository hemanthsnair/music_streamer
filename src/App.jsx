import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import AudioPlayer from './components/AudioPlayer';
import AuthPage from './components/AuthPage';
import DashboardView from './components/DashboardView';
import SongsView from './components/SongsView';
import ArtistsView from './components/ArtistsView';
import PlaylistsView from './components/PlaylistsView';
import GlobalSearch from './components/GlobalSearch';
import ImportPlaylistModal from './components/ImportPlaylistModal';
import { X } from 'lucide-react';

const App = () => {
  // 1. Auth State
  const [token, setToken] = useState(localStorage.getItem('melody_token') || null);
  const [user, setUser] = useState(null);
  
  // 2. Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [playlists, setPlaylists] = useState([]);
  
  // 3. Audio Player State
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // 4. Personal Stats
  const [likedSongsCount, setLikedSongsCount] = useState(0);

  // 5. Modals
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showImportPlaylistModal, setShowImportPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [playlistFormLoading, setPlaylistFormLoading] = useState(false);

  // Audio HTML5 Ref
  const audioRef = useRef(new Audio());

  // YouTube Iframe Player
  const ytPlayerRef = useRef(null);
  const [ytPlayerReady, setYtPlayerReady] = useState(false);

  // Fetch logged in user's profile on token change
  useEffect(() => {
    const fetchProfileAndData = async () => {
      if (!token) {
        setUser(null);
        setPlaylists([]);
        setLikedSongsCount(0);
        return;
      }

      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        // Verify token & profile
        const resMe = await fetch('http://localhost:5000/api/auth/me', { headers });
        if (!resMe.ok) {
          throw new Error('Session expired');
        }
        const dataMe = await resMe.json();
        setUser(dataMe.user);

        // Fetch user playlists
        const resPlaylists = await fetch('http://localhost:5000/api/playlists', { headers });
        const dataPlaylists = await resPlaylists.json();
        setPlaylists(dataPlaylists);

        // Fetch liked songs count
        const resLiked = await fetch('http://localhost:5000/api/songs/liked', { headers });
        const dataLiked = await resLiked.json();
        setLikedSongsCount(dataLiked.length);
      } catch (err) {
        console.error('Session validation error:', err);
        handleLogout();
      }
    };

    fetchProfileAndData();
  }, [token]);

  // Sync playlists when adding or modifying playlists
  const fetchPlaylists = async () => {
    if (!token) return;
    try {
      const resPlaylists = await fetch('http://localhost:5000/api/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataPlaylists = await resPlaylists.json();
      setPlaylists(dataPlaylists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  // Auth Callbacks
  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('melody_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('melody_token');
    // Stop playing audio
    audioRef.current.pause();
    setIsPlaying(false);
    setCurrentSong(null);
    setQueue([]);
    setQueueIndex(-1);
    
    // Clear states
    setToken(null);
    setUser(null);
    setPlaylists([]);
    setLikedSongsCount(0);
    setActiveTab('dashboard');
  };

  // Load and initialize YouTube player iframe API
  useEffect(() => {
    const hasScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!hasScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      createYTPlayer();
    };

    if (window.YT && window.YT.Player) {
      createYTPlayer();
    }

    function createYTPlayer() {
      try {
        new window.YT.Player('youtube-iframe-player', {
          height: '0',
          width: '0',
          videoId: '',
          playerVars: {
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0
          },
          events: {
            onReady: (event) => {
              ytPlayerRef.current = event.target;
              setYtPlayerReady(true);
              event.target.setVolume(volume * 100);
            },
            onStateChange: (event) => {
              if (event.data === 0) { // ENDED
                handleNextTrack();
              }
            }
          }
        });
      } catch (err) {
        console.error('Error creating YouTube player:', err);
      }
    }
  }, []);

  // Audio HTML5 Event Listeners
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      if (currentSong?.sourceType !== 'youtube') {
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (currentSong?.sourceType !== 'youtube') {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (currentSong?.sourceType !== 'youtube') {
        handleNextTrack();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue, queueIndex, currentSong]);

  // Sync playback for both players
  useEffect(() => {
    if (currentSong) {
      const isYt = currentSong.sourceType === 'youtube';
      const audio = audioRef.current;

      if (isYt) {
        if (!audio.paused) {
          audio.pause();
        }

        if (ytPlayerReady && ytPlayerRef.current) {
          try {
            const currentVideoId = ytPlayerRef.current.getVideoData?.()?.video_id;
            if (currentVideoId !== currentSong.externalId) {
              if (isPlaying) {
                ytPlayerRef.current.loadVideoById(currentSong.externalId);
              } else {
                ytPlayerRef.current.cueVideoById(currentSong.externalId);
              }
            } else {
              if (isPlaying) {
                ytPlayerRef.current.playVideo();
              } else {
                ytPlayerRef.current.pauseVideo();
              }
            }
          } catch (err) {
            console.error('YouTube player playback control error:', err);
          }
        }
      } else {
        if (ytPlayerReady && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch (err) {}
        }

        if (audio.src !== currentSong.audioUrl) {
          audio.src = currentSong.audioUrl;
          audio.load();
        }

        if (isPlaying) {
          audio.play().catch(err => {
            console.warn('Playback error, user interaction required:', err);
            setIsPlaying(false);
          });
        } else {
          audio.pause();
        }
      }
    }
  }, [currentSong, isPlaying, ytPlayerReady]);

  // Sync volume for both players
  useEffect(() => {
    audioRef.current.volume = volume;
    if (ytPlayerReady && ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(volume * 100);
      } catch (err) {}
    }
  }, [volume, ytPlayerReady]);

  // Sync currentTime and duration for YouTube playback
  useEffect(() => {
    let interval;
    if (isPlaying && currentSong?.sourceType === 'youtube' && ytPlayerReady && ytPlayerRef.current) {
      interval = setInterval(() => {
        try {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
            setCurrentTime(ytPlayerRef.current.getCurrentTime());
            setDuration(ytPlayerRef.current.getDuration() || 0);
          }
        } catch (err) {}
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSong, ytPlayerReady]);

  // Playback Operations
  const handlePlaySong = async (song, songList = []) => {
    if (song.id && !String(song.id).startsWith('temp-')) {
      // Record API play count asynchronously
      fetch(`http://localhost:5000/api/songs/${song.id}/play`, { method: 'POST' }).catch(() => {});
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(song.duration || 0);
    
    if (songList.length > 0) {
      setQueue(songList);
      const index = songList.findIndex(s => s.id === song.id);
      setQueueIndex(index);
    } else {
      setQueue([song]);
      setQueueIndex(0);
    }
  };

  const handlePlayPause = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (queue.length === 0 || queueIndex === -1) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIdx);
    const nextSong = queue[nextIdx];
    setCurrentSong(nextSong);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (queue.length === 0 || queueIndex === -1) return;
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    const prevSong = queue[prevIdx];
    setCurrentSong(prevSong);
    setIsPlaying(true);
  };

  const handleSeek = (time) => {
    if (currentSong?.sourceType === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        try {
          ytPlayerRef.current.seekTo(time, true);
        } catch (err) {}
      }
      setCurrentTime(time);
    } else {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Catalog / User Interaction Operations
  const handleLikeToggle = async (songId) => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:5000/api/songs/${songId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Update Liked Count
      setLikedSongsCount(prev => (data.liked ? prev + 1 : prev - 1));

      // Update currently playing song like status if it is the target
      if (currentSong && currentSong.id === songId) {
        setCurrentSong(prev => ({ ...prev, isLiked: data.liked ? 1 : 0 }));
      }

      // Update current queue song status
      setQueue(prevQueue =>
        prevQueue.map(s => (s.id === songId ? { ...s, isLiked: data.liked ? 1 : 0 } : s))
      );
    } catch (err) {
      console.error('Error toggling song liked state:', err);
    }
  };

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistName) return;

    setPlaylistFormLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaylistName, description: newPlaylistDesc })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create playlist');

      setShowCreatePlaylistModal(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      await fetchPlaylists();
      
      // Automatically navigate to the newly created playlist
      setActiveTab(`playlist-${data.id}`);
    } catch (err) {
      console.error('Playlist creation error:', err);
    } finally {
      setPlaylistFormLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId, songId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to add song to playlist');
      } else {
        alert('Song added to playlist successfully!');
        // Refresh playlist menu stats
        fetchPlaylists();
      }
    } catch (err) {
      console.error('Add to playlist error:', err);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId) => {
    try {
      await fetch(`http://localhost:5000/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPlaylists(); // update count stats
    } catch (err) {
      console.error('Error removing song from playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await fetch(`http://localhost:5000/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setActiveTab('dashboard');
      fetchPlaylists();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  };

  // Render subviews based on active tab state
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <DashboardView
          username={user?.username}
          token={token}
          onPlaySong={handlePlaySong}
          onNavigate={(tab) => setActiveTab(tab)}
          likedSongsCount={likedSongsCount}
          playlistsCount={playlists.length}
        />
      );
    }

    if (activeTab === 'songs') {
      return (
        <SongsView
          token={token}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlaySong={handlePlaySong}
          onLikeToggle={handleLikeToggle}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
        />
      );
    }

    if (activeTab === 'artists') {
      return (
        <ArtistsView
          token={token}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlaySong={handlePlaySong}
          onLikeToggle={handleLikeToggle}
        />
      );
    }

    if (activeTab === 'liked-songs') {
      return (
        <PlaylistsView
          token={token}
          playlistId="liked"
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlaySong={handlePlaySong}
          onLikeToggle={handleLikeToggle}
          onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />
      );
    }

    if (activeTab === 'search') {
      return (
        <GlobalSearch
          token={token}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlaySong={handlePlaySong}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
        />
      );
    }

    if (activeTab.startsWith('playlist-')) {
      const pId = activeTab.split('-')[1];
      return (
        <PlaylistsView
          key={pId}
          token={token}
          playlistId={pId}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          onPlaySong={handlePlaySong}
          onLikeToggle={handleLikeToggle}
          onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />
      );
    }

    return <div>View not found</div>;
  };

  // If not authenticated, force Auth page
  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container" id="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        playlists={playlists}
        user={user}
        onLogout={handleLogout}
        onCreatePlaylistClick={() => setShowCreatePlaylistModal(true)}
        onImportPlaylistClick={() => setShowImportPlaylistModal(true)}
      />

      {/* Main content body */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Bottom Global Audio Player */}
      <AudioPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrevious={handlePrevTrack}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onLikeToggle={handleLikeToggle}
      />

      {/* Create Playlist Modal overlay */}
      {showCreatePlaylistModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create Playlist</h2>
              <button
                type="button"
                onClick={() => setShowCreatePlaylistModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="playlist-name">Name</label>
                <input
                  id="playlist-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Study Beats"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="playlist-desc">Description</label>
                <textarea
                  id="playlist-desc"
                  className="form-input"
                  style={styles.textArea}
                  placeholder="Describe your playlist vibes..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows="3"
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="btn btn-secondary"
                  disabled={playlistFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-playlist-btn"
                  className="btn btn-primary"
                  disabled={playlistFormLoading}
                >
                  {playlistFormLoading ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Playlist Modal overlay */}
      {showImportPlaylistModal && (
        <ImportPlaylistModal
          token={token}
          onClose={() => setShowImportPlaylistModal(false)}
          onImportSuccess={async (playlistId) => {
            setShowImportPlaylistModal(false);
            await fetchPlaylists();
            setActiveTab(`playlist-${playlistId}`);
          }}
        />
      )}

      {/* Hidden YouTube Iframe Player container */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none' }}>
        <div id="youtube-iframe-player"></div>
      </div>
    </div>
  );
};

const styles = {
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  modalTitle: {
    fontSize: '1.5rem',
    color: '#fff',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  textArea: {
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
};

export default App;
