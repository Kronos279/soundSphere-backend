const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const SpotifyStrategy = require("passport-spotify").Strategy;
require("dotenv").config();
const trackRoutes = require("./routes/trackroutes");
const authRoutes = require("./routes/authRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const connectDB = require("./config/db");

//  Initialize Express App
const app = express();
app.set("trust proxy", 1); //  Required for Vercel to trust cookies

//Set API base URL dynamically
const apiUrl = process.env.BASE_URL || "http://localhost:3000";

// Connect to MongoDB
connectDB();

//CORS Configuration
app.use(
  cors({
    origin: ["https://sound-sphere-six.vercel.app", "https://soundsphere-mocha.vercel.app","http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true, //  Required to allow cookies
    optionsSuccessStatus: 200,
  })
);

// Ensure JSON and URL-encoded requests are handled properly
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration (Use MongoDB as Session Store)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      secure: true, // Required for HTTPS in production
      httpOnly: true,
      sameSite: "none", //Required for cross-origin requests
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport for Authentication
app.use(passport.initialize());
app.use(passport.session());

// Configure Spotify Authentication
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error(
    "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET. Add them in Vercel environment variables."
  );
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

//Passport Serialization & Deserialization
passport.serializeUser((user, done) => {
  console.log("🔍 Serializing User:", user);
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  console.log("🔍 Deserializing User:", obj);
  done(null, obj);
});

// Route Files
app.use("/api/tracks", trackRoutes);
app.use(authRoutes);
app.use(playlistRoutes);

//Logout Route
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Logout failed.");
    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // Clear session cookie
      res.status(200).send("Logged out successfully!");
    });
  });
});

//Debugging Route to Check Authentication Status
app.get("/auth/status", (req, res) => {
  console.log("🔍 Session Data:", req.session);
  console.log("🔍 User Data:", req.user);
  console.log("🔍 Session ID:", req.sessionID);

  if (req.isAuthenticated()) {
    return res.json({ isAuthenticated: true, user: req.user });
  }

  res.json({ isAuthenticated: false });
});

//Test Endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the Spotify-like Backend! 🎧");
});

//  Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on ${apiUrl}`);
});
