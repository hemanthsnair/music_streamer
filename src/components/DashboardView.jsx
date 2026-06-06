import React, { useState, useEffect } from 'react';
import { Play, Flame, Library, Music, Users, ListPlus, Heart } from 'lucide-react';

const DashboardView = ({ username, token, onPlaySong, onNavigate, likedSongsCount, playlistsCount }) => {
  const [stats, setStats] = useState({ songs: 0, artists: 0 });
  const [popularSongs, setPopularSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch all songs to extract stats and sorting
        const responseSongs = await fetch('http://localhost:5000/api/songs', { headers });
        const songs = await responseSongs.json();

        const responseArtists = await fetch('http://localhost:5000/api/artists');
        const artists = await responseArtists.json();

        setStats({
          songs: songs.length,
          artists: artists.length
        });

        // Sort by play count for popular section
        const sorted = [...songs].sort((a, b) => b.playCount - a.playCount).slice(0, 4);
        setPopularSongs(sorted);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, likedSongsCount, playlistsCount]);

  return (
    <div style={styles.container}>
      {/* Top Greeting */}
      <div style={styles.header}>
        <h1 style={styles.welcomeText}>Welcome back, <span style={styles.username}>{username}</span>!</h1>
        <p style={styles.subtext}>Ready for some chill lofi beats to fuel your focus today?</p>
      </div>

      {/* Grid Stats */}
      <div style={styles.statsGrid}>
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(139, 92, 246, 0.15)' }}>
            <Music size={24} color="var(--accent-light)" />
          </div>
          <div>
            <h3 style={styles.statVal}>{stats.songs}</h3>
            <p style={styles.statLabel}>Available Songs</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(217, 70, 239, 0.15)' }}>
            <Users size={24} color="var(--accent-pink)" />
          </div>
          <div>
            <h3 style={styles.statVal}>{stats.artists}</h3>
            <p style={styles.statLabel}>Total Artists</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(16, 185, 129, 0.15)' }}>
            <Library size={24} color="var(--accent-green)" />
          </div>
          <div>
            <h3 style={styles.statVal}>{playlistsCount}</h3>
            <p style={styles.statLabel}>Your Playlists</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconBg, background: 'rgba(236, 72, 153, 0.15)' }}>
            <Heart size={24} color="#ec4899" />
          </div>
          <div>
            <h3 style={styles.statVal}>{likedSongsCount}</h3>
            <p style={styles.statLabel}>Liked Songs</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={styles.columns}>
        {/* Left: Popular Songs */}
        <div className="glass-panel" style={styles.mainColumn}>
          <div style={styles.sectionTitleRow}>
            <Flame size={20} color="var(--accent-pink)" />
            <h2 style={styles.sectionTitle}>Trending Tracks</h2>
          </div>

          {loading ? (
            <p style={styles.loadingText}>Loading trending catalog...</p>
          ) : popularSongs.length === 0 ? (
            <p style={styles.noData}>No music found in catalog.</p>
          ) : (
            <div style={styles.songList}>
              {popularSongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => onPlaySong(song, popularSongs)}
                  style={styles.songItem}
                  className="song-row"
                >
                  <img
                    src={song.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&q=80'}
                    alt={song.title}
                    style={styles.songCover}
                  />
                  <div style={styles.songMeta}>
                    <span style={styles.songTitle}>{song.title}</span>
                    <span style={styles.songArtist}>{song.artistName}</span>
                  </div>
                  <span style={styles.playCount}>{song.playCount} plays</span>
                  <button type="button" className="btn btn-secondary" style={styles.playItemBtn}>
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Actions */}
        <div style={styles.sideColumn}>
          <div className="glass-panel" style={styles.actionCard}>
            <h2 style={styles.actionTitle}>Library Actions</h2>
            <p style={styles.actionDesc}>Manage your collection and contribute new songs or artists to MelodyStream.</p>
            <div style={styles.actionButtons}>
              <button
                type="button"
                id="dash-nav-songs"
                onClick={() => onNavigate('songs')}
                className="btn btn-primary"
                style={styles.actionBtn}
              >
                Browse Songs Catalog
              </button>
              <button
                type="button"
                id="dash-nav-artists"
                onClick={() => onNavigate('artists')}
                className="btn btn-secondary"
                style={styles.actionBtn}
              >
                Browse Artists
              </button>
            </div>
          </div>

          <div
            className="glass-panel pulse-glowing"
            onClick={() => onNavigate('liked-songs')}
            style={styles.likedBanner}
          >
            <div style={styles.bannerContent}>
              <Heart size={32} fill="currentColor" color="#ec4899" />
              <div style={styles.bannerText}>
                <h3 style={styles.bannerTitle}>Your Favorites</h3>
                <p style={styles.bannerDesc}>Listen to all the tracks you have liked in one place.</p>
              </div>
            </div>
          </div>
        </div>
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
  header: {
    marginBottom: '0.5rem',
  },
  welcomeText: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '0.5rem',
  },
  username: {
    background: 'linear-gradient(135deg, var(--accent-light), var(--accent-pink))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtext: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1.5rem',
    borderRadius: '16px',
  },
  iconBg: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#fff',
    lineHeight: '1.2',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  columns: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  mainColumn: {
    flex: 2,
    minWidth: '350px',
    padding: '2rem',
    borderRadius: '20px',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: '#fff',
  },
  sideColumn: {
    flex: 1,
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  actionCard: {
    padding: '2rem',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  actionTitle: {
    fontSize: '1.25rem',
    color: '#fff',
  },
  actionDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  actionBtn: {
    width: '100%',
    padding: '0.75rem',
  },
  likedBanner: {
    padding: '1.5rem',
    borderRadius: '20px',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.05))',
    border: '1px solid rgba(236, 72, 153, 0.2)',
    transition: 'all 0.3s ease',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  bannerText: {
    display: 'flex',
    flexDirection: 'column',
  },
  bannerTitle: {
    fontSize: '1.1rem',
    color: '#fff',
    fontWeight: '600',
  },
  bannerDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  songItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.02)',
  },
  songCover: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    marginRight: '1rem',
  },
  songMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  songTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  songArtist: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  playCount: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginRight: '1.5rem',
  },
  playItemBtn: {
    padding: '8px',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '2rem 0',
  },
  noData: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '2rem 0',
  },
};

export default DashboardView;
