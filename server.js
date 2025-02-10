const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
require('dotenv').config();
const trackRoutes = require('./routes/trackroutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const connectDB = require('./config/db'); // Import the db.js file

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ✅ Ensure JSON and URL-encoded requests are handled properly
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Proper session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ✅ Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// ✅ Configure Spotify authentication
passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            callbackURL: process.env.SPOTIFY_CALLBACK_URL,
        },
        (accessToken, refreshToken, expires_in, profile, done) => {
            const user = {
                accessToken,
                refreshToken,
                profile
            };
            return done(null, user);
        }
    )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ✅ Use separate route files
app.use('/api/tracks', trackRoutes);
app.use(authRoutes);
app.use(playlistRoutes);

// ✅ Check if user is authenticated
// app.get('/auth/status', (req, res) => {
//     if (req.isAuthenticated()) {
//         res.json({ isAuthenticated: true });
//     } else {
//         res.json({ isAuthenticated: false });
//     }
// });

// ✅ Logout route
app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return res.status(500).send("Logout failed.");
        req.session.destroy(() => {
            res.clearCookie('connect.sid');  // Clear session cookie
            res.status(200).send("Logged out successfully!");
        });
    });
});

// ✅ Test endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the Spotify-like Backend! 🎧');
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
