import React, { useState, useEffect, useRef } from 'react';
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
  const [uploadQueue, setUploadQueue] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Global settings helper state
  const [globalArtistId, setGlobalArtistId] = useState('');
  const [globalAlbumId, setGlobalAlbumId] = useState('');
  const [globalGenre, setGlobalGenre] = useState('');

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

  // Load artists and albums
  const loadMetadataOptions = async () => {
    try {
      const resArtists = await fetch('http://localhost:5000/api/artists');
      const dataArtists = await resArtists.json();
      setArtists(dataArtists);

      const resAlbums = await fetch('http://localhost:5000/api/albums');
      const dataAlbums = await resAlbums.json();
      setAlbums(dataAlbums);
    } catch (err) {
      console.error('Error loading artists and albums:', err);
    }
  };

  const handleOpenAddModal = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let selectedFiles = files;
    if (files.length > 10) {
      alert('Maximum of 10 songs can be uploaded at a time. Only the first 10 files have been selected.');
      selectedFiles = files.slice(0, 10);
    }

    // Reset file input so same file selection triggers change again
    e.target.value = '';

    setFormError('');
    setGlobalArtistId('');
    setGlobalAlbumId('');
    setGlobalGenre('');
    await loadMetadataOptions();

    const newItems = selectedFiles.map(file => {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const formattedTitle = baseName.replace(/[_-]+/g, ' ').trim();
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        title: formattedTitle,
        artistId: '',
        albumId: '',
        genre: 'Unknown',
        duration: 0,
        uploadStatus: 'pending', // 'pending', 'uploading', 'success', 'error'
        error: null
      };
    });

    setUploadQueue(newItems);
    setShowAddModal(true);

    // Estimate durations in client
    newItems.forEach(item => {
      try {
        const objectUrl = URL.createObjectURL(item.file);
        const audio = new Audio(objectUrl);
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration || 0);
          setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, duration } : p));
          URL.revokeObjectURL(objectUrl);
        });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(objectUrl);
        });
      } catch (err) {
        console.warn('Could not read duration for file:', item.file.name, err);
      }
    });
  };

  const handleRemoveFromQueue = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQueueItem = (id, fields) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...fields } : item));
  };

  const applyGlobalArtist = (artistId) => {
    setGlobalArtistId(artistId);
    setGlobalAlbumId(''); // Clear global album since artist changed
    setUploadQueue(prev => prev.map(item => ({ ...item, artistId, albumId: '' })));
  };

  const applyGlobalAlbum = (albumId) => {
    setGlobalAlbumId(albumId);
    setUploadQueue(prev => prev.map(item => ({ ...item, albumId })));
  };

  const applyGlobalGenre = (genre) => {
    setGlobalGenre(genre);
    setUploadQueue(prev => prev.map(item => ({ ...item, genre })));
  };

  const handleAddSongSubmit = async (e) => {
    e.preventDefault();
    if (uploadQueue.length === 0) {
      setFormError('Please select at least one song to upload.');
      return;
    }

    // Verify all have title and artist
    const invalidItem = uploadQueue.find(item => !item.title.trim() || !item.artistId);
    if (invalidItem) {
      setFormError(`Please ensure all songs have a Title and Artist. Check song: "${invalidItem.file.name}"`);
      return;
    }

    setFormError('');
    setFormLoading(true);

    // Process uploads sequentially to allow UI to show status of each file
    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      if (item.uploadStatus === 'success') continue;

      setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, uploadStatus: 'uploading' } : p));

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('title', item.title);
        formData.append('artistId', item.artistId);
        formData.append('albumId', item.albumId || '');
        formData.append('duration', item.duration || 180);
        formData.append('genre', item.genre || 'Unknown');

        const response = await fetch('http://localhost:5000/api/songs/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload song');
        }

        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, uploadStatus: 'success' } : p));
      } catch (err) {
        console.error('Error uploading item:', item.title, err);
        setUploadQueue(prev => prev.map(p => p.id === item.id ? { ...p, uploadStatus: 'error', error: err.message } : p));
      }
    }

    // Check if there are any remaining errors
    setUploadQueue(currentQueue => {
      const errors = currentQueue.filter(item => item.uploadStatus === 'error');
      if (errors.length === 0) {
        // If all uploaded successfully, close modal
        setShowAddModal(false);
      } else {
        setFormError(`${errors.length} song(s) failed to upload. Please review details and try again.`);
      }
      return currentQueue;
    });

    fetchSongs(search);
    setFormLoading(false);
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
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Upload Songs ({uploadQueue.length})</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.closeModalBtn}
                disabled={formLoading}
              >
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalError}>{formError}</div>}

            {/* Global Settings Panel */}
            <div style={styles.globalSettingsPanel}>
              <span style={styles.globalLabel}>Apply to All:</span>
              <div style={styles.globalInputsRow}>
                <select
                  className="form-input"
                  style={styles.selectInputTiny}
                  value={globalArtistId}
                  onChange={(e) => applyGlobalArtist(e.target.value)}
                  disabled={formLoading}
                >
                  <option value="">-- Artist --</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>

                <select
                  className="form-input"
                  style={styles.selectInputTiny}
                  value={globalAlbumId}
                  onChange={(e) => applyGlobalAlbum(e.target.value)}
                  disabled={formLoading || !globalArtistId}
                >
                  <option value="">-- Album --</option>
                  {albums
                    .filter((a) => !globalArtistId || a.artistId === parseInt(globalArtistId, 10))
                    .map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.title}
                      </option>
                    ))}
                </select>

                <input
                  type="text"
                  className="form-input"
                  style={styles.inputTiny}
                  placeholder="Genre (e.g. Pop)"
                  value={globalGenre}
                  onChange={(e) => applyGlobalGenre(e.target.value)}
                  disabled={formLoading}
                />
              </div>
            </div>

            {/* Scrollable File List */}
            <form onSubmit={handleAddSongSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={styles.queueContainer}>
                {uploadQueue.map((item) => (
                  <div key={item.id} style={styles.queueItemCard}>
                    <div style={styles.queueItemHeader}>
                      <span style={styles.filenameLabel} title={item.file.name}>{item.file.name}</span>
                      <span style={styles.durationBadge}>
                        {item.duration > 0 ? formatTime(item.duration) : 'Loading...'}
                      </span>
                      
                      {item.uploadStatus === 'uploading' && <span style={styles.statusUploading}>Uploading...</span>}
                      {item.uploadStatus === 'success' && <span style={styles.statusSuccess}>✓ Success</span>}
                      {item.uploadStatus === 'error' && <span style={styles.statusError} title={item.error}>✗ Failed</span>}
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        style={styles.removeBtn}
                        disabled={formLoading || item.uploadStatus === 'uploading' || item.uploadStatus === 'success'}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={styles.queueItemFields}>
                      <div style={{ flex: 2, minWidth: '150px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Song Title"
                          value={item.title}
                          onChange={(e) => handleUpdateQueueItem(item.id, { title: e.target.value })}
                          required
                          disabled={formLoading || item.uploadStatus === 'success'}
                        />
                      </div>

                      <div style={{ flex: 1.5, minWidth: '130px' }}>
                        <select
                          className="form-input"
                          style={styles.selectInput}
                          value={item.artistId}
                          onChange={(e) => handleUpdateQueueItem(item.id, { artistId: e.target.value, albumId: '' })}
                          required
                          disabled={formLoading || item.uploadStatus === 'success'}
                        >
                          <option value="">-- Artist --</option>
                          {artists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                              {artist.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1.5, minWidth: '130px' }}>
                        <select
                          className="form-input"
                          style={styles.selectInput}
                          value={item.albumId}
                          onChange={(e) => handleUpdateQueueItem(item.id, { albumId: e.target.value })}
                          disabled={formLoading || item.uploadStatus === 'success'}
                        >
                          <option value="">-- Album --</option>
                          {albums
                            .filter((a) => !item.artistId || a.artistId === parseInt(item.artistId, 10))
                            .map((album) => (
                              <option key={album.id} value={album.id}>
                                {album.title}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div style={{ flex: 1.2, minWidth: '100px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Genre"
                          value={item.genre}
                          onChange={(e) => handleUpdateQueueItem(item.id, { genre: e.target.value })}
                          disabled={formLoading || item.uploadStatus === 'success'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                  disabled={formLoading || uploadQueue.length === 0}
                >
                  {formLoading ? 'Uploading & Saving...' : 'Upload & Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden input for selecting audio files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="audio/*"
        style={{ display: 'none' }}
      />
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
  globalSettingsPanel: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  globalLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  globalInputsRow: {
    display: 'flex',
    gap: '0.75rem',
    flex: 1,
    flexWrap: 'wrap',
  },
  selectInputTiny: {
    flex: 1,
    minWidth: '110px',
    fontSize: '0.8rem',
    padding: '0.4rem 0.6rem',
    background: '#080612',
    color: 'var(--text-main)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
  },
  inputTiny: {
    flex: 1,
    minWidth: '110px',
    fontSize: '0.8rem',
    padding: '0.4rem 0.6rem',
    background: 'transparent',
    color: 'var(--text-main)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
  },
  queueContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
    marginBottom: '1rem',
  },
  queueItemCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  queueItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  filenameLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  durationBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  statusUploading: {
    fontSize: '0.75rem',
    color: 'var(--accent-light)',
    fontWeight: '600',
  },
  statusSuccess: {
    fontSize: '0.75rem',
    color: '#10b981',
    fontWeight: '600',
  },
  statusError: {
    fontSize: '0.75rem',
    color: '#ef4444',
    fontWeight: '600',
    cursor: 'help',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueItemFields: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
};

// CSS hover rules are in global stylesheet
styles.dropdownItem[':hover'] = {
  background: 'rgba(255,255,255,0.08)',
};

export default SongsView;
