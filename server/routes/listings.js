import express from "express";
import SkillListing from "../models/SkillListing.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
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

  res.json(listings);
});

router.post("/", requireAuth, async (req, res) => {
  const { teachSkill, learnSkill, category, level, bio } = req.body;

  const listing = await SkillListing.create({
    owner: req.user._id,
    teachSkill,
    learnSkill,
    category,
    level,
    bio,
  });

  const populatedListing = await SkillListing.findById(listing._id).populate(
    "owner",
    "name email avatar headline location teachSkills learnSkills",
  );

  res.status(201).json(populatedListing);
});

export default router;
