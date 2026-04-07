import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { Server } from "socket.io";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import listingRoutes from "./routes/listings.js";
import exchangeRoutes from "./routes/exchanges.js";
import messageRoutes from "./routes/messages.js";
import dashboardRoutes from "./routes/dashboard.js";
import publicRoutes from "./routes/public.js";
import User from "./models/User.js";
import { getPublicStats } from "./utils/publicStats.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const defaultOrigins = [
	"http://localhost:5173",
	"https://skill-x-change-mu.vercel.app",
];

const envOrigins = (process.env.CLIENT_URL || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const normalizeOrigin = (origin = "") => origin.replace(/\/$/, "");

const allowedOrigins = Array.from(
	new Set([...defaultOrigins, ...envOrigins].map(normalizeOrigin)),
);

const isAllowedOrigin = (origin) => {
	if (!origin) return true;

	const normalizedOrigin = normalizeOrigin(origin);
	if (allowedOrigins.includes(normalizedOrigin)) return true;

	// Allow Vercel preview deployments when credentials are required.
	return /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalizedOrigin);
};
const corsOptions = {
	origin: (origin, callback) => {
		if (isAllowedOrigin(origin)) {
			callback(null, true);
			return;
		}

		callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
};

const io = new Server(server, {
	cors: {
		origin: allowedOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	},
});
app.set("io", io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
	.then(async () => {
		await User.syncIndexes();
		console.log("MongoDB connected");
	})
	.catch((err) => console.log("MongoDB error:", err));

// Test route
app.get("/", (req, res) => {
	res.send("Server is running");
});

// Socket.io
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

	const relayCallEvent = (eventName) => {
		socket.on(eventName, (payload = {}) => {
			if (!payload.conversationId) return;

			socket.to(`conversation:${payload.conversationId}`).emit(eventName, {
				...payload,
				fromUserId: userId,
			});
		});
	};

	[
		"call:start",
		"call:offer",
		"call:answer",
		"call:ice-candidate",
		"call:end",
	].forEach(relayCallEvent);

	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
