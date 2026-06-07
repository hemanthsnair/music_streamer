import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    initializeSchema();
  }
});

// Helper wrappers to return Promises
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const exec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

async function initializeSchema() {
  try {
    // 1. Users Table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Artists Table
    await run(`
      CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        genre TEXT,
        bio TEXT,
        imageUrl TEXT
      )
    `);

    // 3. Albums Table
    await run(`
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artistId INTEGER NOT NULL,
        releaseYear INTEGER,
        coverUrl TEXT,
        FOREIGN KEY(artistId) REFERENCES artists(id)
      )
    `);

    // 4. Songs Table
    await run(`
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artistId INTEGER NOT NULL,
        albumId INTEGER,
        duration INTEGER NOT NULL,
        audioUrl TEXT,
        genre TEXT,
        playCount INTEGER DEFAULT 0,
        sourceType TEXT DEFAULT 'local',
        externalId TEXT,
        FOREIGN KEY(artistId) REFERENCES artists(id),
        FOREIGN KEY(albumId) REFERENCES albums(id)
      )
    `);

    // Migrate existing DB if columns don't exist
    try {
      await run(`ALTER TABLE songs ADD COLUMN sourceType TEXT DEFAULT 'local'`);
    } catch (e) {
      // column already exists
    }
    try {
      await run(`ALTER TABLE songs ADD COLUMN externalId TEXT`);
    } catch (e) {
      // column already exists
    }

    // 5. Playlists Table
    await run(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        coverUrl TEXT,
        userId INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    // 6. Playlist Songs Junction
    await run(`
      CREATE TABLE IF NOT EXISTS playlist_songs (
        playlistId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        position INTEGER,
        PRIMARY KEY(playlistId, songId),
        FOREIGN KEY(playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY(songId) REFERENCES songs(id) ON DELETE CASCADE
      )
    `);

    // 7. Liked Songs Junction
    await run(`
      CREATE TABLE IF NOT EXISTS liked_songs (
        userId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        likedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userId, songId),
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(songId) REFERENCES songs(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables verified/created successfully.');
    await seedDatabase();
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

async function seedDatabase() {
  try {
    const artistCheck = await get(`SELECT COUNT(*) as count FROM artists`);
    if (artistCheck.count > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    console.log('Database is empty. Seeding initial music catalog...');

    // Seed Artists
    const artists = [
      {
        name: 'Lofi Dreams',
        genre: 'Lofi Hip Hop',
        bio: 'Mellow melodies and crackling vinyl beats for study, work, or simple relaxation.',
        imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80'
      },
      {
        name: 'Ambient Woods',
        genre: 'Ambient',
        bio: 'Ethereal synth waves, field recordings, and atmospheric acoustic soundscapes.',
        imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80'
      },
      {
        name: 'Synthwave Kid',
        genre: 'Synthwave',
        bio: 'Retro-futurism inspired synthesizer beats and neon-drenched driving tempos.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'
      }
    ];

    const artistIds = [];
    for (const artist of artists) {
      const result = await run(
        `INSERT INTO artists (name, genre, bio, imageUrl) VALUES (?, ?, ?, ?)`,
        [artist.name, artist.genre, artist.bio, artist.imageUrl]
      );
      artistIds.push(result.id);
    }

    // Seed Albums
    const albums = [
      {
        title: 'Chilled Study Sessions',
        artistId: artistIds[0],
        releaseYear: 2025,
        coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=400&q=80'
      },
      {
        title: 'Whispering Canopy',
        artistId: artistIds[1],
        releaseYear: 2024,
        coverUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80'
      },
      {
        title: 'Neon Horizons',
        artistId: artistIds[2],
        releaseYear: 2026,
        coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'
      }
    ];

    const albumIds = [];
    for (const album of albums) {
      const result = await run(
        `INSERT INTO albums (title, artistId, releaseYear, coverUrl) VALUES (?, ?, ?, ?)`,
        [album.title, album.artistId, album.releaseYear, album.coverUrl]
      );
      albumIds.push(result.id);
    }

    // Seed Songs
    // Using standard, highly reliable sample MP3 urls from SoundHelix.
    const songs = [
      {
        title: 'Late Night Coffee',
        artistId: artistIds[0],
        albumId: albumIds[0],
        duration: 372, // 6:12
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'Lofi Hip Hop'
      },
      {
        title: 'Raindrops on Window',
        artistId: artistIds[0],
        albumId: albumIds[0],
        duration: 425, // 7:05
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Lofi Hip Hop'
      },
      {
        title: 'Deep Woods Echo',
        artistId: artistIds[1],
        albumId: albumIds[1],
        duration: 324, // 5:24
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        genre: 'Ambient'
      },
      {
        title: 'Ethereal Forest Sleep',
        artistId: artistIds[1],
        albumId: albumIds[1],
        duration: 302, // 5:02
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        genre: 'Ambient'
      },
      {
        title: 'Midnight Retro Cruiser',
        artistId: artistIds[2],
        albumId: albumIds[2],
        duration: 363, // 6:03
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        genre: 'Synthwave'
      },
      {
        title: 'Grid Runner 1984',
        artistId: artistIds[2],
        albumId: albumIds[2],
        duration: 402, // 6:42
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        genre: 'Synthwave'
      }
    ];

    for (const song of songs) {
      await run(
        `INSERT INTO songs (title, artistId, albumId, duration, audioUrl, genre) VALUES (?, ?, ?, ?, ?, ?)`,
        [song.title, song.artistId, song.albumId, song.duration, song.audioUrl, song.genre]
      );
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

export default db;
