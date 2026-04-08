import express from "express";
import mongoose from "mongoose";
import Exchange from "../models/Exchange.js";
import SkillListing from "../models/SkillListing.js";
import Conversation from "../models/Conversation.js";
import { requireAuth } from "../middleware/auth.js";
import { broadcastPublicStats } from "../utils/publicStats.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const exchanges = await Exchange.find({
    $or: [{ requester: req.user._id }, { recipient: req.user._id }],
  })
    .populate("requester", "name email avatar")
    .populate("recipient", "name email avatar")
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
    .populate({
      path: "listing",
      populate: { path: "owner", select: "name avatar" },
    });

  res.json(populatedExchange);
});

export default router;
