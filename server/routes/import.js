import express from 'express';
import ytSearch from 'yt-search';
import { YouTube } from 'youtube-sr';
import { run, get, all } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/import/search-youtube?q=...
router.get('/search-youtube', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }

  try {
    const r = await ytSearch(q);
    const videos = (r.videos || []).slice(0, 15).map(v => ({
      videoId: v.videoId,
      title: v.title,
      duration: v.seconds,
      coverUrl: v.thumbnail || v.image,
      artistName: v.author?.name || 'Unknown Artist'
    }));
    res.json(videos);
  } catch (error) {
    console.error('Error searching YouTube:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// Helper to find or create artist dynamically
async function findOrCreateArtist(artistName) {
  const normalized = (artistName || 'Unknown Artist').trim();
  let artist = await get('SELECT id FROM artists WHERE name = ?', [normalized]);
  if (!artist) {
    const result = await run(
      'INSERT INTO artists (name, genre, bio, imageUrl) VALUES (?, ?, ?, ?)',
      [normalized, 'Unknown', '', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80']
    );
    return result.id;
  }
  return artist.id;
}

// Helper to find or create song dynamically
async function findOrCreateSong({ title, artistId, duration, externalId, coverUrl }) {
  let song = await get('SELECT * FROM songs WHERE externalId = ? AND sourceType = "youtube"', [externalId]);
  if (!song) {
    const finalDuration = duration ? parseInt(duration, 10) : 180;
    const audioUrl = `https://www.youtube.com/watch?v=${externalId}`;
    const result = await run(
      'INSERT INTO songs (title, artistId, duration, audioUrl, genre, sourceType, externalId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, artistId, finalDuration, audioUrl, 'Unknown', 'youtube', externalId]
    );
    
    // Check if we also need to store/link coverUrl as an album cover if needed. 
    // Since songs has an albumId, and the original frontend loads coverUrl from albums table, 
    // we should create a dummy album or store the coverUrl on the song somehow?
    // Wait, the query in songs.js is:
    // SELECT s.*, a.name as artistName, al.title as albumTitle, al.coverUrl as coverUrl
    // FROM songs s JOIN artists a ON s.artistId = a.id LEFT JOIN albums al ON s.albumId = al.id
    // If the song doesn't have an albumId, coverUrl is NULL.
    // Let's create a dummy album for the cover art if coverUrl is present!
    // Or we can modify schema? Since we already ran migration and shouldn't change the database schema again unnecessarily,
    // creating a dummy album with the coverUrl is a fantastic, standard way to leverage existing code!
    let albumId = null;
    if (coverUrl) {
      // Find or create a dummy album for this artist called "YouTube Singles" or similar
      const albumTitle = 'YouTube Single';
      let album = await get('SELECT id FROM albums WHERE artistId = ? AND title = ?', [artistId, albumTitle]);
      if (!album) {
        const albumResult = await run(
          'INSERT INTO albums (title, artistId, releaseYear, coverUrl) VALUES (?, ?, ?, ?)',
          [albumTitle, artistId, new Date().getFullYear(), coverUrl]
        );
        albumId = albumResult.id;
      } else {
        albumId = album.id;
      }
      
      // Update the song's albumId
      await run('UPDATE songs SET albumId = ? WHERE id = ?', [albumId, result.id]);
    }

    song = await get('SELECT * FROM songs WHERE id = ?', [result.id]);
  }
  return song;
}

// POST /api/import/song
router.post('/song', authenticateToken, async (req, res) => {
  const { title, artistName, externalId, duration, coverUrl } = req.body;
  if (!title || !externalId) {
    return res.status(400).json({ error: 'Title and externalId (videoId) are required' });
  }

  try {
    const artistId = await findOrCreateArtist(artistName);
    const song = await findOrCreateSong({ title, artistId, duration, externalId, coverUrl });
    
    // Fetch full song details to return
    const songDetails = await get(`
      SELECT s.*, a.name as artistName, al.title as albumTitle, al.coverUrl as coverUrl
      FROM songs s
      JOIN artists a ON s.artistId = a.id
      LEFT JOIN albums al ON s.albumId = al.id
      WHERE s.id = ?
    `, [song.id]);

    res.status(201).json(songDetails);
  } catch (error) {
    console.error('Error importing song:', error);
    res.status(500).json({ error: 'Failed to import song' });
  }
});

// POST /api/import/youtube-playlist
router.post('/youtube-playlist', authenticateToken, async (req, res) => {
  const { url, playlistName } = req.body;
  const userId = req.user.userId;

  if (!url) {
    return res.status(400).json({ error: 'Playlist URL or ID is required' });
  }

  try {
    const playlistIdMatch = url.match(/[?&]list=([^#\&\?]+)/);
    const playlistId = playlistIdMatch ? playlistIdMatch[1] : url;

    console.log(`Fetching YouTube playlist: ${playlistId}`);
    const playlistDetails = await YouTube.getPlaylist(playlistId);
    if (!playlistDetails) {
      return res.status(404).json({ error: 'YouTube playlist not found or is private' });
    }

    const title = playlistName || playlistDetails.title || 'Imported YouTube Playlist';
    const firstVideo = playlistDetails.videos?.[0];
    const defaultCover = firstVideo?.thumbnail?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80';

    // 1. Create playlist
    const playlistResult = await run(
      'INSERT INTO playlists (name, description, coverUrl, userId) VALUES (?, ?, ?, ?)',
      [title, `Imported from YouTube playlist: ${playlistId}`, defaultCover, userId]
    );
    const localPlaylistId = playlistResult.id;

    // 2. Import each video
    const importedSongs = [];
    const videos = playlistDetails.videos || [];
    let position = 1;

    for (const video of videos) {
      try {
        const artistId = await findOrCreateArtist(video.channel?.name || 'Unknown Artist');
        const song = await findOrCreateSong({
          title: video.title || 'Untitled Video',
          artistId,
          duration: Math.floor((video.duration || 180000) / 1000), // convert ms to seconds
          externalId: video.id,
          coverUrl: video.thumbnail?.url || ''
        });

        // Link to playlist
        await run(
          'INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)',
          [localPlaylistId, song.id, position++]
        );

        importedSongs.push(song);
      } catch (err) {
        console.error(`Failed to import video ${video.id}:`, err);
        // Continue with other videos
      }
    }

    res.status(201).json({
      playlistId: localPlaylistId,
      title,
      songsCount: importedSongs.length
    });
  } catch (error) {
    console.error('Error importing YouTube playlist:', error);
    res.status(500).json({ error: 'Failed to import YouTube playlist. Make sure the playlist is public.' });
  }
});

// POST /api/import/spotify-playlist
router.post('/spotify-playlist', authenticateToken, async (req, res) => {
  const { url, playlistName } = req.body;
  const userId = req.user.userId;

  if (!url) {
    return res.status(400).json({ error: 'Spotify playlist URL or ID is required' });
  }

  try {
    const playlistIdMatch = url.match(/\/playlist\/([a-zA-Z0-9]+)/);
    const playlistId = playlistIdMatch ? playlistIdMatch[1] : url;

    console.log(`Scraping Spotify playlist: ${playlistId}`);
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to load Spotify embed page' });
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
      return res.status(400).json({ error: 'Could not extract playlist data from Spotify page.' });
    }

    const data = JSON.parse(match[1]);
    const entity = data.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      return res.status(404).json({ error: 'Spotify playlist details not found' });
    }

    const title = playlistName || entity.title || entity.name || 'Imported Spotify Playlist';
    const coverUrl = entity.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80';
    const tracks = entity.trackList || [];

    // 1. Create playlist
    const playlistResult = await run(
      'INSERT INTO playlists (name, description, coverUrl, userId) VALUES (?, ?, ?, ?)',
      [title, `Imported from Spotify playlist: ${playlistId}`, coverUrl, userId]
    );
    const localPlaylistId = playlistResult.id;

    // 2. Import tracks with YouTube search matching
    const importedSongs = [];
    let position = 1;

    for (const track of tracks) {
      try {
        const trackTitle = track.title;
        const artistName = track.subtitle || 'Unknown Artist';
        const durationSec = Math.floor((track.duration || 180000) / 1000);

        console.log(`Matching Spotify track on YouTube: ${artistName} - ${trackTitle}`);
        const searchResults = await ytSearch(`${artistName} ${trackTitle}`);
        const matchVideo = searchResults.videos?.[0];

        if (matchVideo) {
          const artistId = await findOrCreateArtist(artistName);
          const song = await findOrCreateSong({
            title: trackTitle,
            artistId,
            duration: durationSec,
            externalId: matchVideo.videoId,
            coverUrl: track.audioPreview?.url ? coverUrl : (matchVideo.thumbnail || coverUrl) // Use video thumbnail or playlist cover
          });

          // Link to playlist
          await run(
            'INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)',
            [localPlaylistId, song.id, position++]
          );

          importedSongs.push(song);
        } else {
          console.warn(`No YouTube match found for: ${artistName} - ${trackTitle}`);
        }

        // Add a micro delay to avoid hitting YouTube rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`Failed to process Spotify track:`, err);
      }
    }

    res.status(201).json({
      playlistId: localPlaylistId,
      title,
      songsCount: importedSongs.length
    });
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    res.status(500).json({ error: 'Failed to import Spotify playlist' });
  }
});

export default router;
