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

// ❌ Cookie system removed (not needed anymore)

const normalizeText = (value = "") => String(value).trim();
const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();
const normalizeUsername = (value = "") => normalizeText(value).toLowerCase();

const sendSuccess = (res, { status = 200, message, data = null, token = null }) =>
  res.status(status).json({
    success: true,
    message,
    data,
    token,
  });

const sendError = (res, { status, message }) =>
  res.status(status).json({
    success: false,
    message,
    data: null,
  });

const getPublicUser = async (userId) => User.findById(userId);



// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name = "", username = "", email = "", password = "" } = req.body;

    const normalizedName = normalizeText(name);
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedName ||
      !normalizedUsername ||
      !normalizedEmail ||
      password.length < 6
    ) {
      return sendError(res, {
        status: 400,
        message:
          "Name, username, email, and a password with at least 6 characters are required.",
      });
    }

    const existingEmailUser = await User.findOne({ email: normalizedEmail });
    if (existingEmailUser) {
      return sendError(res, {
        status: 409,
        message: "Account already exists, please login",
      });
    }

    const existingUsernameUser = await User.findOne({
      username: normalizedUsername,
    });

    if (existingUsernameUser) {
      return sendError(res, {
        status: 409,
        message: "Account already exists, please login",
      });
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

    // ✅ JWT TOKEN
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await broadcastPublicStats(req.app.get("io"));

    const publicUser = await getPublicUser(user._id);

    return sendSuccess(res, {
      status: 201,
      message: "Signup successful",
      data: publicUser,
      token,
    });
  } catch (error) {
    console.error("Register failed:", error);
    return sendError(res, {
      status: 500,
      message: "Registration failed. Please try again.",
    });
  }
});



// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { identifier = "", password = "" } = req.body;
    const normalizedIdentifier = normalizeUsername(identifier);

    if (!normalizedIdentifier || !password) {
      return sendError(res, {
        status: 400,
        message: "User ID or email and password are required.",
      });
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    }).select("+passwordHash");

    if (!user) {
      return sendError(res, {
        status: 404,
        message: "No account found, please sign up",
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return sendError(res, {
        status: 401,
        message: "Incorrect password",
      });
    }

    // ✅ JWT TOKEN
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const publicUser = await getPublicUser(user._id);

    return sendSuccess(res, {
      message: "Login successful",
      data: publicUser,
      token,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return sendError(res, {
      status: 500,
      message: "Login failed. Please try again.",
    });
  }
});



// ================= GOOGLE =================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${CLIENT_URL}/`);
      }

      await broadcastPublicStats(req.app.get("io"));
      return res.redirect(`${CLIENT_URL}/dashboard`);
    } catch (error) {
      console.error("Google callback failed:", error);
      return res.redirect(`${CLIENT_URL}/`);
    }
  },
);



// ================= ME =================
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return sendError(res, {
      status: 401,
      message: "Not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated",
      });
    }

    return sendSuccess(res, {
      message: "Authenticated",
      data: user,
    });
  } catch (error) {
    return sendError(res, {
      status: 401,
      message: "Not authenticated",
    });
  }
});



// ================= LOGOUT =================
router.get("/logout", (req, res) => {
  return sendSuccess(res, {
    message: "Logged out",
    data: null,
  });
});

export default router;