import express from "express";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const buildFeedbackSummary = async (recipientId) => {
  const [summary] = await Feedback.aggregate([
    { $match: { recipient: new mongoose.Types.ObjectId(recipientId) } },
    {
      $group: {
        _id: "$recipient",
        totalFeedback: { $sum: 1 },
        averageScore: { $avg: "$score" },
      },
    },
  ]);

  return {
    totalFeedback: summary?.totalFeedback || 0,
    averageScore: summary?.averageScore ? Number(summary.averageScore.toFixed(2)) : 0,
  };
};

const syncUserFeedbackStats = async (recipientId) => {
  const summary = await buildFeedbackSummary(recipientId);

  await User.findByIdAndUpdate(recipientId, {
    feedbackCount: summary.totalFeedback,
    feedbackAverage: summary.averageScore,
  });

  return summary;
};

router.get("/users/:userId", requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const targetUser = await User.findById(req.params.userId).select(
      "_id name avatar headline feedbackAverage feedbackCount",
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [feedback, summary] = await Promise.all([
      Feedback.find({ recipient: req.params.userId })
        .populate("sender", "name avatar headline")
        .sort({ createdAt: -1 }),
      buildFeedbackSummary(req.params.userId),
    ]);

    return res.json({ feedback, summary, user: targetUser });
  } catch {
    return res.status(500).json({ message: "Failed to load feedback" });
  }
});

router.post("/users/:userId", requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(req.params.userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot leave feedback for yourself" });
    }

    const recipient = await User.findById(req.params.userId);
    if (!recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    const score = Number(req.body?.score);
    const comment = String(req.body?.comment || "").trim();

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: "Score must be an integer between 1 and 5" });
    }

    if (comment.length > 500) {
      return res.status(400).json({ message: "Comment is too long" });
    }

    await Feedback.create({
      sender: req.user._id,
      recipient: recipient._id,
      score,
      comment,
    });

    const summary = await syncUserFeedbackStats(recipient._id);
    const feedback = await Feedback.find({ recipient: recipient._id })
      .populate("sender", "name avatar headline")
      .sort({ createdAt: -1 });

    return res.status(201).json({ feedback, summary });
  } catch {
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
});

export default router;
