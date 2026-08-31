import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js'; // imports and starts database schema setup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth.js';
import songRoutes from './routes/songs.js';
import artistRoutes from './routes/artists.js';
import albumRoutes from './routes/albums.js';
import playlistRoutes from './routes/playlists.js';
import importRoutes from './routes/import.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads folder if not exists (skip on Vercel read-only filesystem)
if (!process.env.VERCEL) {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
if (!process.env.VERCEL) {
  const uploadsDir = path.join(process.cwd(), 'uploads');

  // Custom middleware to handle missing YouTube downloads on-the-fly
  app.get('/uploads/yt-:videoId.m4a', async (req, res, next) => {
    const { videoId } = req.params;
    const filename = `yt-${videoId}.m4a`;
    const outputPath = path.join(uploadsDir, filename);

    if (fs.existsSync(outputPath)) {
      return next(); // file exists, let express.static serve it
    }

    try {
      console.log(`Dynamic download triggered for missing YouTube video ID: ${videoId}`);
      const { downloadYoutubeAudio } = await import('./utils/youtubeDownloader.js');
      const { default: youtubedl } = await import('youtube-dl-exec');
      
      // Trigger background download
      downloadYoutubeAudio(videoId).catch(e => console.error('Background download error:', e));

      // Redirect immediately to stream URL so playback starts without waiting
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const directUrl = await youtubedl(videoUrl, {
        getUrl: true,
        format: 'ba[ext=m4a]/140/ba/bestaudio/best',
        noWarnings: true,
        noCheckCertificates: true
      });
      if (directUrl && directUrl.trim()) {
        return res.redirect(302, directUrl.trim());
      }
    } catch (err) {
      console.error(`Dynamic download failed for video ID ${videoId}:`, err);
    }
    res.status(500).json({ error: 'Failed to retrieve YouTube audio' });
  });

  app.use('/uploads', express.static(uploadsDir));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/import', importRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected' });
});

// Serve static client assets in production
const clientBuildDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(clientBuildDir)) {
  console.log(`Serving static client files from: ${clientBuildDir}`);
  app.use(express.static(clientBuildDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientBuildDir, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Music Library Server is running on port ${PORT}`);
  });
}

export default app;
