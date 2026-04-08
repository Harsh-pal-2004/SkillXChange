import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAvatarUrl } from "../utils/avatar.js";
import { broadcastPublicStats } from "../utils/publicStats.js";

const router = express.Router();
const CLIENT_URL = ((process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)[0] || "http://localhost:5173").replace(/\/$/, "");
const isProduction = process.env.NODE_ENV === "production";

// Cookie settings shared by login/register/google-auth.
const authCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const normalizeText = (value = "") => String(value).trim();
const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();
const normalizeUsername = (value = "") => normalizeText(value).toLowerCase();

const issueAuthCookie = (res, user) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, authCookieOptions);
};

const getPublicUser = async (userId) => User.findById(userId);

router.post("/register", async (req, res) => {
  try {
    const {
      name = "",
      username = "",
      email = "",
      password = "",
    } = req.body;

    const normalizedName = normalizeText(name);
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedName ||
      !normalizedUsername ||
      !normalizedEmail ||
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          "Name, username, email, and a password with at least 6 characters are required.",
      });
    }

    const existingEmailUser = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash",
    );
    if (existingEmailUser) {
      return res.status(400).json({
        message: existingEmailUser.passwordHash
          ? "Email is already registered."
          : "This email already uses Gmail sign-in. Please continue with Gmail.",
      });
    }

    const existingUsernameUser = await User.findOne({
      username: normalizedUsername,
    }).select("+passwordHash");

    if (existingUsernameUser) {
      return res.status(400).json({ message: "User ID is already taken." });
    }

    const user = await User.create({
      name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      avatar: createAvatarUrl(normalizedName),
      headline: "Ready to exchange skills",
      bio: "I am excited to learn new skills and share my strengths.",
      teachSkills: [],
      learnSkills: [],
    });

    issueAuthCookie(res, user);
    await broadcastPublicStats(req.app.get("io"));
    const publicUser = await getPublicUser(user._id);
    return res.status(201).json(publicUser);
  } catch (error) {
    console.error("Register failed:", error);
    return res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier = "", password = "" } = req.body;
    const normalizedIdentifier = normalizeUsername(identifier);

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({
        message: "User ID or email and password are required.",
      });
    }

    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        message: "This account uses Gmail sign-in. Please continue with Gmail.",
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    issueAuthCookie(res, user);
    const publicUser = await getPublicUser(user._id);
    return res.json(publicUser);
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${CLIENT_URL}/`);
      }

      issueAuthCookie(res, req.user);
      await broadcastPublicStats(req.app.get("io"));
      return res.redirect(`${CLIENT_URL}/dashboard`);
    } catch (error) {
      console.error("Google callback failed:", error);
      return res.redirect(`${CLIENT_URL}/`);
    }
  },
);

// Get current user
router.get("/me", async (req, res) => {
  try {
    // Passport session auth path.
    if (req.user) {
      return res.status(200).json(req.user);
    }

    // JWT cookie auth path.
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: authCookieOptions.sameSite,
    secure: authCookieOptions.secure,
  });
  res.json({ message: "Logged out" });
});

export default router;
