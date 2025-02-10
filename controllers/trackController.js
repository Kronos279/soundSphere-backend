const Track = require('../models/Track');
const { findYoutubeUrl, downloadAndStore } = require('../services/youtubeService');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

exports.downloadTrack = async (req, res) => {
  try {
    const { spotifyId, trackName } = req.body;

    if (!spotifyId || !trackName) {
      return res.status(400).json({ error: 'spotifyId and trackName are required' });
    }

    // Check for existing track with both conditions
    const existingTrack = await Track.findOne({
      $or: [{ _id: spotifyId }]
    });

    if (existingTrack) {
      return res.status(200).json({ 
        message: 'Track already exists', 
        track: existingTrack,
        gridFsFileId: existingTrack.gridFsFileId.toString()
      });
    }

    const youtubeUrl = await findYoutubeUrl(trackName);
    if (!youtubeUrl) {
      return res.status(404).json({ error: 'Could not find YouTube URL for the track' });
    }

    const gridFsFileId = await downloadAndStore(youtubeUrl, trackName);
    if (!gridFsFileId) {
      return res.status(500).json({ error: 'Failed to download and store the track' });
    }

    // Create new track document with explicit values
    const track = new Track({
      _id: spotifyId,
      name: trackName,
      youtubeUrl,
      gridFsFileId
    });

    try {
      const savedTrack = await track.save();
      return res.status(200).json({ 
        message: 'Track downloaded successfully', 
        track: savedTrack,
        gridFsFileId: savedTrack.gridFsFileId.toString()
      });
    } catch (dbError) {
      // Clean up GridFS file if track save fails
      const bucket = new GridFSBucket(mongoose.connection.db);
      await bucket.delete(gridFsFileId);
      throw dbError;
    }

  } catch (error) {
    console.error('Download track error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


//TO stram the tracks
exports.streamTrack = async (req, res) => {
  let downloadStream = null;

  try {
    const track = await Track.findById(req.params.trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const bucket = new GridFSBucket(mongoose.connection.db);
    const files = await bucket.find({ _id: track.gridFsFileId }).toArray();
    
    if (!files.length) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const audioFile = files[0];
    const fileSize = audioFile.length;
    const range = req.headers.range;

    // Handle errors for the stream
    const handleError = (error) => {
      console.error('Streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming audio file' });
      } else {
        res.end();
      }
    };

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      downloadStream = bucket.openDownloadStream(track.gridFsFileId, {
        start: start,
        end: end + 1
      });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg'
      });
    } else {
      downloadStream = bucket.openDownloadStream(track.gridFsFileId);
      
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes'
      });
    }

    // Set up error handler before piping
    downloadStream.on('error', handleError);

    // Pipe the stream to response
    downloadStream.pipe(res);

    // Handle client disconnect
    res.on('close', () => {
      if (downloadStream) {
        downloadStream.destroy();
      }
    });

  } catch (error) {
    console.error('Stream track error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

exports.checkExistingTracks = async (req, res) => {
  try {
    const { spotifyIds } = req.body;

    if (!spotifyIds || !Array.isArray(spotifyIds)) {
      return res.status(400).json({ 
        error: 'spotifyIds must be provided as an array' 
      });
    }

    console.log(`Checking existence for ${spotifyIds.length} tracks`);

    const existingTracks = await Track.find({
      _id: { $in: spotifyIds }
    }).select('_id name');

    const existingIds = existingTracks.map(track => track._id);

    res.status(200).json({
      message: 'Track check completed',
      existingTracks: existingTracks,
      existingIds: existingIds
    });

  } catch (error) {
    console.error('Check tracks error:', error);
    res.status(500).json({ error: error.message });
  }
};