import React, { useState, useEffect } from 'react';
import { Plus, X, Heart, Play, Clock, User } from 'lucide-react';
import { formatTime } from './AudioPlayer';

const ArtistsView = ({ token, currentSongId, isPlaying, onPlaySong, onLikeToggle }) => {
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistDetails, setArtistDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newArtist, setNewArtist] = useState({
    name: '',
    genre: '',
    bio: '',
    imageUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchArtists = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/artists');
      const data = await response.json();
      setArtists(data);
    } catch (err) {
      console.error('Error fetching artists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistDetails = async (id) => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`http://localhost:5000/api/artists/${id}`, { headers });
      const data = await response.json();
      setArtistDetails(data);
    } catch (err) {
      console.error('Error fetching artist details:', err);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const handleArtistClick = (artist) => {
    setSelectedArtist(artist);
    setArtistDetails(null); // Reset detail loading state
    fetchArtistDetails(artist.id);
  };

  const handleAddArtistSubmit = async (e) => {
    e.preventDefault();
    if (!newArtist.name) {
      setFormError('Artist name is required');
      return;
    }

    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newArtist),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add artist');
      }

      setShowAddModal(false);
      setNewArtist({ name: '', genre: '', bio: '', imageUrl: '' });
      fetchArtists();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleHeartClick = async (e, songId) => {
    e.stopPropagation();
    onLikeToggle(songId);
    
    // Optimistic state toggle for local display in detail sheet
    if (artistDetails && artistDetails.songs) {
      const updatedSongs = artistDetails.songs.map(s => 
        s.id === songId ? { ...s, isLiked: s.isLiked ? 0 : 1 } : s
      );
      setArtistDetails({ ...artistDetails, songs: updatedSongs });
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Artists</h1>
          <p style={styles.subtext}>Explore creators, bios, and albums in the catalog.</p>
        </div>
        <button
          type="button"
          id="add-artist-modal-btn"
          onClick={() => {
            setShowAddModal(true);
            setFormError('');
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add Artist
        </button>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <p style={styles.infoText}>Loading artists...</p>
      ) : artists.length === 0 ? (
        <p style={styles.infoText}>No artists in the system yet.</p>
      ) : (
        <div style={styles.grid}>
          {artists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => handleArtistClick(artist)}
              className="glass-panel"
              style={styles.card}
              id={`artist-card-${artist.id}`}
            >
              <div style={styles.avatarWrapper}>
                <img
                  src={artist.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80'}
                  alt={artist.name}
                  style={styles.avatar}
                />
              </div>
              <h3 style={styles.artistName}>{artist.name}</h3>
              <span style={styles.genreBadge}>{artist.genre}</span>
              <p style={styles.songCount}>{artist.songCount} {artist.songCount === 1 ? 'song' : 'songs'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Artist Details Sheet Drawer (Side Drawer / overlay style) */}
      {selectedArtist && (
        <div className="modal-overlay" onClick={() => setSelectedArtist(null)}>
          <div
            className="glass-panel"
            style={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            id="artist-detail-sheet"
          >
            <button
              type="button"
              onClick={() => setSelectedArtist(null)}
              style={styles.closeDrawerBtn}
            >
              <X size={20} />
            </button>

            {/* Profile Cover Header */}
            <div style={styles.drawerCoverWrapper}>
              <img
                src={selectedArtist.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}
                alt={selectedArtist.name}
                style={styles.drawerCoverImg}
              />
              <div style={styles.drawerHeaderOverlay}>
                <span style={styles.drawerTag}>{selectedArtist.genre}</span>
                <h2 style={styles.drawerTitle}>{selectedArtist.name}</h2>
              </div>
            </div>

            {/* Content Container */}
            <div style={styles.drawerContent}>
              <div style={styles.drawerSection}>
                <h4 style={styles.sectionHeading}>Biography</h4>
                <p style={styles.bioText}>{selectedArtist.bio || 'No biography available.'}</p>
              </div>

              {/* Artist Songs */}
              <div style={styles.drawerSection}>
                <h4 style={styles.sectionHeading}>Tracks</h4>
                {!artistDetails ? (
                  <p style={styles.drawerInfoText}>Loading artist catalog...</p>
                ) : artistDetails.songs.length === 0 ? (
                  <p style={styles.drawerInfoText}>No tracks registered under this artist.</p>
                ) : (
                  <div style={styles.songList}>
                    {artistDetails.songs.map((song, i) => {
                      const isActive = currentSongId === song.id;
                      return (
                        <div
                          key={song.id}
                          onClick={() => onPlaySong(song, artistDetails.songs)}
                          style={styles.songItem}
                          className={`song-row ${isActive ? 'active' : ''}`}
                        >
                          <span style={styles.songNumber}>
                            {isActive && isPlaying ? (
                              <div className="playing-indicator" style={{ width: '12px', height: '12px' }}>
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                            ) : (
                              i + 1
                            )}
                          </span>
                          <div style={styles.songMeta}>
                            <span style={styles.songTitle}>{song.title}</span>
                            <span style={styles.songAlbum}>
                              {song.albumTitle ? `Album: ${song.albumTitle}` : 'Single'}
                            </span>
                          </div>
                          <span style={styles.songTime}>{formatTime(song.duration)}</span>
                          <button
                            type="button"
                            id={`artist-song-like-btn-${song.id}`}
                            onClick={(e) => handleHeartClick(e, song.id)}
                            className={`heart-btn ${song.isLiked ? 'liked' : ''}`}
                            style={styles.drawerHeart}
                          >
                            <Heart size={14} fill={song.isLiked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Artist Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Artist</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalError}>{formError}</div>}

            <form onSubmit={handleAddArtistSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="artist-input-name">Artist Name</label>
                <input
                  id="artist-input-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lofi Study beats"
                  value={newArtist.name}
                  onChange={(e) => setNewArtist({ ...newArtist, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="artist-input-genre">Primary Genre</label>
                <input
                  id="artist-input-genre"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lofi Hip Hop / Synthwave"
                  value={newArtist.genre}
                  onChange={(e) => setNewArtist({ ...newArtist, genre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="artist-input-bio">Biography</label>
                <textarea
                  id="artist-input-bio"
                  className="form-input"
                  style={styles.textArea}
                  placeholder="Write a brief bio about the artist..."
                  value={newArtist.bio}
                  onChange={(e) => setNewArtist({ ...newArtist, bio: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="artist-input-image">Image URL</label>
                <input
                  id="artist-input-image"
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/artist.jpg"
                  value={newArtist.imageUrl}
                  onChange={(e) => setNewArtist({ ...newArtist, imageUrl: e.target.value })}
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
                  id="submit-artist-btn"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Adding...' : 'Add Artist'}
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
  infoText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    textAlign: 'center',
    padding: '3rem 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.5rem',
    borderRadius: '16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  avatarWrapper: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    overflow: 'hidden',
    marginBottom: '1rem',
    border: '2px solid rgba(255,255,255,0.08)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  artistName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '0.25rem',
  },
  genreBadge: {
    fontSize: '0.7rem',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    padding: '2px 8px',
    borderRadius: '9999px',
    color: 'var(--accent-light)',
    marginBottom: '0.5rem',
  },
  songCount: {
    fontSize: '0.775rem',
    color: 'var(--text-muted)',
  },
  // Drawer Sheet
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: '460px',
    height: '100%',
    zIndex: 1050,
    borderLeft: '1px solid var(--glass-border-hover)',
    borderRadius: '0',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    background: '#0a081a',
    animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  closeDrawerBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'rgba(0, 0, 0, 0.4)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    transition: 'background 0.2s',
  },
  drawerCoverWrapper: {
    position: 'relative',
    height: '240px',
    width: '100%',
  },
  drawerCoverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  drawerHeaderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    background: 'linear-gradient(to top, #0a081a 10%, rgba(10,8,26,0.3) 60%, rgba(0,0,0,0.4))',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '1.5rem',
  },
  drawerTag: {
    fontSize: '0.75rem',
    color: 'var(--accent-light)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.25rem',
  },
  drawerTitle: {
    fontSize: '1.75rem',
    color: '#fff',
    fontWeight: '800',
  },
  drawerContent: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  drawerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionHeading: {
    fontSize: '0.9rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '0.25rem',
  },
  bioText: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  drawerInfoText: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '1rem 0',
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  songItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  songNumber: {
    width: '24px',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
  },
  songMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  songTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#fff',
  },
  songAlbum: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '1px',
  },
  songTime: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginRight: '0.75rem',
  },
  drawerHeart: {
    background: 'none',
    border: 'none',
  },
  // Modal
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

export default ArtistsView;
