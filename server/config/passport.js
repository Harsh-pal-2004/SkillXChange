import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import { createAvatarUrl } from "../utils/avatar.js";

const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "https://skillxchange-p4kp.onrender.com/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!user) {
          user = await User.findOne({ email });
        }

        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value || createAvatarUrl(profile.displayName),
            headline: "Excited to exchange skills",
            bio: "Here to learn new things and help others grow.",
            teachSkills: [],
            learnSkills: [],
          });
        } else {
          user.googleId = user.googleId || profile.id;
          user.name = user.name || profile.displayName;
          user.avatar =
            user.avatar ||
            profile.photos?.[0]?.value ||
            createAvatarUrl(profile.displayName);
        }

        await user.save();

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
