import React, { useState } from 'react';
import { X, Youtube, Music, Loader2, Link } from 'lucide-react';

const ImportPlaylistModal = ({ token, onClose, onImportSuccess }) => {
  const [platform, setPlatform] = useState('youtube'); // 'youtube' or 'spotify'
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    setLoading(true);
    setError(null);

    const endpoint = platform === 'youtube'
      ? 'http://localhost:5000/api/import/youtube-playlist'
      : 'http://localhost:5000/api/import/spotify-playlist';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: playlistUrl,
          playlistName: customName.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import playlist.');
      }

      alert(`Successfully imported playlist "${data.title}" containing ${data.songsCount} songs!`);
      onImportSuccess(data.playlistId);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during playlist import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import Playlist</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Platform Selector */}
          <div style={styles.platformSelector}>
            <button
              type="button"
              onClick={() => { setPlatform('youtube'); setError(null); }}
              style={{
                ...styles.platformBtn,
                ...(platform === 'youtube' ? styles.platformBtnActiveYt : {})
              }}
            >
              <Youtube size={18} color={platform === 'youtube' ? '#ff0000' : 'var(--text-muted)'} />
              <span>YouTube</span>
            </button>
            <button
              type="button"
              onClick={() => { setPlatform('spotify'); setError(null); }}
              style={{
                ...styles.platformBtn,
                ...(platform === 'spotify' ? styles.platformBtnActiveSpot : {})
              }}
            >
              <Music size={18} color={platform === 'spotify' ? '#1db954' : 'var(--text-muted)'} />
              <span>Spotify</span>
            </button>
          </div>

          <div className="form-group" style={styles.formGroup}>
            <label className="form-label" htmlFor="playlist-url">
              {platform === 'youtube' ? 'YouTube Playlist URL or ID' : 'Spotify Playlist URL or ID'}
            </label>
            <div style={styles.inputWrapper}>
              <Link size={16} style={styles.inputIcon} />
              <input
                id="playlist-url"
                type="text"
                className="form-input"
                style={styles.input}
                placeholder={platform === 'youtube'
                  ? 'https://www.youtube.com/playlist?list=...'
                  : 'https://open.spotify.com/playlist/...'
                }
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <p style={styles.helpText}>
              {platform === 'youtube'
                ? 'Make sure the YouTube playlist is set to Public or Unlisted.'
                : 'Scrapes the public track titles and resolves them to YouTube versions.'
              }
            </p>
          </div>

          <div className="form-group" style={styles.formGroup}>
            <label className="form-label" htmlFor="custom-name">Custom Playlist Name (Optional)</label>
            <input
              id="custom-name"
              type="text"
              className="form-input"
              style={styles.input}
              placeholder="Leave empty to use source title"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div style={styles.errorAlert}>{error}</div>}

          {loading && (
            <div style={styles.loadingProgress}>
              <Loader2 size={24} className="spin-animation" color="var(--accent)" />
              <div style={styles.loadingText}>
                {platform === 'spotify'
                  ? 'Fetching tracks and matching with YouTube streamable audio... (This may take a minute)'
                  : 'Importing playlist tracks from YouTube...'
                }
              </div>
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !playlistUrl.trim()}
              style={{
                background: platform === 'youtube' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #10b981, #047857)'
              }}
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  modalContent: {
    maxWidth: '520px',
    width: '90%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  platformSelector: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '10px',
    padding: '4px',
  },
  platformBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  platformBtnActiveYt: {
    background: 'rgba(255, 0, 0, 0.12)',
    color: '#ff4d4d',
    border: '1px solid rgba(255, 0, 0, 0.2)',
  },
  platformBtnActiveSpot: {
    background: 'rgba(29, 185, 84, 0.12)',
    color: '#22c55e',
    border: '1px solid rgba(29, 185, 84, 0.2)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
  },
  input: {
    width: '100%',
    paddingLeft: '38px',
  },
  helpText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.85rem',
  },
  loadingProgress: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
  },
  loadingText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '0.5rem',
  },
};

export default ImportPlaylistModal;
