import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import listingRoutes from "./routes/listings.js";
import exchangeRoutes from "./routes/exchanges.js";
import messageRoutes from "./routes/messages.js";
import feedbackRoutes from "./routes/feedback.js";
import dashboardRoutes from "./routes/dashboard.js";
import publicRoutes from "./routes/public.js";
import Conversation from "./models/Conversation.js";
import Feedback from "./models/Feedback.js";
import Session from "./models/Session.js";
import User from "./models/User.js";
import { getPublicStats } from "./utils/publicStats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

// ---- App bootstrap ----
const app = express();
const server = http.createServer(app);

// ---- Realtime server ----
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
app.set("io", io);

// ---- Middleware ----
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(passport.initialize());

// ---- Routes ----
app.use("/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);

// ---- Database ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const existingCollections = await mongoose.connection.db
      .listCollections({ name: "feedback" })
      .toArray();

    if (existingCollections.length === 0) {
      await mongoose.connection.db.createCollection("feedback");
    }

    const existingSessionCollections = await mongoose.connection.db
      .listCollections({ name: "session" })
      .toArray();

    if (existingSessionCollections.length === 0) {
      await mongoose.connection.db.createCollection("session");
    }

    await Feedback.syncIndexes();
    await Session.syncIndexes();
    await User.syncIndexes();
    console.log("MongoDB connected");
  })
  .catch((err) => console.log("MongoDB error:", err));

// ---- Health route ----
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ---- Socket events ----
io.on("connection", (socket) => {
  const { userId } = socket.handshake.auth || {};
  console.log("User connected:", socket.id, userId || "anonymous");

  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on("conversation:join", (conversationId) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("conversation:leave", (conversationId) => {
    if (!conversationId) return;
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("public:stats:subscribe", async () => {
    socket.join("public:stats");
    socket.emit("public:stats", await getPublicStats());
  });

  socket.on("public:stats:unsubscribe", () => {
    socket.leave("public:stats");
  });

  const getConversationParticipants = async (conversationId) => {
    const conversation = await Conversation.findById(conversationId).select(
      "participants",
    );

    return conversation?.participants || [];
  };

  const findOpenSession = async (conversationId) =>
    Session.findOne({
      conversation: conversationId,
      endedAt: null,
    }).sort({ createdAt: -1 });

  const upsertCallSession = async (payload = {}, lifecycleEvent) => {
    if (!payload.conversationId) {
      return null;
    }

    const participants = await getConversationParticipants(payload.conversationId);
    if (!participants.length) {
      return null;
    }

    const now = new Date();

    if (lifecycleEvent === "call:start") {
      const startedAt = payload.startedAt ? new Date(payload.startedAt) : now;
      return Session.create({
        conversation: payload.conversationId,
        participants,
        initiatedBy: userId || null,
        status: "ringing",
        startedAt,
      });
    }

    const session =
      (await findOpenSession(payload.conversationId)) ||
      (await Session.create({
        conversation: payload.conversationId,
        participants,
        initiatedBy: userId || null,
        status: "ringing",
        startedAt: payload.connectedAt ? new Date(payload.connectedAt) : now,
      }));

    if (lifecycleEvent === "call:answer") {
      const connectedAt = payload.connectedAt ? new Date(payload.connectedAt) : now;
      session.answeredBy = userId || null;
      session.connectedAt = connectedAt;
      session.startedAt = session.startedAt || connectedAt;
      session.status = "active";
      await session.save();
      return session;
    }

    if (lifecycleEvent === "call:end") {
      const endedAt = payload.endedAt ? new Date(payload.endedAt) : now;
      const referenceStart = session.connectedAt || session.startedAt || endedAt;
      const durationSeconds = Math.max(
        0,
        Math.round((endedAt - referenceStart) / 1000),
      );

      session.endedAt = endedAt;
      session.durationSeconds = durationSeconds;
      session.status = session.connectedAt ? "ended" : "missed";
      await session.save();
      return session;
    }

    return session;
  };

  const relayCallEvent = (eventName) => {
    socket.on(eventName, (payload = {}) => {
      if (!payload.conversationId) return;

      socket.to(`conversation:${payload.conversationId}`).emit(eventName, {
        ...payload,
        fromUserId: userId,
      });
    });
  };

  socket.on("call:start", async (payload = {}) => {
    if (!payload.conversationId) return;

    const session = await upsertCallSession(payload, "call:start");

    socket.to(`conversation:${payload.conversationId}`).emit("call:start", {
      ...payload,
      sessionId: session?._id?.toString() || null,
      startedAt: session?.startedAt?.toISOString?.() || payload.startedAt || null,
      fromUserId: userId,
    });
  });

  socket.on("call:answer", async (payload = {}) => {
    if (!payload.conversationId) return;

    const session = await upsertCallSession(payload, "call:answer");

    socket.to(`conversation:${payload.conversationId}`).emit("call:answer", {
      ...payload,
      sessionId: session?._id?.toString() || null,
      fromUserId: userId,
    });
  });

  socket.on("call:end", async (payload = {}) => {
    if (!payload.conversationId) return;

    const session = await upsertCallSession(payload, "call:end");

    socket.to(`conversation:${payload.conversationId}`).emit("call:end", {
      ...payload,
      sessionId: session?._id?.toString() || null,
      endedAt: session?.endedAt?.toISOString?.() || payload.endedAt || null,
      durationSeconds: session?.durationSeconds ?? payload.durationSeconds ?? null,
      fromUserId: userId,
    });
  });

  ["call:offer", "call:ice-candidate"].forEach(relayCallEvent);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
