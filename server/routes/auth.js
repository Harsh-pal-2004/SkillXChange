import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAvatarUrl } from "../utils/avatar.js";
import { broadcastPublicStats } from "../utils/publicStats.js";
import { isGoogleOauthConfigured } from "../config/passport.js";

const router = express.Router();

const CLIENT_URL = ((process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)[0] || "http://localhost:5173").replace(/\/$/, "");

// ❌ Cookie system removed (not needed anymore)

const normalizeText = (value = "") => String(value).trim();
const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();
const normalizeUsername = (value = "") => normalizeText(value).toLowerCase();

const LOGIN_APPROVAL_TTL_MS = 2 * 60 * 1000;

const decodeGoogleState = (rawState) => {
  if (!rawState) return { forceNewSession: false };

  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    return {
      forceNewSession: parsed?.forceNewSession === true,
    };
  } catch {
    return { forceNewSession: false };
  }
};

const buildGoogleRedirect = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `${CLIENT_URL}/?${query}` : `${CLIENT_URL}/`;
};

const signTokenForUser = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      sid: user.activeSessionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const startFreshSession = async (req, user) => {
  const previousSessionId = user.activeSessionId || null;

  user.activeSessionId = crypto.randomUUID();
  user.activeSessionUpdatedAt = new Date();
  user.pendingLoginApproval = { id: null, expiresAt: null, approved: false };
  await user.save();

  if (
    previousSessionId &&
    previousSessionId !== user.activeSessionId &&
    req.app.get("io")
  ) {
    req.app.get("io").to(`user:${user._id}`).emit("session:revoked", {
      reason: "new_login",
      message: "Your account was signed in on another device.",
    });
  }

  return signTokenForUser(user);
};

const userWithSessionFields = (query) =>
  query.select(
    "+passwordHash +activeSessionId +activeSessionUpdatedAt +pendingLoginApproval",
  );

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

    const fullUser = await userWithSessionFields(User.findById(user._id));
    const token = await startFreshSession(req, fullUser);

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

    const user = await userWithSessionFields(User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    }));

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

    const forceNewSession = req.body?.forceNewSession === true;
    const approvalId = normalizeText(req.body?.approvalId || "");
    const now = Date.now();

    const hasActiveSession = Boolean(user.activeSessionId);
    const pendingApprovalId = user.pendingLoginApproval?.id || null;
    const pendingApprovalApproved = user.pendingLoginApproval?.approved === true;
    const pendingApprovalExpiry = user.pendingLoginApproval?.expiresAt
      ? new Date(user.pendingLoginApproval.expiresAt).getTime()
      : null;
    const hasValidPendingApproval =
      Boolean(pendingApprovalId) &&
      Boolean(pendingApprovalExpiry) &&
      pendingApprovalExpiry > now;

    const isApprovedFromExistingSession =
      hasValidPendingApproval &&
      pendingApprovalApproved &&
      approvalId &&
      approvalId === pendingApprovalId;

    if (hasActiveSession && !forceNewSession && !isApprovedFromExistingSession) {
      const nextApprovalId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + LOGIN_APPROVAL_TTL_MS);

      user.pendingLoginApproval = {
        id: nextApprovalId,
        expiresAt,
        approved: false,
      };
      await user.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`user:${user._id}`).emit("session:takeover-request", {
          approvalId: nextApprovalId,
          requestedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
      }

      return res.status(409).json({
        success: false,
        code: "SESSION_CONFLICT",
        message:
          "This account is already active on another device. Approve from the existing session or continue and sign out the previous session.",
        data: {
          approvalId: nextApprovalId,
          canForceTakeover: true,
        },
      });
    }

    const token = await startFreshSession(req, user);

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
router.post("/session/approval", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return sendError(res, {
      status: 401,
      message: "Not authenticated",
    });
  }

  const { approvalId = "", decision = "deny" } = req.body;
  const normalizedApprovalId = normalizeText(approvalId);

  if (!normalizedApprovalId || !["allow", "deny"].includes(decision)) {
    return sendError(res, {
      status: 400,
      message: "Valid approvalId and decision are required.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userWithSessionFields(User.findById(decoded.id));

    if (!user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated",
      });
    }

    if (!decoded.sid || !user.activeSessionId || decoded.sid !== user.activeSessionId) {
      return sendError(res, {
        status: 401,
        message: "Session expired. Please log in again.",
      });
    }

    const pendingApprovalId = user.pendingLoginApproval?.id || null;
    const expiresAt = user.pendingLoginApproval?.expiresAt
      ? new Date(user.pendingLoginApproval.expiresAt).getTime()
      : 0;

    if (
      !pendingApprovalId ||
      pendingApprovalId !== normalizedApprovalId ||
      Date.now() > expiresAt
    ) {
      return sendError(res, {
        status: 404,
        message: "This login request is no longer active.",
      });
    }

    if (decision === "deny") {
      user.pendingLoginApproval = { id: null, expiresAt: null, approved: false };
      await user.save();

      return sendSuccess(res, {
        message: "New login request denied.",
      });
    }

    if (decision === "allow") {
      user.pendingLoginApproval = {
        id: normalizedApprovalId,
        expiresAt: user.pendingLoginApproval.expiresAt,
        approved: true,
      };
      await user.save();
    }

    return sendSuccess(res, {
      message: "New login request approved.",
      data: {
        approvalId: normalizedApprovalId,
      },
    });
  } catch {
    return sendError(res, {
      status: 401,
      message: "Not authenticated",
    });
  }
});

