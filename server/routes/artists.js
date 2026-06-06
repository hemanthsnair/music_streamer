import express from 'express';
import { run, get, all } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all artists with song counts
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT a.*, COUNT(s.id) as songCount
      FROM artists a
      LEFT JOIN songs s ON a.id = s.artistId
      GROUP BY a.id
      ORDER BY a.name ASC
    `;
    const artists = await all(query);
    res.json(artists);
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single artist details, albums, and songs
router.get('/:id', async (req, res) => {
  const artistId = parseInt(req.params.id, 10);

  try {
    const artist = await get('SELECT * FROM artists WHERE id = ?', [artistId]);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const albums = await all('SELECT * FROM albums WHERE artistId = ? ORDER BY releaseYear DESC', [artistId]);
    
    const songs = await all(`
      SELECT s.*, al.title as albumTitle, al.coverUrl as coverUrl
      FROM songs s
      LEFT JOIN albums al ON s.albumId = al.id
      WHERE s.artistId = ?
      ORDER BY s.id DESC
    `, [artistId]);

    res.json({
      ...artist,
      albums,
      songs
    });
  } catch (error) {
    console.error('Error fetching artist details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to add new artist
router.post('/', authenticateToken, async (req, res) => {
  const { name, genre, bio, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Artist name is required' });
  }

  try {
    const result = await run(
      'INSERT INTO artists (name, genre, bio, imageUrl) VALUES (?, ?, ?, ?)',
      [name, genre || 'Unknown', bio || '', imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80']
    );

    const newArtist = await get('SELECT * FROM artists WHERE id = ?', [result.id]);
    res.status(201).json(newArtist);
  } catch (error) {
    console.error('Error adding artist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
