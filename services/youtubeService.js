const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs');
const path = require('path');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

// Initialize yt-dlp
const initYtDlp = async () => {
  try {
    const binaryPath = path.join(__dirname, 'yt-dlp.exe');
    
    // Check if binary already exists
    if (!fs.existsSync(binaryPath)) {
      console.log('Downloading yt-dlp binary...');
      await YTDlpWrap.downloadFromGithub(binaryPath);
      console.log('yt-dlp binary downloaded successfully');
    }
    
    return new YTDlpWrap(binaryPath);
  } catch (error) {
    console.error('Error initializing yt-dlp:', error);
    throw error;
  }
};

let ytDlp;

// Initialize ytDlp before using it
(async () => {
  ytDlp = await initYtDlp();
})();

const findYoutubeUrl = async (trackName) => {
  try {
    if (!ytDlp) {
      ytDlp = await initYtDlp();
    }
    
    console.log(`Searching for track: ${trackName}`);
    
    const searchResults = await ytDlp.execPromise([
      'ytsearch1:' + trackName,
      '--get-id',
      '--get-title'
    ]);

    const [title, videoId] = searchResults.split('\n').filter(line => line.trim());
    
    if (!videoId) {
      throw new Error('No video found');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Found video: "${title}" at ${videoUrl}`);
    
    return videoUrl;
  } catch (error) {
    console.error('Full error:', error);
    throw new Error(`YouTube search failed: ${error.message}`);
  }
};

const downloadAndStore = async (youtubeUrl, trackName) => {
  return new Promise((resolve, reject) => {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db);
    
    // Sanitize the file name by replacing invalid characters
    const sanitizedName = trackName
      .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid file system characters
      .replace(/\s+/g, '_');          // Replace spaces with underscores
    
    const tempFilePath = path.join(__dirname, `${sanitizedName}.mp3`);

    console.log(`Downloading from URL: ${youtubeUrl}`);
    console.log(`Saving to: ${tempFilePath}`);
    
    ytDlp.execPromise([
      youtubeUrl,
      '-x',
      '--audio-format', 'mp3',
      '-o', tempFilePath
    ])
    .then(() => {
      console.log(`Downloaded and saved to: ${tempFilePath}`);
      const uploadStream = bucket.openUploadStream(trackName);
      const readStream = fs.createReadStream(tempFilePath);

      readStream.pipe(uploadStream)
        .on('error', (error) => {
          console.error('Upload error:', error);
          fs.unlinkSync(tempFilePath); // Clean up on error
          reject(error);
        })
        .on('finish', () => {
          fs.unlinkSync(tempFilePath); // Remove the temporary file
          resolve(uploadStream.id);
        });
    })
    .catch((error) => {
      console.error('Download error:', error);
      reject(error);
    });
  });
};

module.exports = {
  findYoutubeUrl,
  downloadAndStore
};