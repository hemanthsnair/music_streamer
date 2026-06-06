import express from 'express';
import { run, get, all } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all playlists for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT p.*, COUNT(ps.songId) as songCount
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      WHERE p.userId = ?
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    const playlists = await all(query, [userId]);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET details of a specific playlist, including its songs
router.get('/:id', authenticateToken, async (req, res) => {
  const playlistId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  try {
    // Verify playlist belongs to the logged-in user
    const playlist = await get('SELECT * FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied' });
    }

    // Get songs in the playlist, including liked status for the current user
    const songsQuery = `
      SELECT 
        s.*, 
        a.name as artistName, 
        al.title as albumTitle, 
        al.coverUrl as coverUrl,
        CASE WHEN l.userId IS NOT NULL THEN 1 ELSE 0 END as isLiked
      FROM playlist_songs ps
      JOIN songs s ON ps.songId = s.id
      JOIN artists a ON s.artistId = a.id
      LEFT JOIN albums al ON s.albumId = al.id
      LEFT JOIN liked_songs l ON s.id = l.songId AND l.userId = ?
      WHERE ps.playlistId = ?
      ORDER BY ps.position ASC, s.id ASC
    `;
    const songs = await all(songsQuery, [userId, playlistId]);

    res.json({
      ...playlist,
      songs
    });
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to create a new playlist
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, coverUrl } = req.body;
  const userId = req.user.userId;

  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  const finalCoverUrl = coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80';

  try {
    const result = await run(
      'INSERT INTO playlists (name, description, coverUrl, userId) VALUES (?, ?, ?, ?)',
      [name, description || '', finalCoverUrl, userId]
    );

    const newPlaylist = await get('SELECT * FROM playlists WHERE id = ?', [result.id]);
    res.status(201).json(newPlaylist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to add a song to a playlist
router.post('/:id/songs', authenticateToken, async (req, res) => {
  const playlistId = parseInt(req.params.id, 10);
  const { songId } = req.body;
  const userId = req.user.userId;

  if (!songId) {
    return res.status(400).json({ error: 'Song ID is required' });
  }

  try {
    // 1. Verify playlist belongs to the user
    const playlist = await get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied' });
    }

    // 2. Verify song exists
    const song = await get('SELECT id FROM songs WHERE id = ?', [songId]);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // 3. Check if song already in playlist
    const existing = await get('SELECT * FROM playlist_songs WHERE playlistId = ? AND songId = ?', [playlistId, songId]);
    if (existing) {
      return res.status(400).json({ error: 'Song is already in this playlist' });
    }

    // 4. Get current maximum position to append at the end
    const maxPosRow = await get('SELECT MAX(position) as maxPos FROM playlist_songs WHERE playlistId = ?', [playlistId]);
    const nextPosition = (maxPosRow.maxPos || 0) + 1;

    // 5. Insert
    await run(
      'INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)',
      [playlistId, songId, nextPosition]
    );

    res.status(201).json({ message: 'Song added to playlist successfully' });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a song from a playlist
router.delete('/:id/songs/:songId', authenticateToken, async (req, res) => {
  const playlistId = parseInt(req.params.id, 10);
  const songId = parseInt(req.params.songId, 10);
  const userId = req.user.userId;

  try {
    // Verify playlist ownership
    const playlist = await get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied' });
    }

    const result = await run(
      'DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?',
      [playlistId, songId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found in this playlist' });
    }

    res.json({ message: 'Song removed from playlist' });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a playlist entirely
router.delete('/:id', authenticateToken, async (req, res) => {
  const playlistId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  try {
    // Verify ownership
    const playlist = await get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId]);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found or access denied' });
    }

    // SQLite will cascade delete playlist_songs automatically because of FOREIGN KEY constraint setup
    await run('DELETE FROM playlists WHERE id = ?', [playlistId]);

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
