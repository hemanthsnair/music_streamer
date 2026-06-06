import express from 'express';
import jwt from 'jsonwebtoken';
import { run, get, all } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Helper to optionally authenticate user for GET /api/songs to see liked status
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// GET all songs (optionally filtered by search term and with liked status)
router.get('/', optionalAuthenticate, async (req, res) => {
  const { search } = req.query;
  const userId = req.user ? req.user.userId : null;

  try {
    let query = `
      SELECT 
        s.*, 
        a.name as artistName, 
        al.title as albumTitle, 
        al.coverUrl as coverUrl,
        CASE WHEN l.userId IS NOT NULL THEN 1 ELSE 0 END as isLiked
      FROM songs s
      JOIN artists a ON s.artistId = a.id
      LEFT JOIN albums al ON s.albumId = al.id
      LEFT JOIN liked_songs l ON s.id = l.songId AND l.userId = ?
    `;
    const params = [userId];

    if (search) {
      query += ` WHERE s.title LIKE ? OR a.name LIKE ? OR s.genre LIKE ?`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY s.id DESC`;

    const songs = await all(query, params);
    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all liked songs for the current user
router.get('/liked', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT 
        s.*, 
        a.name as artistName, 
        al.title as albumTitle, 
        al.coverUrl as coverUrl,
        1 as isLiked
      FROM liked_songs l
      JOIN songs s ON l.songId = s.id
      JOIN artists a ON s.artistId = a.id
      LEFT JOIN albums al ON s.albumId = al.id
      WHERE l.userId = ?
      ORDER BY l.likedAt DESC
    `;
    const songs = await all(query, [userId]);
    res.json(songs);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to add a new song
router.post('/', authenticateToken, async (req, res) => {
  const { title, artistId, albumId, duration, audioUrl, genre } = req.body;

  if (!title || !artistId || !audioUrl) {
    return res.status(400).json({ error: 'Title, artistId, and audioUrl are required' });
  }

  const finalDuration = duration ? parseInt(duration, 10) : 180; // default 3 minutes if not provided

  try {
    // Check if artist exists
    const artist = await get('SELECT id FROM artists WHERE id = ?', [artistId]);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const result = await run(
      `INSERT INTO songs (title, artistId, albumId, duration, audioUrl, genre) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, artistId, albumId || null, finalDuration, audioUrl, genre || 'Unknown']
    );

    const newSong = await get(`
      SELECT s.*, a.name as artistName, al.title as albumTitle, al.coverUrl as coverUrl
      FROM songs s
      JOIN artists a ON s.artistId = a.id
      LEFT JOIN albums al ON s.albumId = al.id
      WHERE s.id = ?
    `, [result.id]);

    res.status(201).json(newSong);
  } catch (error) {
    console.error('Error adding song:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to toggle like state
router.post('/:id/like', authenticateToken, async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  try {
    // Verify song exists
    const song = await get('SELECT id FROM songs WHERE id = ?', [songId]);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Check if already liked
    const existing = await get('SELECT * FROM liked_songs WHERE userId = ? AND songId = ?', [userId, songId]);

    if (existing) {
      // Unlike
      await run('DELETE FROM liked_songs WHERE userId = ? AND songId = ?', [userId, songId]);
      res.json({ liked: false });
    } else {
      // Like
      await run('INSERT INTO liked_songs (userId, songId) VALUES (?, ?)', [userId, songId]);
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error liking/unliking song:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to increment play count
router.post('/:id/play', async (req, res) => {
  const songId = parseInt(req.params.id, 10);

  try {
    await run('UPDATE songs SET playCount = playCount + 1 WHERE id = ?', [songId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording play count:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
