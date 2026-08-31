import defaultYoutubedl, { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { exec } from 'child_process';
import { run, get } from '../db.js';

// In-memory set to prevent duplicate concurrent downloads of the same video
const activeDownloads = new Set();
const binDir = process.platform === 'win32'
  ? path.resolve(process.cwd(), 'bin')
  : '/tmp/yt-dlp-bin';
const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const customBinPath = path.join(binDir, binName);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download yt-dlp binary: HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        if (process.platform !== 'win32') {
          try { fs.chmodSync(dest, 0o755); } catch (e) {}
        }
        resolve(dest);
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

let updatePromise = null;

/**
 * Downloads the latest release of yt-dlp directly from GitHub to process.cwd()/bin
 */
export async function ensureYtDlpBinary() {
  if (updatePromise) return updatePromise;

  updatePromise = (async () => {
    try {
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }

      if (fs.existsSync(customBinPath)) {
        const stats = fs.statSync(customBinPath);
        const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        if (ageInHours < 24 && stats.size > 1000000) {
          console.log(`Using cached yt-dlp binary at ${customBinPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
          return customBinPath;
        }
      }

      console.log(`Downloading latest yt-dlp binary from GitHub releases to ${customBinPath}...`);
      const downloadUrl = process.platform === 'win32'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

      const tempPath = `${customBinPath}.tmp`;
      await downloadFile(downloadUrl, tempPath);
      
      if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 1000000) {
        if (fs.existsSync(customBinPath)) {
          try { fs.unlinkSync(customBinPath); } catch (e) {}
        }
        fs.renameSync(tempPath, customBinPath);
        if (process.platform !== 'win32') {
          try { fs.chmodSync(customBinPath, 0o755); } catch (e) {}
        }
        console.log(`Successfully updated yt-dlp binary to latest version!`);
      }
    } catch (err) {
      console.warn(`Failed to auto-download yt-dlp binary from GitHub: ${err.message}. Falling back to default binary.`);
    }
  })();

  return updatePromise;
}

/**
 * Returns a custom youtube-dl-exec instance targeting the latest binary if available.
 */
export function getYtDlp() {
  if (fs.existsSync(customBinPath) && fs.statSync(customBinPath).size > 1000000) {
    return create(customBinPath);
  }
  return defaultYoutubedl;
}

/**
 * Downloads a YouTube video's audio (format 140) to the uploads folder.
 * @param {string} videoId 
 * @returns {Promise<string>} The local file's public URL path
 */
export async function downloadYoutubeAudio(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const filename = `yt-${videoId}.m4a`;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const outputPath = path.join(uploadsDir, filename);

  // If the file already exists, return the expected URL
  if (fs.existsSync(outputPath)) {
    console.log(`Audio file already cached: ${filename}`);
    return `/uploads/${filename}`;
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  console.log(`Starting YouTube download for video ID: ${videoId}`);
  await ensureYtDlpBinary();
  const youtubedl = getYtDlp();
  
  // Try multiple player clients for resilience against YouTube blocking
  const playerClients = ['android_creator', 'android', 'ios', 'web'];
  let lastErr = null;

  for (const client of playerClients) {
    try {
      await youtubedl(videoUrl, {
        format: 'ba/best',
        extractorArgs: `youtube:player_client=${client}`,
        output: outputPath,
        noCheckCertificates: true,
        noWarnings: true,
      });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`Successfully downloaded YouTube audio: ${filename} (${fs.statSync(outputPath).size} bytes) using client=${client}`);
        return `/uploads/${filename}`;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Download attempt with client=${client} failed for ${videoId}: ${err.message}`);
      // Clean up partial file
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (e) {}
      }
      continue;
    }
  }

  throw lastErr || new Error(`All download attempts failed for video: ${videoId}`);
}

/**
 * Queues a background download for a YouTube song, updating the database upon completion.
 * @param {number} songId 
 * @param {string} videoId 
 */
export function queueYoutubeDownload(songId, videoId) {
  if (!videoId) return;

  if (activeDownloads.has(videoId)) {
    console.log(`Download already in progress for video ID: ${videoId}`);
    return;
  }

  activeDownloads.add(videoId);

  // Run asynchronously in the background so it doesn't block requests
  (async () => {
    try {
      // 1. Verify song still exists and needs download
      const song = await get('SELECT id, sourceType FROM songs WHERE id = ?', [songId]);
      if (!song || song.sourceType !== 'youtube') {
        activeDownloads.delete(videoId);
        return;
      }

      // 2. Perform the download
      const localUrl = await downloadYoutubeAudio(videoId);

      // 3. Update the song row in the database while maintaining sourceType = 'youtube'
      await run(
        `UPDATE songs 
         SET audioUrl = ?, sourceType = 'youtube' 
         WHERE id = ?`,
        [localUrl, songId]
      );
      
      console.log(`Updated song ${songId} in database to play from local cached file.`);
    } catch (err) {
      console.error(`Background download failed for song ${songId} (video: ${videoId}):`, err);
    } finally {
      activeDownloads.delete(videoId);
    }
  })();
}

export { activeDownloads };

/**
 * Force re-download of the yt-dlp binary (used when extraction fails repeatedly).
 */
export async function updateYtDlpBinary() {
  updatePromise = null;
  // Remove existing binary to force re-download
  if (fs.existsSync(customBinPath)) {
    try { fs.unlinkSync(customBinPath); } catch (e) {}
  }
  return ensureYtDlpBinary();
}
