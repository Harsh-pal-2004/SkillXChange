import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { Server } from "socket.io";
import passport from "./config/passport.js";
import { env, validateRequiredEnv } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import listingRoutes from "./routes/listings.js";
import exchangeRoutes from "./routes/exchanges.js";
import messageRoutes from "./routes/messages.js";
import dashboardRoutes from "./routes/dashboard.js";
import publicRoutes from "./routes/public.js";
import User from "./models/User.js";
import { getPublicStats } from "./utils/publicStats.js";
import session from "express-session";

validateRequiredEnv();

const app = express();
const server = http.createServer(app);
const normalizeOrigin = (origin = "") => origin.replace(/\/$/, "");

const isAllowedOrigin = (origin) => {
	if (!origin) return true;

	const normalizedOrigin = normalizeOrigin(origin);
	if (env.allowedClientOrigins.includes(normalizedOrigin)) return true;

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
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
	optionsSuccessStatus: 204,
};

const io = new Server(server, {
	cors: {
		origin: (origin, callback) => {
			if (isAllowedOrigin(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error("Not allowed by Socket.IO CORS"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	},
});
app.set("io", io);

// Middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(session({
	secret: env.sessionSecret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: env.isProduction,
		sameSite: env.isProduction ? "none" : "lax",
	},
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);

// MongoDB connection
mongoose.connect(env.mongoUri)
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
server.listen(env.port, () => console.log(`Server running on port ${env.port}`));
