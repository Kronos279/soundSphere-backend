const express = require('express');

const router = express.Router();

// Playlist retrieval endpoint
router.get('/api/playlists', async (req, res) => {
  try {
    if (!req.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch playlists');
    
    const data = await response.json();
    res.json(data.items);
    
  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

//fetch a single playlist
router.get('/api/playlists/:playlistId', async (req, res) => {
  try {
    if (!req.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { playlistId } = req.params;
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch playlist');
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ New route to fetch playlist tracks
router.get('/playlists/:playlistId/tracks', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.accessToken) {
        return res.status(401).json({ error: "Unauthorized. Please log in again." });
      }
  
      const playlistId = req.params.playlistId;
      const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  
      const response = await fetch(spotifyApiUrl, {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) throw new Error("Failed to fetch playlist tracks");
  
      const data = await response.json();
      res.json(data.items); // Return track list
  
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      res.status(500).json({ error: error.message });
    }
  });


module.exports = router;
