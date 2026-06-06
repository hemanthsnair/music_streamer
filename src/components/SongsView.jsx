import React, { useState, useEffect } from 'react';
import { Search, Plus, Play, Heart, PlusSquare, Clock, X, Disc } from 'lucide-react';
import { formatTime } from './AudioPlayer';

const SongsView = ({ token, currentSongId, isPlaying, onPlaySong, onLikeToggle, playlists, onAddToPlaylist }) => {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals / Dropdowns State
  const [showAddModal, setShowAddModal] = useState(false);
  const [activePlaylistDropdown, setActivePlaylistDropdown] = useState(null);
  
  // New Song Form State
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [newSong, setNewSong] = useState({
    title: '',
    artistId: '',
    albumId: '',
    duration: '',
    audioUrl: '',
    genre: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchSongs = async (searchTerm = '') => {
    try {
      const url = searchTerm 
        ? `http://localhost:5000/api/songs?search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:5000/api/songs';
      
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      setSongs(data);
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs(search);
  }, [search, token]);

  // Load artists and albums when opening add modal
  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setFormError('');
    try {
      const resArtists = await fetch('http://localhost:5000/api/artists');
      const dataArtists = await resArtists.json();
      setArtists(dataArtists);

      const resAlbums = await fetch('http://localhost:5000/api/albums');
      const dataAlbums = await resAlbums.json();
      setAlbums(dataAlbums);
    } catch (err) {
      console.error('Error loading list of relational entities:', err);
    }
  };

  const handleAddSongSubmit = async (e) => {
    e.preventDefault();
    const { title, artistId, audioUrl } = newSong;

    if (!title || !artistId || !audioUrl) {
      setFormError('Title, Artist, and Audio URL are required');
      return;
    }

    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newSong),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add song');
      }

      // Close modal and reset form
      setShowAddModal(false);
      setNewSong({
        title: '',
        artistId: '',
        albumId: '',
        duration: '',
        audioUrl: '',
        genre: '',
      });

      // Refetch songs
      fetchSongs(search);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleHeartClick = async (e, songId) => {
    e.stopPropagation();
    onLikeToggle(songId);
    // Locally toggle liked state for instant feedback
    setSongs(prevSongs =>
      prevSongs.map(s => (s.id === songId ? { ...s, isLiked: s.isLiked ? 0 : 1 } : s))
    );
  };

  const togglePlaylistDropdown = (e, songId) => {
    e.stopPropagation();
    if (activePlaylistDropdown === songId) {
      setActivePlaylistDropdown(null);
    } else {
      setActivePlaylistDropdown(songId);
    }
  };

  const selectPlaylistToAdd = async (playlistId, songId) => {
    setActivePlaylistDropdown(null);
    onAddToPlaylist(playlistId, songId);
  };

  // Close dropdowns on window click
  useEffect(() => {
    const closeDropdowns = () => setActivePlaylistDropdown(null);
    window.addEventListener('click', closeDropdowns);
    return () => window.removeEventListener('click', closeDropdowns);
  }, []);

  return (
    <div style={styles.container}>
      {/* Top Section */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Music Catalog</h1>
          <p style={styles.subtext}>Browse, search, and manage the system's global music catalog.</p>
        </div>
        <button
          type="button"
          id="add-song-modal-btn"
          onClick={handleOpenAddModal}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add Custom Song
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={styles.searchWrapper}>
        <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
        <input
          id="song-search-input"
          type="text"
          placeholder="Search by song title, artist, or genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Songs Table */}
      <div className="glass-panel" style={styles.tableCard}>
        {loading ? (
          <p style={styles.infoText}>Loading songs database...</p>
        ) : songs.length === 0 ? (
          <p style={styles.infoText}>No songs found matching your criteria.</p>
        ) : (
          <table className="songs-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Genre</th>
                <th style={{ width: '100px' }}><Clock size={16} /></th>
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, index) => {
                const isActive = currentSongId === song.id;
                return (
                  <tr
                    key={song.id}
                    onClick={() => onPlaySong(song, songs)}
                    className={`song-row ${isActive ? 'active' : ''}`}
                    style={styles.tableRow}
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
                    <td>
                      <span style={styles.genreBadge}>{song.genre}</span>
                    </td>
                    <td>{formatTime(song.duration)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={styles.actionsCell}>
                        {/* Like/Heart Button */}
                        <button
                          type="button"
                          id={`song-like-btn-${song.id}`}
                          onClick={(e) => handleHeartClick(e, song.id)}
                          className={`heart-btn ${song.isLiked ? 'liked' : ''}`}
                        >
                          <Heart size={16} fill={song.isLiked ? 'currentColor' : 'none'} />
                        </button>

                        {/* Add to Playlist Dropdown Trigger */}
                        <div style={styles.dropdownWrapper}>
                          <button
                            type="button"
                            id={`song-add-playlist-btn-${song.id}`}
                            onClick={(e) => togglePlaylistDropdown(e, song.id)}
                            style={styles.actionBtn}
                            title="Add to Playlist"
                          >
                            <PlusSquare size={16} />
                          </button>
                          {activePlaylistDropdown === song.id && (
                            <div className="glass-panel" style={styles.dropdownMenu}>
                              <p style={styles.dropdownHeader}>Add to Playlist</p>
                              {playlists.length === 0 ? (
                                <p style={styles.dropdownNoData}>No playlists found</p>
                              ) : (
                                playlists.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    id={`add-to-playlist-${p.id}-song-${song.id}`}
                                    onClick={() => selectPlaylistToAdd(p.id, song.id)}
                                    style={styles.dropdownItem}
                                  >
                                    {p.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Custom Song Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Custom Song</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalError}>{formError}</div>}

            <form onSubmit={handleAddSongSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="song-title">Song Title</label>
                <input
                  id="song-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dreamy Raindrops"
                  value={newSong.title}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="song-artist">Artist</label>
                <select
                  id="song-artist"
                  className="form-input"
                  style={styles.selectInput}
                  value={newSong.artistId}
                  onChange={(e) => setNewSong({ ...newSong, artistId: e.target.value })}
                  required
                >
                  <option value="">-- Select Artist --</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name} ({artist.genre})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="song-album">Album (Optional)</label>
                <select
                  id="song-album"
                  className="form-input"
                  style={styles.selectInput}
                  value={newSong.albumId}
                  onChange={(e) => setNewSong({ ...newSong, albumId: e.target.value })}
                >
                  <option value="">-- No Album (Single) --</option>
                  {albums
                    .filter((a) => !newSong.artistId || a.artistId === parseInt(newSong.artistId, 10))
                    .map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.title} ({album.releaseYear})
                      </option>
                    ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="song-genre">Genre</label>
                  <input
                    id="song-genre"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Lofi Hip Hop"
                    value={newSong.genre}
                    onChange={(e) => setNewSong({ ...newSong, genre: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="song-duration">Duration (seconds)</label>
                  <input
                    id="song-duration"
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 180"
                    value={newSong.duration}
                    onChange={(e) => setNewSong({ ...newSong, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="song-url">Audio File URL</label>
                <input
                  id="song-url"
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/audio.mp3"
                  value={newSong.audioUrl}
                  onChange={(e) => setNewSong({ ...newSong, audioUrl: e.target.value })}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-song-btn"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Adding...' : 'Add Song'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#fff',
  },
  subtext: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '0.8rem 1rem 0.8rem 2.75rem',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  tableCard: {
    padding: '1rem',
    borderRadius: '16px',
    overflowX: 'auto',
  },
  infoText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    textAlign: 'center',
    padding: '3rem 0',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
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
  genreBadge: {
    fontSize: '0.75rem',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '2px 8px',
    borderRadius: '9999px',
    color: 'var(--text-muted)',
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1rem',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  dropdownWrapper: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    width: '180px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 200,
    padding: '0.5rem',
    borderRadius: '12px',
    marginTop: '8px',
    background: '#0d0a21',
  },
  dropdownHeader: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.25rem 0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '0.25rem',
  },
  dropdownItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    padding: '0.5rem',
    borderRadius: '6px',
    textAlign: 'left',
    fontSize: '0.85rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'background 0.2s',
  },
  dropdownNoData: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '0.5rem 0',
  },
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
  modalError: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1.25rem',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  selectInput: {
    background: '#080612',
    color: 'var(--text-main)',
    cursor: 'pointer',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
};

// CSS hover rules are in global stylesheet
styles.dropdownItem[':hover'] = {
  background: 'rgba(255,255,255,0.08)',
};

export default SongsView;
