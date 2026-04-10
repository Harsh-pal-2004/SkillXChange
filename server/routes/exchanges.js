import express from "express";
import mongoose from "mongoose";
import Exchange from "../models/Exchange.js";
import SkillListing from "../models/SkillListing.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { broadcastPublicStats } from "../utils/publicStats.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const exchanges = await Exchange.find({
    $or: [{ requester: req.user._id }, { recipient: req.user._id }],
  })
    .populate("requester", "name email avatar")
    .populate("recipient", "name email avatar")
    .populate("ratings.rater", "name avatar")
    .populate("ratings.ratedUser", "name avatar")
    .populate({
      path: "listing",
      populate: { path: "owner", select: "name avatar" },
    })
    .sort({ updatedAt: -1 });

  res.json(exchanges);
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { listingId, message = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: "Invalid listing id" });
    }

    const normalizedMessage = String(message || "").trim();
    if (normalizedMessage.length > 1000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const listing = await SkillListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (String(listing.owner) === String(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You cannot request your own listing" });
    }

    const existingExchange = await Exchange.findOne({
      listing: listing._id,
      requester: req.user._id,
      recipient: listing.owner,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingExchange) {
      return res.status(400).json({ message: "Exchange already requested" });
    }

    const exchange = await Exchange.create({
      listing: listing._id,
      requester: req.user._id,
      recipient: listing.owner,
      teachSkill: listing.learnSkill,
      learnSkill: listing.teachSkill,
      message: normalizedMessage,
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, listing.owner], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, listing.owner],
        exchange: exchange._id,
        lastMessage: "",
        lastMessageAt: null,
        unreadCounts: {
          [String(req.user._id)]: 0,
          [String(listing.owner)]: 0,
        },
      });
    } else {
      conversation.exchange = exchange._id;
      if (!conversation.unreadCounts.has(String(req.user._id))) {
        conversation.unreadCounts.set(String(req.user._id), 0);
      }
      if (!conversation.unreadCounts.has(String(listing.owner))) {
        conversation.unreadCounts.set(String(listing.owner), 0);
      }
      await conversation.save();
    }

    const populatedExchange = await Exchange.findById(exchange._id)
      .populate("requester", "name email avatar")
      .populate("recipient", "name email avatar")
      .populate({
        path: "listing",
        populate: { path: "owner", select: "name avatar" },
      });

    await broadcastPublicStats(req.app.get("io"));
    return res.status(201).json(populatedExchange);
  } catch (error) {
    return res.status(500).json({ message: "Failed to request exchange" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["accepted", "rejected", "completed"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const exchange = await Exchange.findById(req.params.id);
  if (!exchange) {
    return res.status(404).json({ message: "Exchange not found" });
  }

  if (String(exchange.recipient) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  exchange.status = status;
  await exchange.save();

  const populatedExchange = await Exchange.findById(exchange._id)
    .populate("requester", "name email avatar")
    .populate("recipient", "name email avatar")
    .populate("ratings.rater", "name avatar")
    .populate("ratings.ratedUser", "name avatar")
    .populate({
      path: "listing",
      populate: { path: "owner", select: "name avatar" },
    });

  res.json(populatedExchange);
});

router.post("/:id/rating", requireAuth, async (req, res) => {
  try {
    const { score, comment = "" } = req.body;
    const normalizedScore = Number(score);
    const normalizedComment = String(comment || "").trim();

    if (!Number.isInteger(normalizedScore) || normalizedScore < 1 || normalizedScore > 5) {
      return res.status(400).json({ message: "Score must be an integer between 1 and 5" });
    }

    if (normalizedComment.length > 500) {
      return res.status(400).json({ message: "Comment is too long" });
    }

    const exchange = await Exchange.findById(req.params.id);
    if (!exchange) {
      return res.status(404).json({ message: "Exchange not found" });
    }

    const isParticipant =
      String(exchange.requester) === String(req.user._id) ||
      String(exchange.recipient) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (exchange.status !== "completed") {
      return res.status(400).json({ message: "You can only rate completed exchanges" });
    }

    const existingRatings = Array.isArray(exchange.ratings) ? exchange.ratings : [];

    const alreadyRated = existingRatings.some(
      (rating) => String(rating.rater) === String(req.user._id),
    );

    if (alreadyRated) {
      return res.status(409).json({ message: "You have already rated this exchange" });
    }

    const ratedUserId =
      String(exchange.requester) === String(req.user._id)
        ? exchange.recipient
        : exchange.requester;

    const ratedUser = await User.findById(ratedUserId);
    if (!ratedUser) {
      return res.status(404).json({ message: "Rated user not found" });
    }

    exchange.ratings.push({
      rater: req.user._id,
      ratedUser: ratedUser._id,
      score: normalizedScore,
      comment: normalizedComment,
    });

    await exchange.save();

    const nextCount = (ratedUser.ratingCount || 0) + 1;
    const weightedTotal = (ratedUser.ratingAverage || 0) * (ratedUser.ratingCount || 0);
    ratedUser.ratingCount = nextCount;
    ratedUser.ratingAverage = Number(((weightedTotal + normalizedScore) / nextCount).toFixed(2));
    await ratedUser.save();

    const populatedExchange = await Exchange.findById(exchange._id)
      .populate("requester", "name email avatar")
      .populate("recipient", "name email avatar")
      .populate("ratings.rater", "name avatar")
      .populate("ratings.ratedUser", "name avatar")
      .populate({
        path: "listing",
        populate: { path: "owner", select: "name avatar" },
      });

    await broadcastPublicStats(req.app.get("io"));
    return res.json(populatedExchange);
  } catch {
    return res.status(500).json({ message: "Failed to submit rating" });
  }
});

export default router;
