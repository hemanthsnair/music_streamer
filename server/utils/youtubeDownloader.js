import youtubedl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { run, get } from '../db.js';

// In-memory set to prevent duplicate concurrent downloads of the same video
const activeDownloads = new Set();

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
  
  // Format ba[ext=m4a]/140/ba/bestaudio/best uses native AAC m4a audio or best available audio stream.
  await youtubedl(videoUrl, {
    format: 'ba[ext=m4a]/140/ba/bestaudio/best',
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error(`File was not created at expected path: ${outputPath}`);
  }

  console.log(`Successfully downloaded YouTube audio: ${filename} (${fs.statSync(outputPath).size} bytes)`);
  return `/uploads/${filename}`;
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
