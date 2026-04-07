import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAvatarUrl } from "../utils/avatar.js";
import { broadcastPublicStats } from "../utils/publicStats.js";

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const issueAuthCookie = (res, user) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const getPublicUser = async (userId) => User.findById(userId);

router.post("/register", async (req, res) => {
  const {
    name = "",
    username = "",
    email = "",
    password = "",
  } = req.body;

  const normalizedName = name.trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

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
});

router.post("/login", async (req, res) => {
  const { identifier = "", password = "" } = req.body;
  const normalizedIdentifier = identifier.trim().toLowerCase();

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
    issueAuthCookie(res, req.user);
    await broadcastPublicStats(req.app.get("io"));
    res.redirect(`${CLIENT_URL}/dashboard`);
  },
);

// Get current user
router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, process.env.JWT_SECRET, async (error, decoded) => {
    if (error) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json(user);
  });
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;
