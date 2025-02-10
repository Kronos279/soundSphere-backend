const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;

module.exports = (app) => {
  passport.use(
    new SpotifyStrategy(
      {
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        callbackURL: process.env.SPOTIFY_CALLBACK_URL,
      },
      (accessToken, refreshToken, expires_in, profile, done) => {
        // Log full profile for debugging
        console.log('Spotify profile:', profile);
        
        // Extract only the necessary user data
        const user = {
          id: profile.id,
          displayName: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value,
          profilePicture: profile.photos?.[0]?.value,
          accessToken,
          refreshToken
        };
        
        return done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => {
    // Serialize only necessary data
    done(null, {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      profilePicture: user.profilePicture,
      accessToken: user.accessToken
    });
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  return passport;
};