router.get(
  "/google",
  (req, res, next) => {
    if (!isGoogleOauthConfigured) {
      return res.redirect(
        buildGoogleRedirect({ authError: "google_not_configured" }),
      );
    }

    const forceNewSession = req.query.forceNewSession === "true";
    const state = Buffer.from(
      JSON.stringify({ forceNewSession }),
      "utf8",
    ).toString("base64url");

    return passport.authenticate("google", {
      scope: ["profile", "email"],
      state,
      session: false,
    })(req, res, next);
  },
);

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!isGoogleOauthConfigured) {
      return res.redirect(
        buildGoogleRedirect({ authError: "google_not_configured" }),
      );
    }

    return passport.authenticate(
      "google",
      { session: false },
      async (error, user) => {
        try {
          if (error || !user) {
            return res.redirect(
              buildGoogleRedirect({ authError: "google_failed" }),
            );
          }

          const state = decodeGoogleState(req.query.state);
          const fullUser = await userWithSessionFields(User.findById(user._id));

          if (!fullUser) {
            return res.redirect(
              buildGoogleRedirect({ authError: "google_failed" }),
            );
          }

          if (fullUser.activeSessionId && !state.forceNewSession) {
            return res.redirect(
              buildGoogleRedirect({ authError: "google_session_conflict" }),
            );
          }

          const token = await startFreshSession(req, fullUser);
          await broadcastPublicStats(req.app.get("io"));

          return res.redirect(
            buildGoogleRedirect({
              authToken: token,
              authProvider: "google",
            }),
          );
        } catch (callbackError) {
          console.error("Google callback failed:", callbackError);
          return res.redirect(
            buildGoogleRedirect({ authError: "google_failed" }),
          );
        }
      },
    )(req, res, next);
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
    const user = await User.findById(decoded.id).select("+activeSessionId");

    if (!user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated",
      });
    }

    if (!decoded.sid || !user.activeSessionId || decoded.sid !== user.activeSessionId) {
      return sendError(res, {
        status: 401,
        message: "Session expired. Please log in again.",
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
router.get("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("+activeSessionId");

      if (user && decoded.sid && user.activeSessionId === decoded.sid) {
        user.activeSessionId = null;
        user.activeSessionUpdatedAt = new Date();
        user.pendingLoginApproval = { id: null, expiresAt: null, approved: false };
        await user.save();
      }
    }
  } catch {
    // Logout should always be a safe no-op on invalid/expired tokens.
  }

  return sendSuccess(res, {
    message: "Logged out",
    data: null,
  });
});

export default router;