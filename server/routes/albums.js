import express from 'express';
import { run, get, all } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all albums with artist names
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT al.*, a.name as artistName
      FROM albums al
      JOIN artists a ON al.artistId = a.id
      ORDER BY al.title ASC
    `;
    const albums = await all(query);
    res.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single album with songs
router.get('/:id', async (req, res) => {
  const albumId = parseInt(req.params.id, 10);

  try {
    const query = `
      SELECT al.*, a.name as artistName
      FROM albums al
      JOIN artists a ON al.artistId = a.id
      WHERE al.id = ?
    `;
    const album = await get(query, [albumId]);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const songs = await all('SELECT * FROM songs WHERE albumId = ? ORDER BY id ASC', [albumId]);

    res.json({
      ...album,
      songs
    });
  } catch (error) {
    console.error('Error fetching album details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to add new album
router.post('/', authenticateToken, async (req, res) => {
  const { title, artistId, releaseYear, coverUrl } = req.body;

  if (!title || !artistId) {
    return res.status(400).json({ error: 'Album title and artistId are required' });
  }

  try {
    // Check if artist exists
    const artist = await get('SELECT id FROM artists WHERE id = ?', [artistId]);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const result = await run(
      'INSERT INTO albums (title, artistId, releaseYear, coverUrl) VALUES (?, ?, ?, ?)',
      [title, artistId, releaseYear || new Date().getFullYear(), coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80']
    );

    const newAlbum = await get(`
      SELECT al.*, a.name as artistName 
      FROM albums al
      JOIN artists a ON al.artistId = a.id
      WHERE al.id = ?
    `, [result.id]);

    res.status(201).json(newAlbum);
  } catch (error) {
    console.error('Error adding album:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
