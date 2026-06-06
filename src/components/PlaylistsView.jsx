import React, { useState, useEffect } from 'react';
import { Play, Trash2, Music, Clock, Heart, Disc, ListMusic } from 'lucide-react';
import { formatTime } from './AudioPlayer';

const PlaylistsView = ({
  token,
  playlistId, // can be a number, or 'liked'
  currentSongId,
  isPlaying,
  onPlaySong,
  onLikeToggle,
  onRemoveSongFromPlaylist,
  onDeletePlaylist,
  onRefreshPlaylists,
}) => {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPlaylistDetails = async () => {
    setLoading(true);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      if (playlistId === 'liked') {
        const response = await fetch('http://localhost:5000/api/songs/liked', { headers });
        const songs = await response.json();
        
        setPlaylist({
          name: 'Liked Songs',
          description: 'Your personal collection of favorite tracks.',
          coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=400&q=80',
          songs: songs,
          isSystem: true,
        });
      } else {
        const response = await fetch(`http://localhost:5000/api/playlists/${playlistId}`, { headers });
        if (!response.ok) throw new Error('Playlist not found');
        const data = await response.json();
        setPlaylist(data);
      }
    } catch (err) {
      console.error('Error fetching playlist details:', err);
      setPlaylist(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistDetails();
    }
  }, [playlistId, token]);

  const handlePlayPlaylist = () => {
    if (playlist && playlist.songs && playlist.songs.length > 0) {
      onPlaySong(playlist.songs[0], playlist.songs);
    }
  };

  const handleRemoveTrack = async (e, songId) => {
    e.stopPropagation();
    if (playlistId === 'liked') {
      // Unliking a song on the liked playlist removes it
      await onLikeToggle(songId);
      fetchPlaylistDetails(); // reload
    } else {
      await onRemoveSongFromPlaylist(playlistId, songId);
      // Update local state to remove the song immediately
      setPlaylist((prev) => ({
        ...prev,
        songs: prev.songs.filter((s) => s.id !== songId),
      }));
    }
  };

  const handleDeleteClick = async () => {
    if (window.confirm(`Are you sure you want to delete the playlist "${playlist.name}"?`)) {
      await onDeletePlaylist(playlistId);
    }
  };

  if (loading) {
    return <p style={styles.infoText}>Loading playlist details...</p>;
  }

  if (!playlist) {
    return <p style={styles.infoText}>Playlist not found or access denied.</p>;
  }

  const totalDuration = playlist.songs
    ? playlist.songs.reduce((acc, song) => acc + song.duration, 0)
    : 0;

  return (
    <div style={styles.container} id="playlist-view-container">
      {/* Banner / Header */}
      <div className="glass-panel" style={styles.banner}>
        <img
          src={playlist.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80'}
          alt={playlist.name}
          style={styles.bannerCover}
        />
        <div style={styles.bannerMeta}>
          <span style={styles.playlistTag}>Playlist</span>
          <h1 style={styles.playlistName}>{playlist.name}</h1>
          <p style={styles.playlistDesc}>{playlist.description}</p>
          <div style={styles.playlistStats}>
            <span>{playlist.songs?.length || 0} tracks</span>
            <span style={styles.bullet}>•</span>
            <span>About {formatTime(totalDuration)} total time</span>
          </div>
        </div>

        {/* Action Row inside Banner */}
        <div style={styles.bannerActions}>
          {playlist.songs && playlist.songs.length > 0 && (
            <button
              type="button"
              id="playlist-play-all-btn"
              onClick={handlePlayPlaylist}
              className="btn btn-primary"
              style={styles.playAllBtn}
            >
              <Play size={18} fill="currentColor" /> Play Playlist
            </button>
          )}
          {!playlist.isSystem && (
            <button
              type="button"
              id="playlist-delete-btn"
              onClick={handleDeleteClick}
              className="btn btn-secondary"
              style={styles.deleteBtn}
              title="Delete Playlist"
            >
              <Trash2 size={16} color="#f87171" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Tracks Table */}
      <div className="glass-panel" style={styles.tracksCard}>
        {playlist.songs?.length === 0 ? (
          <div style={styles.emptyState}>
            <Music size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>This playlist is empty</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Browse the catalog and add songs to custom playlists.
            </p>
          </div>
        ) : (
          <table className="songs-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th style={{ width: '100px' }}><Clock size={16} /></th>
                <th style={{ width: '80px', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {playlist.songs?.map((song, index) => {
                const isActive = currentSongId === song.id;
                return (
                  <tr
                    key={song.id}
                    onClick={() => onPlaySong(song, playlist.songs)}
                    className={`song-row ${isActive ? 'active' : ''}`}
                  >
                    <td>
                      {isActive && isPlaying ? (
                        <div className="playing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      ) : (
                        index + 1
                      )}
                    </td>
                    <td>
                      <div style={styles.songTitleCell}>
                        <img
                          src={song.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=60&q=80'}
                          alt={song.title}
                          style={styles.songCover}
                        />
                        <span>{song.title}</span>
                      </div>
                    </td>
                    <td>{song.artistName}</td>
                    <td>{song.albumTitle || <span style={styles.empty}>Single</span>}</td>
                    <td>{formatTime(song.duration)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={styles.actionsCell}>
                        {/* Remove from Playlist Button */}
                        <button
                          type="button"
                          id={`playlist-remove-song-${song.id}`}
                          onClick={(e) => handleRemoveTrack(e, song.id)}
                          style={styles.removeTrackBtn}
                          title={playlist.isSystem ? 'Unlike Song' : 'Remove from Playlist'}
                        >
                          {playlist.isSystem ? (
                            <Heart size={16} fill="currentColor" color="#ec4899" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  banner: {
    display: 'flex',
    gap: '2rem',
    padding: '2.5rem',
    borderRadius: '24px',
    position: 'relative',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bannerCover: {
    width: '180px',
    height: '180px',
    borderRadius: '16px',
    objectFit: 'cover',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  bannerMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  playlistTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  playlistName: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#fff',
    lineHeight: '1.1',
    marginBottom: '0.75rem',
  },
  playlistDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    lineHeight: '1.4',
  },
  playlistStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.825rem',
    color: 'var(--text-muted)',
  },
  bullet: {
    color: 'rgba(255,255,255,0.2)',
  },
  bannerActions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  playAllBtn: {
    padding: '0.75rem 1.5rem',
  },
  deleteBtn: {
    padding: '0.75rem 1.2rem',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.05)',
  },
  tracksCard: {
    padding: '1rem',
    borderRadius: '16px',
  },
  infoText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    textAlign: 'center',
    padding: '3rem 0',
  },
  songTitleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  songCover: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  removeTrackBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1rem',
    textAlign: 'center',
  },
};

// CSS Hover rules
styles.removeTrackBtn[':hover'] = {
  color: '#f87171',
};

export default PlaylistsView;
