const express = require('express');
const router = express.Router();
const trackController = require('../controllers/trackcontroller');

// Existing routes
router.post('/download', trackController.downloadTrack);
router.get('/stream/:trackId', trackController.streamTrack);

// Fix the test-download route
router.post('/test-download', async (req, res) => {
  try {
    const testTrack = {
      spotifyId: req.body.spotifyId || 'test_' + Date.now(), // Use provided spotifyId or generate one
      trackName: req.body.trackName
    };

    // Create a new request object with the correct body structure
    const mockReq = {
      body: testTrack
    };

    await trackController.downloadTrack(mockReq, res);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Add new route for streaming audio
router.get('/stream/:trackId', trackController.streamTrack);

// Add check-tracks route
router.post('/check-tracks', trackController.checkExistingTracks);

module.exports = router;