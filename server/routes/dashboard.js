import express from "express";
import SkillListing from "../models/SkillListing.js";
import Exchange from "../models/Exchange.js";
import Conversation from "../models/Conversation.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const [listingsCount, exchanges, conversationsCount, suggestedListings] =
    await Promise.all([
      SkillListing.countDocuments({ owner: req.user._id, isActive: true }),
      Exchange.find({
        $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      }),
      Conversation.countDocuments({ participants: req.user._id }),
      SkillListing.find({
        owner: { $ne: req.user._id },
        isActive: true,
      })
        .populate("owner", "name avatar")
        .sort({ createdAt: -1 })
        .limit(3),
    ]);

  const completedCount = exchanges.filter(
    (exchange) => exchange.status === "completed",
  ).length;

  res.json({
    stats: {
      connections: conversationsCount,
      skillsListed: listingsCount,
      exchanges: exchanges.length,
      completedExchanges: completedCount,
    },
    pendingIncoming: exchanges.filter(
      (exchange) =>
        String(exchange.recipient) === String(req.user._id) &&
        exchange.status === "pending",
    ).length,
    suggestedListings,
    recentExchanges: exchanges
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 4),
  });
});

export default router;
