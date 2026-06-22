import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { run, get, all } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB file limit
});

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

// Helper to extract YouTube video ID
function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(外界|youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  // Let's use a simpler and highly reliable regex for standard YouTube URLs
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

// POST to upload a custom song file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const { title, artistId, albumId, duration, genre } = req.body;
    
    if (!title || !artistId) {
      return res.status(400).json({ error: 'Title and artistId are required' });
    }

    const finalDuration = duration ? parseInt(duration, 10) : 180;
    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Verify artist exists
    const artist = await get('SELECT id FROM artists WHERE id = ?', [artistId]);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Insert into database
    const result = await run(
      `INSERT INTO songs (title, artistId, albumId, duration, audioUrl, genre, sourceType, externalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        parseInt(artistId, 10),
        albumId && albumId !== 'null' && albumId !== '' ? parseInt(albumId, 10) : null,
        finalDuration,
        audioUrl,
        genre || 'Unknown',
        'local',
        null
      ]
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
    console.error('Error uploading song:', error);
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

    const ytId = getYoutubeId(audioUrl);
    const sourceType = ytId ? 'youtube' : 'local';
    const externalId = ytId || null;

    const result = await run(
      `INSERT INTO songs (title, artistId, albumId, duration, audioUrl, genre, sourceType, externalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, artistId, albumId || null, finalDuration, audioUrl, genre || 'Unknown', sourceType, externalId]
    );

    // If YouTube video and no custom album is selected, link to a dummy YouTube Single album with YouTube cover art
    if (ytId && !albumId) {
      const coverUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      const albumTitle = 'YouTube Single';
      let album = await get('SELECT id FROM albums WHERE artistId = ? AND title = ?', [artistId, albumTitle]);
      let finalAlbumId;
      if (!album) {
        const albumResult = await run(
          'INSERT INTO albums (title, artistId, releaseYear, coverUrl) VALUES (?, ?, ?, ?)',
          [albumTitle, artistId, new Date().getFullYear(), coverUrl]
        );
        finalAlbumId = albumResult.id;
      } else {
        finalAlbumId = album.id;
      }
      await run('UPDATE songs SET albumId = ? WHERE id = ?', [finalAlbumId, result.id]);
    }

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
