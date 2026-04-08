import express from "express";
import SkillListing from "../models/SkillListing.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search = "", category = "All", excludeMine = "false" } = req.query;
    const query = { isActive: true };

    if (category !== "All") {
      query.category = category;
    }

    if (excludeMine === "true") {
      query.owner = { $ne: req.user._id };
    }

    if (search.trim()) {
      const pattern = new RegExp(search.trim(), "i");
      query.$or = [
        { teachSkill: pattern },
        { learnSkill: pattern },
        { bio: pattern },
      ];
    }

    const listings = await SkillListing.find(query)
      .populate("owner", "name email avatar headline location teachSkills learnSkills")
      .sort({ createdAt: -1 });

    return res.json(listings);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch listings" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { teachSkill, learnSkill, category, level, bio } = req.body;
    const normalizedTeachSkill = String(teachSkill || "").trim();
    const normalizedLearnSkill = String(learnSkill || "").trim();
    const normalizedCategory = String(category || "").trim();
    const normalizedLevel = String(level || "").trim();
    const normalizedBio = String(bio || "").trim();

    if (!normalizedTeachSkill || !normalizedLearnSkill || !normalizedCategory) {
      return res.status(400).json({ message: "Teach skill, learn skill, and category are required" });
    }

    if (normalizedTeachSkill.length > 80 || normalizedLearnSkill.length > 80) {
      return res.status(400).json({ message: "Skills must be 80 characters or less" });
    }

    if (normalizedBio.length > 1000) {
      return res.status(400).json({ message: "Bio must be 1000 characters or less" });
    }

    const listing = await SkillListing.create({
      owner: req.user._id,
      teachSkill: normalizedTeachSkill,
      learnSkill: normalizedLearnSkill,
      category: normalizedCategory,
      level: normalizedLevel,
      bio: normalizedBio,
    });

    const populatedListing = await SkillListing.findById(listing._id).populate(
      "owner",
      "name email avatar headline location teachSkills learnSkills",
    );

    return res.status(201).json(populatedListing);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create listing" });
  }
});

export default router;
