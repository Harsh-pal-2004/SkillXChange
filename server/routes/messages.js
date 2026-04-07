import express from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const formatCallSummary = ({ startedAt, durationSeconds }) => {
  const startTime = startedAt
    ? new Date(startedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "unknown time";

  const totalSeconds = Math.max(0, Number(durationSeconds) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const durationLabel = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  return `Video call started at ${startTime} | Duration ${durationLabel}`;
};

const serializeConversation = (conversation, userId) => {
  const conversationObject = conversation.toObject();
  const unreadCount = conversation.unreadCounts?.get(String(userId)) ?? 0;

  return {
    ...conversationObject,
    unreadCount,
  };
};

const serializeMessage = (message) => ({
  _id: message._id,
  conversationId: message.conversation,
  sender: message.sender,
  text: message.text,
  type: message.type,
  metadata: message.metadata,
  createdAt: message.createdAt,
});

router.get("/conversations", requireAuth, async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "name email avatar headline")
    .populate("exchange")
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  res.json(
    conversations.map((conversation) =>
      serializeConversation(conversation, req.user._id),
    ),
  );
});

router.post("/conversations/direct", requireAuth, async (req, res) => {
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ message: "Target user is required" });
  }

  if (String(targetUserId) === String(req.user._id)) {
    return res
      .status(400)
      .json({ message: "You cannot start a chat with yourself" });
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, targetUserId], $size: 2 },
  })
    .populate("participants", "name email avatar headline")
    .populate("exchange");

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, targetUserId],
      exchange: null,
      lastMessage: "",
      lastMessageAt: null,
      unreadCounts: {
        [req.user._id]: 0,
        [targetUserId]: 0,
      },
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar headline")
      .populate("exchange");
  }

  return res.status(201).json(serializeConversation(conversation, req.user._id));
});

router.get(
  "/conversations/:conversationId/messages",
  requireAuth,
  async (req, res) => {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (
      !conversation ||
      !conversation.participants.some(
        (participantId) => String(participantId) === String(req.user._id),
      )
    ) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversation: conversation._id,
    })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  },
);

router.post(
  "/conversations/:conversationId/read",
  requireAuth,
  async (req, res) => {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (
      !conversation ||
      !conversation.participants.some(
        (participantId) => String(participantId) === String(req.user._id),
      )
    ) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    conversation.unreadCounts.set(String(req.user._id), 0);
    await conversation.save();

    res.json({ message: "Conversation marked as read" });
  },
);

router.post(
  "/conversations/:conversationId/messages",
  requireAuth,
  async (req, res) => {
    const { text, type = "text", metadata = {} } = req.body;
    const trimmedText = text?.trim();

    if (type === "text" && !trimmedText) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const conversation = await Conversation.findById(req.params.conversationId);

    if (
      !conversation ||
      !conversation.participants.some(
        (participantId) => String(participantId) === String(req.user._id),
      )
    ) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messageText = type === "call" ? formatCallSummary(metadata) : trimmedText;

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: messageText,
      type,
      metadata:
        type === "call"
          ? {
              startedAt: metadata.startedAt || null,
              endedAt: metadata.endedAt || null,
              durationSeconds: metadata.durationSeconds ?? null,
            }
          : undefined,
    });

    conversation.lastMessage = messageText;
    conversation.lastMessageAt = message.createdAt;
    conversation.participants.forEach((participantId) => {
      const participantKey = String(participantId);
      if (participantKey === String(req.user._id)) {
        conversation.unreadCounts.set(participantKey, 0);
        return;
      }

      const previousCount = conversation.unreadCounts.get(participantKey) ?? 0;
      conversation.unreadCounts.set(participantKey, previousCount + 1);
    });
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email avatar",
    );

    const messagePayload = {
      ...serializeMessage(populatedMessage),
      unreadCounts: Object.fromEntries(conversation.unreadCounts.entries()),
    };

    conversation.participants.forEach((participantId) => {
      req.app
        .get("io")
        .to(`user:${participantId}`)
        .emit("chat:message", messagePayload);
    });

    res.status(201).json(populatedMessage);
  },
);

export default router;
