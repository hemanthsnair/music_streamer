import React from 'react';
import { LayoutDashboard, Music, Users, ListMusic, LogOut, Plus, Disc } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, playlists, user, onLogout, onCreatePlaylistClick }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'songs', label: 'Songs', icon: Music },
    { id: 'artists', label: 'Artists', icon: Users },
  ];

  return (
    <div style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <Disc size={28} className="pulse-glowing" color="#a78bfa" style={styles.brandIcon} />
        <h2 style={styles.brandText}>MelodyStream</h2>
      </div>

      {/* Main Menu */}
      <nav style={styles.navSection}>
        <p style={styles.sectionHeader}>Menu</p>
        <ul style={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} style={styles.menuItem}>
                <button
                  type="button"
                  id={`nav-link-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    ...styles.navButton,
                    ...(isActive ? styles.navButtonActive : {}),
                  }}
                >
                  <Icon size={20} color={isActive ? '#a78bfa' : '#9ca3af'} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Playlists Menu */}
      <div style={styles.playlistSection}>
        <div style={styles.playlistHeader}>
          <p style={styles.sectionHeader}>Playlists</p>
          <button
            type="button"
            id="sidebar-create-playlist-btn"
            onClick={onCreatePlaylistClick}
            style={styles.addPlaylistBtn}
            title="Create Playlist"
          >
            <Plus size={16} />
          </button>
        </div>
        <div style={styles.playlistScroll}>
          {playlists.length === 0 ? (
            <p style={styles.noPlaylists}>No playlists created yet</p>
          ) : (
            <ul style={styles.menuList}>
              {playlists.map((playlist) => {
                const isActive = activeTab === `playlist-${playlist.id}`;
                return (
                  <li key={playlist.id} style={styles.menuItem}>
                    <button
                      type="button"
                      id={`nav-link-playlist-${playlist.id}`}
                      onClick={() => setActiveTab(`playlist-${playlist.id}`)}
                      style={{
                        ...styles.navButton,
                        ...(isActive ? styles.navButtonActive : {}),
                      }}
                    >
                      <ListMusic size={18} color={isActive ? '#a78bfa' : '#9ca3af'} />
                      <span style={styles.playlistName}>{playlist.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* User & Logout section */}
      <div style={styles.userFooter}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
          <div style={styles.userMeta}>
            <span style={styles.userName}>{user?.username}</span>
            <span style={styles.userStatus}>Free Account</span>
          </div>
        </div>
        <button
          type="button"
          id="logout-button"
          onClick={onLogout}
          style={styles.logoutBtn}
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    height: 'calc(100vh - 90px)',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.5rem 1.5rem 0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '1.5rem',
  },
  brandIcon: {
    animation: 'spin 10s linear infinite',
  },
  brandText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  navSection: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    paddingLeft: '0.75rem',
    marginBottom: '0.75rem',
  },
  menuList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  menuItem: {
    width: '100%',
  },
  navButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.925rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  navButtonActive: {
    background: 'rgba(139, 92, 246, 0.12)',
    color: '#fff',
  },
  playlistSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  playlistHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  addPlaylistBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  playlistScroll: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
  },
  noPlaylists: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    paddingLeft: '0.75rem',
    marginTop: '0.5rem',
  },
  playlistName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '160px',
  },
  userFooter: {
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    overflow: 'hidden',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-pink))',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '700',
    flexShrink: 0,
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userStatus: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

export default Sidebar;
