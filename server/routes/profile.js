import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { createAvatarUrl } from "../utils/avatar.js";

const router = express.Router();

router.get("/discover", requireAuth, async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = {
      _id: { $ne: req.user._id },
    };

    if (search.trim()) {
      const pattern = new RegExp(search.trim(), "i");
      query.$or = [
        { name: pattern },
        { username: pattern },
        { headline: pattern },
        { bio: pattern },
        { location: pattern },
        { teachSkills: pattern },
        { learnSkills: pattern },
      ];
    }

    const users = await User.find(query)
      .select(
        "name username email avatar headline bio location teachSkills learnSkills ratingAverage ratingCount feedbackAverage feedbackCount createdAt",
      )
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to discover users" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const {
      name,
      avatar,
      headline,
      bio,
      location,
      teachSkills = [],
      learnSkills = [],
    } = req.body;

    if (!Array.isArray(teachSkills) || !Array.isArray(learnSkills)) {
      return res.status(400).json({ message: "Skills must be arrays" });
    }

    if (teachSkills.length > 20 || learnSkills.length > 20) {
      return res.status(400).json({ message: "Maximum 20 skills per list" });
    }

    const normalizeSkill = (skill) => String(skill || "").trim();
    const cleanedTeachSkills = teachSkills
      .map(normalizeSkill)
      .filter((skill) => skill.length > 0 && skill.length <= 50);
    const cleanedLearnSkills = learnSkills
      .map(normalizeSkill)
      .filter((skill) => skill.length > 0 && skill.length <= 50);

    req.user.name = name?.trim() || req.user.name;
    if (typeof avatar === "string") {
      req.user.avatar = avatar.trim() || createAvatarUrl(req.user.name);
    }
    req.user.headline = headline?.trim() || "";
    req.user.bio = bio?.trim() || "";
    req.user.location = location?.trim() || "";
    req.user.teachSkills = cleanedTeachSkills;
    req.user.learnSkills = cleanedLearnSkills;

    await req.user.save();
    return res.json(req.user);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(req.params.id).select(
      "name username email avatar headline bio location teachSkills learnSkills ratingAverage ratingCount feedbackAverage feedbackCount createdAt",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch {
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

export default router;
