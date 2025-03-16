const express = require('express');
const passport = require('passport');

const router = express.Router();

// Get the FRONTEND_URL from environment variables (default to localhost:3001 if not defined)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Spotify authentication route
router.get('/auth/spotify',
  passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-read-private', 'playlist-read-private', 'playlist-read-collaborative'],
    showDialog: true
  })
);

// Callback route after Spotify authentication
router.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: `${FRONTEND_URL}/login` }),
  (req, res) => {
    try {
      req.session.user = {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.email,
        profilePicture: req.user.photos?.[0]?.value || null,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken
      };
      res.redirect(FRONTEND_URL);
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/login`);
    }
  }
);

// Auth status check route
router.get('/auth/status', (req, res) => {
  console.log('Is Authenticated:', req.isAuthenticated());

  if (req.isAuthenticated() && req.user) {
    // Extract user data from the profile object
    const profile = req.user.profile;
    
    res.json({
      isAuthenticated: true,
      user: {
        id: profile.id,
        displayName: profile.displayName,
        email: profile._json.email,
        profilePicture: profile.photos?.[0]?.url || null,
        accessToken: req.user.accessToken
      }
    });
  } else {
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Session destruction failed" });
      }
      res.clearCookie('connect.sid'); // Remove session cookie
      res.json({ message: "Logged out successfully!" });
    });
  });
});

// Success route (for testing)
router.get('/success', (req, res) => {
  res.send('Authentication successful! You can now close this tab and use Postman.');
});

module.exports = router;
