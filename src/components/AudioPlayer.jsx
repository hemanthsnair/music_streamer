import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Music } from 'lucide-react';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const AudioPlayer = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onLikeToggle,
}) => {
  if (!currentSong) {
    return (
      <div style={styles.container}>
        <div style={styles.noTrack}>
          <Music size={20} color="var(--text-muted)" />
          <span>No song selected. Select a song to start listening.</span>
        </div>
      </div>
    );
  }

  const handleProgressChange = (e) => {
    onSeek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const isMuted = volume === 0;

  const toggleMute = () => {
    onVolumeChange(isMuted ? 0.5 : 0);
  };

  return (
    <div style={styles.container} id="global-audio-player">
      {/* Left: Song Details */}
      <div style={styles.songDetails}>
        <img
          src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&q=80'}
          alt={currentSong.title}
          style={{
            ...styles.coverArt,
            animation: isPlaying ? 'spin 20s linear infinite' : 'none',
          }}
        />
        <div style={styles.meta}>
          <span style={styles.title} id="player-song-title">{currentSong.title}</span>
          <span style={styles.artist}>{currentSong.artistName}</span>
        </div>
        <button
          type="button"
          id={`player-like-btn-${currentSong.id}`}
          onClick={() => onLikeToggle(currentSong.id)}
          className={`heart-btn ${currentSong.isLiked ? 'liked' : ''}`}
          style={styles.heartBtn}
        >
          <Heart size={20} fill={currentSong.isLiked ? 'currentColor' : 'none'} />
        </button>

        {isPlaying && (
          <div className="playing-indicator" style={styles.visualizer}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Center: Controls & Slider */}
      <div style={styles.controlsSection}>
        <div style={styles.buttons}>
          <button type="button" id="player-prev-btn" onClick={onPrevious} style={styles.controlBtn} title="Previous">
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button
            type="button"
            id="player-play-pause-btn"
            onClick={onPlayPause}
            style={styles.playBtn}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" color="#080612" />
            ) : (
              <Play size={20} fill="currentColor" color="#080612" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button type="button" id="player-next-btn" onClick={onNext} style={styles.controlBtn} title="Next">
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>

        <div style={styles.progressBarWrapper}>
          <span style={styles.timeLabel}>{formatTime(currentTime)}</span>
          <input
            id="player-seekbar"
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            style={styles.progressBar}
          />
          <span style={styles.timeLabel}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume Controls */}
      <div style={styles.volumeSection}>
        <button type="button" id="player-mute-btn" onClick={toggleMute} style={styles.volumeBtn}>
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          id="player-volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          style={styles.volumeBar}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90px',
    background: 'var(--bg-player)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    zIndex: 100,
    boxShadow: '0 -8px 32px 0 rgba(0, 0, 0, 0.4)',
  },
  noTrack: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  songDetails: {
    display: 'flex',
    alignItems: 'center',
    width: '30%',
    minWidth: '200px',
  },
  coverArt: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    objectFit: 'cover',
    marginRight: '1rem',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    marginRight: '1rem',
  },
  title: {
    fontSize: '0.925rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '2px',
  },
  artist: {
    fontSize: '0.775rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  heartBtn: {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    marginLeft: '0.25rem',
  },
  visualizer: {
    marginLeft: '1.25rem',
    flexShrink: 0,
  },
  controlsSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '40%',
    gap: '0.5rem',
  },
  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  controlBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    transition: 'color 0.2s, transform 0.2s',
  },
  playBtn: {
    background: '#fff',
    border: 'none',
    color: '#080612',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 10px rgba(255, 255, 255, 0.2)',
  },
  progressBarWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '0.75rem',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    cursor: 'pointer',
    accentColor: 'var(--accent-light)',
  },
  timeLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    minWidth: '32px',
    textAlign: 'center',
  },
  volumeSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '30%',
    minWidth: '150px',
    gap: '0.5rem',
  },
  volumeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  volumeBar: {
    width: '100px',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    cursor: 'pointer',
    accentColor: 'var(--accent-light)',
  },
};

export default AudioPlayer;
export { formatTime };
