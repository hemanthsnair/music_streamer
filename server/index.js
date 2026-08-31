import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
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

    console.log(`Dynamic download triggered for missing YouTube video ID: ${videoId}`);

    try {
      const { downloadYoutubeAudio, ensureYtDlpBinary, getYtDlp } = await import('./utils/youtubeDownloader.js');
      const binPath = await ensureYtDlpBinary();
      
      // Trigger background download for caching
      downloadYoutubeAudio(videoId).catch(e => console.error('Background download error:', e));

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const ytBin = binPath && fs.existsSync(binPath) ? binPath : 'yt-dlp';

      // Primary: pipe yt-dlp stdout directly (fastest)
      const { spawn: spawnProcess } = await import('child_process');
      await new Promise((resolve, reject) => {
        const proc = spawnProcess(ytBin, [
          '-f', 'ba[ext=m4a]/ba/best',
          '--extractor-args', 'youtube:player_client=android_creator',
          '--no-warnings', '--no-check-certificates', '--no-playlist',
          '-o', '-', videoUrl
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        let headersSent = false;
        let stderrData = '';
        proc.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });
        proc.stdout.once('data', () => {
          if (!headersSent) {
            headersSent = true;
            res.setHeader('Content-Type', 'audio/mp4');
            res.setHeader('Transfer-Encoding', 'chunked');
          }
        });
        proc.stdout.pipe(res);
        proc.on('close', (code) => {
          if (code === 0 || headersSent) resolve();
          else reject(new Error(`yt-dlp exit ${code}: ${stderrData.slice(0, 300)}`));
        });
        proc.on('error', reject);
        res.on('close', () => { try { proc.kill('SIGTERM'); } catch (e) {} });
      });
      return;
    } catch (pipeErr) {
      console.warn(`Upload proxy pipe failed for ${videoId}: ${pipeErr.message}`);
    }

    // Fallback: parallel URL race
    if (!res.headersSent) {
      try {
        const { getYtDlp } = await import('./utils/youtubeDownloader.js');
        const youtubedl = getYtDlp();
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const clients = ['android_creator', 'android', 'ios'];

        const getUrl = async (client) => {
          const url = await youtubedl(videoUrl, {
            getUrl: true, format: 'ba/best',
            extractorArgs: `youtube:player_client=${client}`,
            noWarnings: true, noCheckCertificates: true, noPlaylist: true,
          });
          if (!url || !url.trim()) throw new Error('empty');
          return url.trim();
        };

        const directUrl = await Promise.any(clients.map(c => getUrl(c)));
        const headers = req.headers.range ? { range: req.headers.range } : {};
        headers['User-Agent'] = 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)';
        const audioRes = await fetch(directUrl, { headers });
        if (audioRes.ok || audioRes.status === 206) {
          res.status(audioRes.status);
          if (audioRes.headers.get('content-type')) res.setHeader('Content-Type', audioRes.headers.get('content-type'));
          if (audioRes.headers.get('content-length')) res.setHeader('Content-Length', audioRes.headers.get('content-length'));
          if (audioRes.headers.get('content-range')) res.setHeader('Content-Range', audioRes.headers.get('content-range'));
          if (audioRes.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', audioRes.headers.get('accept-ranges'));
          const readable = Readable.fromWeb(audioRes.body);
          readable.on('error', () => { if (!res.writableEnded) res.end(); });
          return readable.pipe(res);
        }
      } catch (err) {
        console.error(`Dynamic download fallback failed for ${videoId}:`, err.message);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve YouTube audio' });
    }
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
    import('./utils/youtubeDownloader.js')
      .then(m => m.ensureYtDlpBinary())
      .catch(err => console.warn('yt-dlp startup binary download error:', err));
  });
}

export default app;
