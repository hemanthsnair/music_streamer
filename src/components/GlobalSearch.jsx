import React, { useState } from 'react';
import { Search, Plus, Music, Play, Pause, Loader2, ListPlus } from 'lucide-react';

const GlobalSearch = ({ token, currentSongId, isPlaying, onPlaySong, playlists, onAddToPlaylist }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [importingId, setImportingId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/import/search-youtube?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert('Error searching YouTube');
    } finally {
      setLoading(false);
    }
  };

  const handleImportToCatalog = async (video) => {
    setImportingId(video.videoId);
    try {
      const response = await fetch('http://localhost:5000/api/import/song', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: video.title,
          artistName: video.artistName,
          externalId: video.videoId,
          duration: video.duration,
          coverUrl: video.coverUrl
        })
      });
      if (!response.ok) throw new Error('Import failed');
      const importedSong = await response.json();
      alert(`"${importedSong.title}" has been successfully added to your catalog!`);
    } catch (err) {
      console.error(err);
      alert('Failed to import song.');
    } finally {
      setImportingId(null);
    }
  };

  const handlePreview = (video) => {
    // Treat preview as playing a temporary song object in the main player!
    const tempSong = {
      id: `temp-${video.videoId}`,
      title: video.title,
      artistName: video.artistName,
      duration: video.duration,
      audioUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      sourceType: 'youtube',
      externalId: video.videoId,
      coverUrl: video.coverUrl,
      isLiked: 0
    };
    onPlaySong(tempSong, [tempSong]);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Global Search</h1>
        <p style={styles.subtitle}>Discover music globally on YouTube and import them directly to your playlists or catalog</p>
      </div>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchWrapper}>
          <Search style={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="Search artists, songs, genres..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn} disabled={loading}>
            {loading ? <Loader2 size={18} className="spin-animation" /> : 'Search'}
          </button>
        </div>
      </form>

      {loading ? (
        <div style={styles.loaderContainer}>
          <Loader2 size={40} className="spin-animation" color="var(--accent)" />
          <span style={styles.loaderText}>Searching YouTube catalog...</span>
        </div>
      ) : results.length > 0 ? (
        <div style={styles.resultsGrid}>
          {results.map((video) => {
            const isCurrentPreview = currentSongId === `temp-${video.videoId}`;
            return (
              <div key={video.videoId} style={styles.card} className="glass-panel result-card-hover">
                <div style={styles.thumbnailContainer}>
                  <img src={video.coverUrl} alt={video.title} style={styles.thumbnail} />
                  <button
                    onClick={() => handlePreview(video)}
                    style={styles.previewBtn}
                    title="Preview Song"
                  >
                    {isCurrentPreview && isPlaying ? (
                      <Pause size={18} fill="currentColor" color="#000" />
                    ) : (
                      <Play size={18} fill="currentColor" color="#000" style={{ marginLeft: '2px' }} />
                    )}
                  </button>
                  <span style={styles.durationTag}>{formatDuration(video.duration)}</span>
                </div>
                <div style={styles.info}>
                  <h3 style={styles.songTitle} title={video.title}>{video.title}</h3>
                  <p style={styles.artistName}>{video.artistName}</p>
                </div>
                <div style={styles.actions}>
                  <button
                    onClick={() => handleImportToCatalog(video)}
                    style={styles.importBtn}
                    disabled={importingId === video.videoId}
                  >
                    {importingId === video.videoId ? (
                      <>
                        <Loader2 size={14} className="spin-animation" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Import Catalog</span>
                      </>
                    )}
                  </button>

                  {playlists.length > 0 && (
                    <div style={styles.playlistDropdownWrapper}>
                      <button
                        style={styles.addToPlaylistIconBtn}
                        title="Add to Playlist"
                        onClick={async () => {
                          // To add to playlist, we first import it to get a valid DB song ID, then add it to the playlist!
                          setImportingId(video.videoId);
                          try {
                            const res = await fetch('http://localhost:5000/api/import/song', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                title: video.title,
                                artistName: video.artistName,
                                externalId: video.videoId,
                                duration: video.duration,
                                coverUrl: video.coverUrl
                              })
                            });
                            if (!res.ok) throw new Error();
                            const song = await res.json();
                            
                            // Show a quick custom selector prompt or just add to the first playlist for convenience, 
                            // but let's prompt the user or show a select dialog:
                            const select = document.createElement('select');
                            select.style.position = 'fixed';
                            select.style.top = '50%';
                            select.style.left = '50%';
                            select.style.transform = 'translate(-50%, -50%)';
                            select.style.zIndex = '9999';
                            select.style.padding = '10px';
                            select.style.background = '#1e1b4b';
                            select.style.color = '#fff';
                            select.style.border = '1px solid #4f46e5';
                            select.style.borderRadius = '8px';
                            
                            const defOption = document.createElement('option');
                            defOption.text = 'Select Playlist...';
                            defOption.value = '';
                            select.appendChild(defOption);

                            playlists.forEach(p => {
                              const opt = document.createElement('option');
                              opt.value = p.id;
                              opt.text = p.name;
                              select.appendChild(opt);
                            });

                            document.body.appendChild(select);
                            select.focus();

                            select.onchange = async () => {
                              const pId = select.value;
                              document.body.removeChild(select);
                              if (pId) {
                                await onAddToPlaylist(pId, song.id);
                              }
                            };
                            select.onblur = () => {
                              if (document.body.contains(select)) {
                                document.body.removeChild(select);
                              }
                            };
                          } catch (err) {
                            alert('Failed to import song for playlist');
                          } finally {
                            setImportingId(null);
                          }
                        }}
                      >
                        <ListPlus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : query && !loading ? (
        <div style={styles.noResults}>
          <Music size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No matching videos found</h3>
          <p>Try searching for a different track title, artist name, or keywords.</p>
        </div>
      ) : (
        <div style={styles.welcomeState}>
          <Music size={64} className="pulse-glowing" color="var(--accent-light)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
          <h2>Discover Endless Tracks</h2>
          <p style={{ maxWidth: '500px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Type a song name, album, or artist to search across YouTube. You can preview tracks, add them to your catalog, or organize them directly into your playlists.
          </p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  searchForm: {
    marginBottom: '2.5rem',
    maxWidth: '700px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '0.25rem 0.5rem',
    transition: 'all 0.3s ease',
  },
  searchIcon: {
    color: 'var(--text-muted)',
    marginLeft: '0.75rem',
    marginRight: '0.5rem',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    padding: '0.75rem 0.5rem',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  searchBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  loaderText: {
    marginTop: '1rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    borderRadius: '12px',
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 ratio
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '0.85rem',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  previewBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(0.9)',
    background: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    opacity: 0,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  durationTag: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    background: 'rgba(0, 0, 0, 0.75)',
    color: '#fff',
    fontSize: '0.7rem',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  info: {
    flex: 1,
    marginBottom: '0.85rem',
  },
  songTitle: {
    fontSize: '0.925rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  artistName: {
    fontSize: '0.775rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  importBtn: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    transition: 'all 0.2s ease',
  },
  addToPlaylistIconBtn: {
    background: 'rgba(139, 92, 246, 0.15)',
    color: 'var(--accent-light)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
    color: 'var(--text-muted)',
  },
  welcomeState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 0',
    color: '#fff',
  },
};

export default GlobalSearch;
