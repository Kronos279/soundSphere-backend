const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ✅ Use MongoDB for session storage
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
require('dotenv').config();
const trackRoutes = require('./routes/trackroutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const connectDB = require('./config/db'); // Import MongoDB connection function

const app = express();

// ✅ Set API base URL dynamically
const apiUrl = process.env.BASE_URL || 'http://localhost:3000';

// ✅ Connect to MongoDB
connectDB();

// ✅ CORS configuration (Allow frontend to communicate with backend dynamically)
app.use(cors({
  origin: ["http://localhost:3001", "https://soundsphere-mocha.vercel.app"], 
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ✅ Ensure JSON and URL-encoded requests are handled properly
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Use MongoDB for session storage in production
app.use(session({
    secret: process.env.SESSION_SECRET || "session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // ✅ Secure in production
      httpOnly: true,
      sameSite:'none', // ✅ Required for cross-origin requests
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  }));
  

// ✅ Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// ✅ Configure Spotify authentication (Ensure these env variables exist)
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("❌ Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET. Add them in Vercel environment variables.");
  process.exit(1);
}

passport.use(
    new SpotifyStrategy(
      {
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        callbackURL: process.env.SPOTIFY_CALLBACK_URL,
      },
      (accessToken, refreshToken, expires_in, profile, done) => {
        console.log("🔍 Storing User in Session:", profile);
        return done(null, { accessToken, refreshToken, profile });
      }
    )
  );
  

passport.serializeUser((user, done) => {
    console.log("🔍 Serializing User:", user);
    done(null, user);
  });
  
  passport.deserializeUser((obj, done) => {
    console.log("🔍 Deserializing User:", obj);
    done(null, obj);
  });
  

// ✅ Use separate route files
app.use('/api/tracks', trackRoutes);
app.use(authRoutes);
app.use(playlistRoutes);

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
  console.log(`✅ Server running on ${apiUrl}`);
});
